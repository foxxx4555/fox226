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
     * Get all invoices for a shipper or admin
     */
    async getInvoices(shipperId?: string) {
        let query = (supabase as any).from('invoices').select(`
            *,
            shipper:profiles!invoices_shipper_id_fkey(full_name, phone),
            shipment:loads(id, origin, destination, package_type)
        `);

        if (shipperId) {
            query = query.eq('shipper_id', shipperId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    /**
     * Create a manual invoice (or batch)
     */
    async createInvoice(data: {
        shipment_id: string;
        shipper_id: string;
        amount: number;
        vat: number;
        total_amount: number;
    }) {
        const { data: result, error } = await (supabase as any)
            .from('invoices')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return result;
    },

    /**
     * Get system financial settings
     */
    async getSettings() {
        const { data, error } = await (supabase as any)
            .from('financial_settings')
            .select('*');

        if (error) throw error;
        return data;
    },

    /**
     * Update system financial setting
     */
    async updateSetting(key: string, value: number) {
        const { error } = await (supabase as any)
            .from('financial_settings')
            .update({ setting_value: value, updated_at: new Date().toISOString() })
            .eq('setting_key', key);

        if (error) throw error;
        return true;
    },

    /**
     * Create an audit log entry
     */
    async createAuditLog(data: {
        action: string;
        entity_id?: string;
        old_values?: any;
        new_values?: any;
        user_id?: string;
    }) {
        const { error } = await (supabase as any)
            .from('audit_logs')
            .insert([{
                ...data,
                user_id: data.user_id || (await supabase.auth.getUser()).data.user?.id
            }]);

        if (error) {
            console.error('Failed to create audit log:', error);
        }
    },

    /**
     * Get audit logs (Admin only)
     */
    async getAuditLogs(limit = 100) {
        const { data, error } = await (supabase as any)
            .from('audit_logs')
            .select(`
                *,
                user:profiles(full_name)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    /**
     * Create a payout receipt
     */
    async createPayoutReceipt(data: {
        user_id: string;
        amount: number;
        transaction_id: string;
        payment_method: string;
        reference_number?: string;
    }) {
        const { data: result, error } = await (supabase as any)
            .from('payout_receipts')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return result;
    },

    /**
     * Get payout receipts for a carrier or all for admin
     */
    async getPayoutReceipts(userId?: string) {
        let query = (supabase as any).from('payout_receipts').select(`
            *,
            user:profiles(full_name, phone)
        `);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    /**
     * Get pending (frozen) earnings for a carrier
     */
    async getPendingEarnings(carrierId: string) {
        const { data, error } = await (supabase as any)
            .from('shipment_finances')
            .select(`
                *,
                shipment:loads(id, origin, destination, package_type, price)
            `)
            .eq('carrier_id', carrierId)
            .eq('settlement_status', 'held')
            .order('shipment_id', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * MASTER RESET: Nuclear option to clear all shipments and finance data
     */
    async masterReset() {
        const { error } = await (supabase as any).rpc('master_reset_financial_data');
        if (error) throw error;
        return true;
    }
};
