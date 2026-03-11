-- 20260312_carrier_earnings_ledger_view.sql
-- Unified view for tracking carrier (driver) earnings, commissions, and settlement status
-- Includes "Safety Filter" context from shipper payments

CREATE OR REPLACE VIEW public.carrier_earnings_ledger AS
SELECT 
    l.id AS shipment_id,
    p.full_name AS carrier_name,
    l.price AS total_amount,
    sf.platform_commission AS commission_amount,
    sf.carrier_amount AS net_amount,
    sf.settlement_status,
    l.status AS shipment_status,
    l.created_at AS recorded_at,
    CASE 
        WHEN sf.settlement_status = 'settled' THEN 'paid'
        WHEN EXISTS (SELECT 1 FROM public.withdrawal_requests wr WHERE wr.user_id = l.driver_id AND wr.status = 'pending') THEN 'withdrawal_pending'
        WHEN sf.settlement_status = 'held' THEN 'pending_approval'
        ELSE 'available'
    END AS display_status,
    l.driver_id AS carrier_id,
    fl.financial_status AS shipper_payment_status,
    fl.paid_amount AS shipper_paid_amount,
    fl.remaining_amount AS shipper_remaining_amount
FROM 
    public.loads l
JOIN 
    public.profiles p ON l.driver_id = p.id
JOIN 
    public.shipment_finances sf ON l.id = sf.shipment_id
LEFT JOIN
    public.financial_ledger fl ON l.id = fl.shipment_id
WHERE 
    l.status IN ('completed', 'in_progress')
    AND l.driver_id IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.carrier_earnings_ledger TO authenticated;
GRANT SELECT ON public.carrier_earnings_ledger TO service_role;
