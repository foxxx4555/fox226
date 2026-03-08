-- Function to completely delete all loads and their related financial/tracking records for a specific shipper
-- SECURITY DEFINER bypasses RLS, so it can delete invoices and finances that the shipper normally can't delete directly.
CREATE OR REPLACE FUNCTION delete_all_shipper_loads(p_shipper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_load_id UUID;
BEGIN
    -- Loop through all    -- المرور على كل شحنات هذا الشاحن
    FOR v_load_id IN SELECT id FROM loads WHERE owner_id = p_shipper_id
    LOOP
        -- حذف السجلات المرتبطة فقط إذا كانت الجداول موجودة لتجنب الأخطاء
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'load_bids') THEN
            DELETE FROM load_bids WHERE load_id = v_load_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'shipment_tracking') THEN
            DELETE FROM shipment_tracking WHERE shipment_id = v_load_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invoices') THEN
            DELETE FROM invoices WHERE shipment_id = v_load_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'shipment_finances') THEN
            DELETE FROM shipment_finances WHERE shipment_id = v_load_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'financial_transactions') THEN
            DELETE FROM financial_transactions WHERE shipment_id = v_load_id;
        END IF;
        
        -- حذف الشحنة نفسها (هذا الجدول مؤكد وجوده)
        DELETE FROM loads WHERE id = v_load_id;
    END LOOP;

    -- تصفير رصيد المحفظة
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'wallets') THEN
        UPDATE wallets SET balance = 0.00 WHERE user_id = p_shipper_id;
    END IF;
END;
$$;
