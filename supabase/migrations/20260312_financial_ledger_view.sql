-- 20260312_financial_ledger_view.sql
-- Unified view for tracking shipment payments and statuses

CREATE OR REPLACE VIEW public.financial_ledger AS
SELECT 
    l.id AS shipment_id,
    p.full_name AS shipper_name,
    l.origin,
    l.destination,
    l.price AS total_amount,
    COALESCE(SUM(CASE WHEN sp.status = 'approved' THEN sp.amount ELSE 0 END), 0) AS paid_amount,
    l.price - COALESCE(SUM(CASE WHEN sp.status = 'approved' THEN sp.amount ELSE 0 END), 0) AS remaining_amount,
    CASE 
        WHEN l.price - COALESCE(SUM(CASE WHEN sp.status = 'approved' THEN sp.amount ELSE 0 END), 0) <= 0 THEN 'paid'
        WHEN COALESCE(SUM(CASE WHEN sp.status = 'approved' THEN sp.amount ELSE 0 END), 0) > 0 THEN 'partial'
        WHEN EXISTS (SELECT 1 FROM public.shipper_payments WHERE shipment_id = l.id AND status = 'pending') THEN 'pending_approval'
        ELSE 'unpaid'
    END AS financial_status,
    (SELECT MAX(created_at) FROM public.shipper_payments WHERE shipment_id = l.id) AS last_payment_date
FROM 
    public.loads l
JOIN 
    public.profiles p ON l.owner_id = p.id
LEFT JOIN 
    public.shipper_payments sp ON l.id = sp.shipment_id
WHERE 
    l.status IN ('in_progress', 'completed')
GROUP BY 
    l.id, p.full_name, l.origin, l.destination, l.price;

-- Grant access to the view
GRANT SELECT ON public.financial_ledger TO authenticated;
GRANT SELECT ON public.financial_ledger TO service_role;
