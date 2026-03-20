import React from 'react';

interface InvoiceTemplateProps {
    invoice: any;
    userProfile: any;
    printRef: React.RefObject<HTMLDivElement>;
}

export default function InvoiceTemplate({ invoice, userProfile, printRef }: InvoiceTemplateProps) {
    if (!invoice) return null;

    const amount = Number(invoice.amount);
    const vat = amount * 0.15;
    const totalWithVat = amount + vat;

    const formatCurrency = (val: number) => new Intl.NumberFormat('ar-SA').format(val);

    return (
        <div className="absolute -left-[9999px] top-0 w-[800px] bg-white p-12 print:static print:w-auto print:left-0" ref={printRef}>
            <div className="space-y-8 text-right" dir="rtl">
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 mb-2">فاتورة ضريبية</h1>
                        <p className="text-xl text-slate-500 font-bold">الرقم المرجعي: {invoice.id?.substring(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-slate-400 font-bold mt-1">الرقم الضريبي: 300000000000003</p>
                    </div>
                    <div className="text-left font-black">
                        <div className="text-3xl tracking-tighter text-blue-600">SAS TRANSPORT</div>
                        <div className="text-sm text-slate-400">المنصة المالية اللوجستية</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 py-8">
                    <div className="space-y-4">
                        <h4 className="text-lg font-black bg-slate-100 p-2 inline-block rounded">بيانات المفوتر له</h4>
                        <div className="text-xl font-bold">{userProfile?.full_name}</div>
                        <div className="text-slate-500">{userProfile?.phone}</div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-lg font-black bg-slate-100 p-2 inline-block rounded">تاريخ المعاملة</h4>
                        <div className="text-xl font-bold">{new Date(invoice.created_at).toLocaleDateString('ar-SA')}</div>
                        <div className="text-slate-500">{new Date(invoice.created_at).toLocaleTimeString('ar-SA')}</div>
                    </div>
                </div>

                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="p-4 text-right border whitespace-nowrap">رقم العملية</th>
                            <th className="p-4 text-right border">الوصف</th>
                            <th className="p-4 text-center border">الحالة</th>
                            <th className="p-4 text-left border">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-6 border text-lg font-bold" dir="ltr">{invoice.id?.substring(0, 8).toUpperCase()}</td>
                            <td className="p-6 border text-lg font-bold">{invoice.description}</td>
                            <td className="p-6 border text-center font-bold">مكتمل</td>
                            <td className="p-6 border text-left font-bold text-xl">{formatCurrency(amount)} ر.س</td>
                        </tr>
                        <tr className="bg-slate-50">
                            <td colSpan={3} className="p-4 text-left font-bold text-lg border">الإجمالي قبل الضريبة</td>
                            <td className="p-4 text-left font-bold text-xl border">{formatCurrency(amount)} ر.س</td>
                        </tr>
                        <tr className="bg-slate-50">
                            <td colSpan={3} className="p-4 text-left font-bold text-lg border">ضريبة القيمة المضافة (15%)</td>
                            <td className="p-4 text-left font-bold text-xl border">{formatCurrency(vat)} ر.س</td>
                        </tr>
                        <tr className="bg-slate-100">
                            <td colSpan={3} className="p-4 text-left font-black text-xl border">الإجمالي المستحق</td>
                            <td className="p-4 text-left font-black text-3xl border text-slate-900">{formatCurrency(totalWithVat)} ر.س</td>
                        </tr>
                    </tbody>
                </table>

                <div className="mt-16 text-center text-slate-400 font-bold border-t pt-8">
                    هذه الفاتورة مصدرة إلكترونياً من منصة SAS TRANSPORT وموثقة لدى هيئة الزكاة والضريبة والجمارك.
                </div>
            </div>
        </div>
    );
}
