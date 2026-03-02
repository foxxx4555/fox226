-- Final Financial System Migration (aligned with architecture doc)
-- Created at: 2026-03-02 21:20:00

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE user_type_enum AS ENUM ('shipper', 'carrier', 'platform');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid_to_escrow', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE settlement_status_enum AS ENUM ('pending', 'held', 'settled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    wallet_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
    user_type user_type_enum NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    currency VARCHAR(10) DEFAULT 'SAR',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Shipments (Extending or linking to existing logic)
-- We will link to the existing 'public.loads' table
CREATE TABLE IF NOT EXISTS shipment_finances (
    shipment_id UUID REFERENCES public.loads(id) PRIMARY KEY,
    shipper_id UUID REFERENCES public.profiles(id) NOT NULL,
    carrier_id UUID REFERENCES public.profiles(id),
    shipment_price DECIMAL(15, 2) NOT NULL,
    carrier_amount DECIMAL(15, 2) NOT NULL,
    platform_commission DECIMAL(15, 2) NOT NULL,
    payment_status payment_status_enum DEFAULT 'pending',
    settlement_status settlement_status_enum DEFAULT 'pending'
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS financial_transactions (
    transaction_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(wallet_id) NOT NULL,
    shipment_id UUID REFERENCES public.loads(id),
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('credit', 'debit')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shipment_id UUID REFERENCES public.loads(id) NOT NULL,
    shipper_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    vat DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Settlement Function
CREATE OR REPLACE FUNCTION process_shipment_settlement(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_shipper_wallet_id UUID;
    v_carrier_wallet_id UUID;
    v_platform_wallet_id UUID;
    v_shipment RECORD;
BEGIN
    -- Get shipment details
    SELECT * INTO v_shipment FROM shipment_finances WHERE shipment_id = p_shipment_id FOR UPDATE;

    IF v_shipment.settlement_status = 'settled' THEN
        RAISE EXCEPTION 'This shipment has already been settled';
    END IF;

    -- Get wallet IDs
    SELECT wallet_id INTO v_shipper_wallet_id FROM wallets WHERE user_id = v_shipment.shipper_id AND user_type = 'shipper';
    SELECT wallet_id INTO v_carrier_wallet_id FROM wallets WHERE user_id = v_shipment.carrier_id AND user_type = 'carrier';
    SELECT wallet_id INTO v_platform_wallet_id FROM wallets WHERE user_type = 'platform' LIMIT 1;

    -- 1. Debit Shipper Wallet
    UPDATE wallets SET balance = balance - v_shipment.shipment_price WHERE wallet_id = v_shipper_wallet_id;
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, description)
    VALUES (v_shipper_wallet_id, p_shipment_id, v_shipment.shipment_price, 'debit', 'Payment for shipment ' || p_shipment_id);

    -- 2. Credit Carrier Wallet
    UPDATE wallets SET balance = balance + v_shipment.carrier_amount WHERE wallet_id = v_carrier_wallet_id;
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, description)
    VALUES (v_carrier_wallet_id, p_shipment_id, v_shipment.carrier_amount, 'credit', 'Earnings from shipment ' || p_shipment_id);

    -- 3. Credit Platform Wallet
    UPDATE wallets SET balance = balance + v_shipment.platform_commission WHERE wallet_id = v_platform_wallet_id;
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, description)
    VALUES (v_platform_wallet_id, p_shipment_id, v_shipment.platform_commission, 'credit', 'Commission from shipment ' || p_shipment_id);

    -- Update status
    UPDATE shipment_finances SET settlement_status = 'settled' WHERE shipment_id = p_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger for Invoices
CREATE OR REPLACE FUNCTION generate_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'paid_to_escrow' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid_to_escrow') THEN
        INSERT INTO invoices (shipment_id, shipper_id, amount, vat, total_amount, payment_status)
        VALUES (
            NEW.shipment_id, 
            NEW.shipper_id, 
            NEW.shipment_price / 1.15, 
            NEW.shipment_price - (NEW.shipment_price / 1.15), 
            NEW.shipment_price, 
            'paid'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_shipment_payment_trigger
AFTER UPDATE ON shipment_finances
FOR EACH ROW
EXECUTE FUNCTION generate_invoice_on_payment();

-- Default Platform Wallet
INSERT INTO wallets (user_type, balance, currency) 
SELECT 'platform', 0.00, 'SAR'
WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_type = 'platform');
