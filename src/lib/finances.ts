import { supabase } from '@/integrations/supabase/client';

export const financeApi = {
    /**
     * Get wallet balance and details for a user
     */
    async getWallet(userId: string, type: 'shipper' | 'carrier') {
        const { data, error } = await (supabase as any)
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .eq('user_type', type)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    /**
     * Create financial record for a shipment
     */
    async createShipmentFinance(data: {
        shipment_id: string;
        shipper_id: string;
        carrier_id?: string;
        shipment_price: number;
        commission_rate: number;
    }) {
        const platform_commission = data.shipment_price * (data.commission_rate / 100);
        const carrier_amount = data.shipment_price - platform_commission;

        const { data: result, error } = await (supabase as any)
            .from('shipment_finances')
            .insert([{
                shipment_id: data.shipment_id,
                shipper_id: data.shipper_id,
                carrier_id: data.carrier_id,
                shipment_price: data.shipment_price,
                carrier_amount,
                platform_commission,
                payment_status: 'pending',
                settlement_status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return result;
    },

    /**
     * Mark shipment as paid (moves to escrow)
     */
    async payForShipment(shipmentId: string) {
        const { error } = await (supabase as any)
            .from('shipment_finances')
            .update({ payment_status: 'paid_to_escrow' })
            .eq('shipment_id', shipmentId);

        if (error) throw error;
        return true;
    },

    /**
     * Settle shipment (transfer funds from escrow to carrier and platform)
     * This calls the PostgREST RPC for the process_shipment_settlement function
     */
    async settleShipment(shipmentId: string) {
        const { error } = await (supabase as any).rpc('process_shipment_settlement', {
            p_shipment_id: shipmentId
        });

        if (error) throw error;
        return true;
    },

    /**
     * Get transaction history for a wallet
     */
    async getTransactions(walletIdOrUserId: string, type?: 'shipper' | 'carrier') {
        let finalWalletId = walletIdOrUserId;

        if (type) {
            const { data: wallet } = await (supabase as any)
                .from('wallets')
                .select('wallet_id')
                .eq('user_id', walletIdOrUserId)
                .eq('user_type', type)
                .maybeSingle();

            if (wallet) {
                finalWalletId = wallet.wallet_id;
            } else {
                return [];
            }
        }

        const { data, error } = await (supabase as any)
            .from('financial_transactions')
            .select('*')
            .eq('wallet_id', finalWalletId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get invoice for a shipment
     */
    async getInvoice(shipmentId: string) {
        const { data, error } = await (supabase as any)
            .from('invoices')
            .select('*')
            .eq('shipment_id', shipmentId)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    /**
     * Create a withdrawal request
     */
    async requestWithdrawal(userId: string, amount: number, details: any) {
        const wallet = await this.getWallet(userId, 'carrier');
        if (!wallet || wallet.balance < amount) {
            throw new Error("رصيد غير كافٍ للسحب");
        }

        const { data, error } = await (supabase as any)
            .from('withdrawal_requests')
            .insert([{
                user_id: userId,
                wallet_id: wallet.wallet_id,
                amount: amount,
                bank_details: details,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a stripe checkout session for wallet top-up
     */
    async createTopUpSession(userId: string, amount: number) {
        const { data: wallet } = await (supabase as any)
            .from('wallets')
            .select('wallet_id')
            .eq('user_id', userId)
            .maybeSingle();

        // This would typically call an Edge Function or Backend
        const response = await fetch('/api/pay/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet_id: wallet?.wallet_id,
                amount: amount,
                user_id: userId
            })
        });

        const session = await response.json();
        return session;
    }
};
