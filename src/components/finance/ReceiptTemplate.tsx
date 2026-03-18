import React from 'react';

interface ReceiptTemplateProps {
    data: {
        invoice_id: string;
        shipment_id: string;
        shipper_name: string;
        amount: number;
        date: string;
        receipt_number?: string;
    } | null;
    printRef: React.RefObject<HTMLDivElement>;
}

export default function ReceiptTemplate({ data, printRef }: ReceiptTemplateProps) {
    if (!data) return null;

    const formatCurrency = (val: number) => new Intl.NumberFormat('ar-SA').format(val);

    return (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-12 overflow-y-auto" ref={printRef}>
            <div className="max-w-4xl mx-auto space-y-10 text-right font-sans" dir="rtl">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b-8 border-blue-900 pb-8">
                    <div>
                        <h1 className="text-5xl font-black text-blue-900 mb-2">سند قبض</h1>
                        <p className="text-xl text-slate-500 font-bold">رقم السند: {data.receipt_number || data.invoice_id?.substring(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="text-left">
                        <div className="text-4xl font-black tracking-tighter text-blue-600">FOX LOGISTICS</div>
                        <div className="text-sm text-slate-400 font-bold uppercase tracking-widest">Smart Logistics Solutions</div>
                    </div>
                </div>

                {/* Receipt Details Box */}
                <div className="bg-slate-50 p-10 rounded-[2rem] border-2 border-slate-100 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-blue-900/5 rounded-full -ml-16 -mt-16"></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-2">
                            <span className="text-slate-400 font-bold text-sm block">تاريخ السند</span>
                            <span className="text-2xl font-black text-slate-800">{new Date(data.date).toLocaleDateString('ar-SA')}</span>
                        </div>
                        <div className="text-left space-y-2">
                            <span className="text-slate-400 font-bold text-sm block">المبلغ الإجمالي</span>
                            <span className="text-4xl font-black text-emerald-600 font-mono" dir="ltr">{formatCurrency(data.amount)} SAR</span>
                        </div>
                    </div>

                    <div className="border-t-2 border-dashed border-slate-200 pt-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-slate-500 whitespace-nowrap">استلمنا من السيد/السادة:</span>
                            <div className="flex-1 border-b-2 border-slate-300 pb-1 text-2xl font-black text-slate-900">
                                {data.shipper_name}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-slate-500 whitespace-nowrap">مبلغ وقدره:</span>
                            <div className="flex-1 border-b-2 border-slate-300 pb-1 text-2xl font-black text-emerald-700">
                                {formatCurrency(data.amount)} ريال سعودي فقط لا غير
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-slate-500 whitespace-nowrap">وذلك عن:</span>
                            <div className="flex-1 border-b-2 border-slate-300 pb-1 text-xl font-bold text-slate-700">
                                سداد مستحقات الشحنة رقم ({data.shipment_id?.substring(0, 8).toUpperCase()})
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="grid grid-cols-2 gap-8 py-8 border-t border-slate-100">
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-6 rounded-2xl">
                            <h4 className="font-black text-blue-900 mb-2">ملاحظات هامة:</h4>
                            <ul className="text-sm text-blue-700 font-bold list-disc list-inside space-y-1">
                                <li>يعتبر هذا السند إيصالاً رسمياً باستلام المبلغ المذكور أعلاه.</li>
                                <li>المبلغ يشمل ضريبة القيمة المضافة (إن وجدت).</li>
                                <li>هذا المستند تم إنشاؤه آلياً ولا يحتاج إلى توقيع.</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-6 border-4 border-double border-slate-100 rounded-3xl opacity-50">
                        <div className="w-24 h-24 bg-slate-200 rounded-full mb-4"></div>
                        <span className="font-black text-slate-400">ختم المنصة الإلكتروني</span>
                    </div>
                </div>

                <div className="text-center pt-8 border-t border-slate-100">
                    <p className="text-slate-400 font-bold mb-2">شكراً لثقتكم بمنصة FOX LOGISTICS لخدمات النقل الذكي</p>
                    <p className="text-xs text-slate-300 tracking-widest font-mono">WWW.FOX-LOGISTICS.COM</p>
                </div>

            </div>
        </div>
    );
}
