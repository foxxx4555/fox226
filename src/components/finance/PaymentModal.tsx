import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { financeApi } from '@/lib/finances';
import { toast } from 'sonner';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipment: {
        id: string;
        price: number;
        origin: string;
        destination: string;
    };
    walletBalance: number;
    onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    shipment,
    walletBalance,
    onSuccess
}) => {
    const [loading, setLoading] = React.useState(false);

    const hasEnoughFunds = walletBalance >= shipment.price;

    const handlePayment = async () => {
        if (!hasEnoughFunds) {
            toast.error('رصيد المحفظة غير كافٍ. يرجى شحن الرصيد أولاً.');
            return;
        }

        setLoading(true);
        try {
            await financeApi.payForShipment(shipment.id);
            toast.success('تمت عملية الدفع بنجاح! المبلغ الآن في نظام الضمان.');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Payment error:', error);
            toast.error('فشلت عملية الدفع: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[420px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <DialogHeader className="relative z-10">
                        <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Wallet size={24} />
                            </div>
                            تأكيد الدفع
                        </DialogTitle>
                        <DialogDescription className="text-blue-100 font-medium">
                            سيتم خصم المبلغ من محفظتك وحجزه في نظام الضمان (Escrow) لحين إتمام التوصيل.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                            <span className="text-slate-500 font-bold">تفاصيل الشحنة</span>
                            <Badge variant="outline" className="text-blue-600 border-blue-100 bg-blue-50 font-black">
                                #{shipment.id.substring(0, 8)}
                            </Badge>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400 font-bold">من:</span>
                                <span className="text-slate-700 font-black">{shipment.origin}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400 font-bold">إلى:</span>
                                <span className="text-slate-700 font-black">{shipment.destination}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <span className="text-lg font-black text-slate-800">إجمالي المبلغ:</span>
                            <span className="text-2xl font-black text-blue-600 tracking-tight" dir="ltr">
                                {shipment.price.toLocaleString()} <span className="text-sm font-bold opacity-70">ر.س</span>
                            </span>
                        </div>
                    </div>

                    <div className={`p-4 rounded-2xl flex items-start gap-3 ${hasEnoughFunds ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                        {hasEnoughFunds ? <ShieldCheck size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
                        <div>
                            <p className="font-black text-sm">{hasEnoughFunds ? 'رصيدك الحالي كافٍ' : 'رصيدك الحالي غير كافٍ'}</p>
                            <p className="text-xs font-bold opacity-80 mt-1">الرصيد المتاح: {walletBalance.toLocaleString()} ر.س</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-0 flex flex-col gap-3">
                    <Button
                        disabled={!hasEnoughFunds || loading}
                        onClick={handlePayment}
                        className="w-full h-14 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                    >
                        {loading ? <Loader2 className="animate-spin me-2" /> : <ShieldCheck size={20} className="me-2" />}
                        تأكيد الدفع والخصم المستحي
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full font-bold text-slate-400 hover:text-slate-600 h-10 rounded-xl"
                    >
                        إلغاء العملية
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentModal;
