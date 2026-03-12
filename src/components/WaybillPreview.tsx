import React from 'react';

interface WaybillProps {
    load: any;
    shipper: any;
    driver?: any;
}

export const WaybillPreview: React.FC<WaybillProps> = ({ load, shipper, driver }) => {
    if (!load) return null;

    return (
        <div className="bg-white p-4 sm:p-8 w-full max-w-[210mm] mx-auto font-sans text-right text-[10px]" dir="rtl" style={{ color: '#002060', minHeight: '297mm', boxSizing: 'border-box' }}>
            {/* Header Title */}
            <div className="relative flex justify-center items-center mb-6 mt-4">
                <div className="absolute right-0 flex items-center">
                    <div className="font-black text-3xl tracking-tighter drop-shadow-sm">
                        <span className="text-[#002060] border-b-[3px] border-[#002060] pb-1">SAS</span>
                        <span className="text-yellow-500 italic ml-2">Transport</span>
                    </div>
                </div>
                <div className="bg-[#002060] text-yellow-500 font-bold px-8 py-2 text-xl uppercase shadow-md inline-block relative z-10 border-2 border-[#002060]">
                    بوليصة شحن Bill of LADING
                </div>
            </div>

            {/* Document Info */}
            <div className="flex justify-between items-center mb-2 font-bold text-xs" dir="ltr">
                <div className="flex gap-4">
                    <span>NUMBER: <span className="border-b border-black inline-block w-24 text-center text-black font-normal">{load.id?.substring(0, 8).toUpperCase() || ''}</span></span>
                    <span>BILL DATE: <span className="border-b border-black inline-block w-24 text-center text-black font-normal">{new Date(load.created_at || Date.now()).toLocaleDateString('en-GB')}</span></span>
                </div>
                <div className="flex gap-4 text-[10px]" dir="rtl">
                    <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3 border-[#002060]" checked readOnly /> شركة الشحن الخاص</label>
                    <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3 border-[#002060]" readOnly /> شركة النقل كامل</label>
                </div>
            </div>

            {/* Main Table Layout */}
            <div className="border border-[#002060] mb-4">
                {/* FROM / TO Headers */}
                <div className="flex bg-[#002060] text-white font-bold text-center border-b border-[#002060]">
                    <div className="flex-1 p-1 border-l border-white">FROM بيانات الشاحن</div>
                    <div className="flex-1 p-1">TO بيانات المرسل اليه</div>
                </div>

                {/* FROM / TO Details */}
                <div className="flex border-b border-[#002060] min-h-[60px]">
                    {/* FROM */}
                    <div className="flex-1 flex border-l border-[#002060]">
                        <div className="w-24 border-l border-[#002060] p-1 font-bold bg-[#E6E6FA]/30 flex flex-col justify-between" dir="ltr">
                            <div>Name</div>
                            <div>Phone Number</div>
                            <div>Address</div>
                        </div>
                        <div className="flex-1 p-1 text-black flex flex-col justify-between">
                            <div className="border-b border-dashed border-gray-300 pb-1 font-bold text-sm">{shipper?.company_name || shipper?.full_name || load?.owner?.company_name || load?.owner?.full_name || '---'}</div>
                            <div className="border-b border-dashed border-gray-300 py-1 font-bold" dir="ltr">{shipper?.phone || load?.owner?.phone || '---'}</div>
                            <div className="pt-1 font-bold text-xs">{load?.origin || '---'}</div>
                        </div>
                        <div className="w-20 border-r border-[#002060] p-1 font-bold text-left flex flex-col justify-between" dir="ltr">
                            <div>الاسم</div>
                            <div>رقم الهاتف</div>
                            <div>العنوان</div>
                        </div>
                    </div>
                    {/* TO */}
                    <div className="flex-1 flex min-h-[60px]">
                        <div className="w-24 border-l border-[#002060] p-1 font-bold bg-[#E6E6FA]/30 flex flex-col justify-between" dir="ltr">
                            <div>Name</div>
                            <div>Phone Number</div>
                            <div>Address</div>
                        </div>
                        <div className="flex-1 p-1 text-black flex flex-col justify-between">
                            <div className="border-b border-dashed border-gray-300 pb-1 font-bold text-sm">{load?.receiver_name || '---'}</div>
                            <div className="border-b border-dashed border-gray-300 py-1 font-bold" dir="ltr">{load?.receiver_phone || '---'}</div>
                            <div className="pt-1 font-bold text-xs">{load?.destination || '---'}</div>
                        </div>
                        <div className="w-20 border-r border-[#002060] p-1 font-bold text-left flex flex-col justify-between" dir="ltr">
                            <div>الاسم</div>
                            <div>رقم الهاتف</div>
                            <div>العنوان</div>
                        </div>
                    </div>
                </div>

                {/* Carrier Data / Truck Data Headers */}
                <div className="flex bg-[#002060] text-white font-bold text-center border-b border-[#002060]">
                    <div className="flex-1 p-1 border-l border-white">بيانات الناقل Carrier Data</div>
                    <div className="flex-1 p-1">بيانات الشاحنة Truck Data</div>
                </div>

                {/* Carrier / Truck Details */}
                <div className="flex border-b border-[#002060] min-h-[60px]">
                    {/* Carrier */}
                    <div className="flex-1 flex border-l border-[#002060]">
                        <div className="w-24 border-l border-[#002060] p-1 font-bold bg-[#E6E6FA]/30 flex flex-col justify-between" dir="ltr">
                            <div>Name</div>
                            <div>Phone Number</div>
                            <div>Card number</div>
                        </div>
                        <div className="flex-1 p-1 text-black flex flex-col justify-between">
                            <div className="border-b border-dashed border-gray-300 pb-1">{driver?.profile?.full_name || load?.driver?.profile?.full_name || load?.driver?.full_name || ''}</div>
                            <div className="border-b border-dashed border-gray-300 py-1" dir="ltr">{driver?.profile?.phone || load?.driver?.profile?.phone || load?.driver?.phone || ''}</div>
                            <div className="pt-1">{driver?.profile?.commercial_register || driver?.id_number || load?.driver?.profile?.commercial_register || load?.driver?.id_number || ''}</div>
                        </div>
                        <div className="w-20 border-r border-[#002060] p-1 font-bold text-left flex flex-col justify-between" dir="ltr">
                            <div>الاسم</div>
                            <div>رقم الهاتف</div>
                            <div>رقم البطاقة</div>
                        </div>
                    </div>
                    {/* Truck */}
                    <div className="flex-1 flex min-h-[60px]">
                        <div className="w-24 border-l border-[#002060] p-1 font-bold bg-[#E6E6FA]/30 flex flex-col justify-between" dir="ltr">
                            <div>Truck Type</div>
                            <div>Plate Number</div>
                            <div>Truck Size</div>
                        </div>
                        <div className="flex-1 p-1 text-black flex flex-col justify-between">
                            <div className="border-b border-dashed border-gray-300 pb-1">{load.body_type || ''}</div>
                            <div className="border-b border-dashed border-gray-300 py-1">{driver?.plate_number || load?.driver?.plate_number || ''}</div>
                            <div className="pt-1">{load.truck_size || ''}</div>
                        </div>
                        <div className="w-20 border-r border-[#002060] p-1 font-bold text-left flex flex-col justify-between" dir="ltr">
                            <div>نوع الشاحنة</div>
                            <div>رقم اللوحة</div>
                            <div>حجم الشاحنة</div>
                        </div>
                    </div>
                </div>

                {/* Shipment Description Table Headers */}
                <div className="flex bg-[#002060] text-white font-bold text-center border-b border-[#002060]">
                    <div className="w-20 p-1 border-l border-white">الكمية Quantity</div>
                    <div className="flex-1 p-1 border-l border-white">وصف الشحنة Shipment description</div>
                    <div className="w-20 p-1 border-l border-white">الوحدة Unit</div>
                    <div className="w-24 p-1">النوع Type</div>
                </div>

                {/* Shipment Rows (Static empty rows + 1 filled) */}
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex border-b border-[#002060] min-h-[25px]">
                        <div className="w-20 border-l border-[#002060] p-1 text-center text-black flex items-center justify-center font-bold">
                            {i === 0 ? (load.quantity || load.weight || '---') : ''}
                        </div>
                        <div className="flex-1 border-l border-[#002060] p-1 text-black flex items-center px-2 font-bold">
                            {i === 0 ? (load.description || (load.origin && load.destination ? `شحنة من ${load.origin} إلى ${load.destination}` : '---')) : ''}
                        </div>
                        <div className="w-20 border-l border-[#002060] p-1 text-center text-black flex items-center justify-center font-bold">
                            {i === 0 ? (load.unit || '---') : ''}
                        </div>
                        <div className="w-24 p-1 text-center text-black flex items-center justify-center font-bold">
                            {i === 0 ? (load.package_type || '---') : ''}
                        </div>
                    </div>
                ))}

                {/* Additional Info Block */}
                <div className="flex flex-col text-[11px] font-bold border-b border-[#002060]">
                    <div className="flex min-h-[35px] border-b border-[#002060]">
                        <div className="w-[15%] border-l border-[#002060] p-1 flex items-center justify-start pl-2 bg-[#f8f9fa]" dir="ltr">Freight charge</div>
                        <div className="w-[15%] border-l border-[#002060] p-1 flex items-center justify-center bg-[#f8f9fa]">أجرة الشحن</div>
                        <div className="w-[20%] border-l border-[#002060] p-1 flex items-center justify-center text-black font-bold text-[12px]">{load.price ? `SAR ${load.price}` : '---'}</div>
                        <div className="w-[15%] border-l border-[#002060] p-1 flex items-center justify-center bg-[#f8f9fa]" dir="ltr">Shipment Type</div>
                        <div className="w-[20%] border-l border-[#002060] p-1 flex items-center justify-center text-black font-bold text-[12px]">{load.package_type || load.truck_category || '---'}</div>
                        <div className="w-[15%] p-1 flex items-center justify-center bg-[#f8f9fa]">نوع الشحنة</div>
                    </div>
                    <div className="flex min-h-[35px] border-b border-[#002060]">
                        <div className="w-[15%] border-l border-[#002060] p-1 flex items-center justify-start pl-2 bg-[#f8f9fa]" dir="ltr">Value of goods</div>
                        <div className="w-[15%] border-l border-[#002060] p-1 flex items-center justify-center bg-[#f8f9fa]">قيمة البضاعة</div>
                        <div className="w-[20%] border-l border-[#002060] p-1 flex items-center justify-center text-black font-bold text-[12px]">{load.goods_value ? `${load.goods_value} SAR` : '---'}</div>
                        <div className="w-[15%] border-l border-[#002060] p-1 flex items-center justify-center bg-[#f8f9fa]" dir="ltr">Flight Itinerary</div>
                        <div className="w-[20%] border-l border-[#002060] p-1 flex items-center justify-center text-black font-bold text-[10px] text-center leading-tight">{load.origin && load.destination ? `${load.origin.split(',')[0]} - ${load.destination.split(',')[0]}` : '---'}</div>
                        <div className="w-[15%] p-1 flex items-center justify-center bg-[#f8f9fa]">خط سير الرحلة</div>
                    </div>
                    <div className="flex min-h-[35px]">
                        <div className="w-[15%] border-l border-[#002060] p-1 flex items-center justify-start pl-2 bg-[#f8f9fa]" dir="ltr">Shipping insurance</div>
                        <div className="w-[15%] border-l border-[#002060] p-1 flex items-center justify-center bg-[#f8f9fa]">التأمين على الشحنة</div>
                        <div className="w-[20%] border-l border-[#002060] p-1 flex items-center justify-center text-black font-bold text-[12px]">{load.insurance_value ? `${load.insurance_value} SAR` : '---'}</div>
                        <div className="w-[15%] border-l border-[#002060] p-1 flex items-center justify-center bg-[#f8f9fa]" dir="ltr">Fare Payment Method</div>
                        <div className="w-[20%] border-l border-[#002060] p-1 flex items-center justify-center text-black font-bold text-[12px]">{load.payment_method || 'الدفع عند الاستلام'}</div>
                        <div className="w-[15%] p-1 flex items-center justify-center bg-[#f8f9fa]">طريقة دفع الأجرة</div>
                    </div>
                </div>

                {/* Terms and Conditions */}
                <div className="p-2 text-center text-[10px] leading-relaxed border-b border-[#002060]">
                    <p className="font-bold mb-1">
                        تعتبر البضائع في عهدة السائق منذ استلامه لها وتنتهي مسؤوليته بتسليمها للمستلم، ويتحمل كامل المسؤولية.
                    </p>
                    <p className="font-sans" dir="ltr">
                        The goods are considered in the driver's possession from the time he receives them, and his responsibility ends when they are delivered to the recipient. He bears full responsibility.
                    </p>
                </div>

                {/* Signatures Section Headers */}
                <div className="flex bg-[#002060] text-white font-bold text-center border-b border-[#002060]">
                    <div className="flex-1 p-1 border-l border-white">CONSIGNEE المرسل اليه</div>
                    <div className="flex-1 p-1 border-l border-white">DRIVER السائق</div>
                    <div className="flex-1 p-1">SHIPPER الشاحن</div>
                </div>

                {/* Signatures Boxes */}
                <div className="flex min-h-[140px] text-[9px] font-normal">
                    {/* Consignee */}
                    <div className="flex-1 border-l border-[#002B5B] p-3 flex flex-col justify-between relative bg-white">
                        <div className="flex flex-col gap-2 relative z-10 text-[9px]">
                            <span dir="ltr" className="w-full text-left leading-snug">I acknowledge that I have received the goods in good condition, and there are no defects or shortages.</span>
                            <span dir="rtl" className="w-full text-right font-bold mt-2 leading-relaxed">أقر بموجب أنني قد استلمت البضاعة بحالة جيدة ولا يوجد بها أي عيوب أو نقص.</span>
                        </div>
                        <div className="flex flex-col gap-4 font-bold mt-8 w-full" dir="ltr">
                            <div className="flex justify-between items-end w-full">
                                <span className="shrink-0 w-16 text-center text-[10px]">Date التاريخ</span>
                                <div className="flex-1 border-b-[1.5px] border-dotted border-[#002B5B] mb-1 mx-2"></div>
                            </div>
                            <div className="flex justify-between items-end w-full">
                                <span className="shrink-0 w-16 text-center text-[10px]">Signature التوقيع</span>
                                <div className="flex-1 border-b-[1.5px] border-dotted border-[#002B5B] mb-1 mx-2"></div>
                            </div>
                        </div>
                    </div>
                    {/* Driver */}
                    <div className="flex-1 border-l border-[#002B5B] p-3 flex flex-col justify-between relative bg-[#E6F4EA]">
                        <div className="flex flex-col gap-2 relative z-10 text-[9px]">
                            <span dir="ltr" className="w-full text-left leading-snug">I acknowledge receipt of the goods and take full responsibility until delivery to the recipient.</span>
                            <span dir="rtl" className="w-full text-right font-bold mt-2 leading-relaxed">أقر باستلام البضائع وأتحمل المسؤولية الكاملة عنها حتى تسليمها للمستلم.</span>
                        </div>
                        <div className="flex flex-col gap-4 font-bold mt-8 w-full" dir="ltr">
                            <div className="flex justify-between items-end w-full">
                                <span className="shrink-0 w-16 text-center text-[10px]">Date التاريخ</span>
                                <div className="flex-1 border-b-[1.5px] border-dotted border-[#002B5B] mb-1 mx-2"></div>
                            </div>
                            <div className="flex justify-between items-end w-full">
                                <span className="shrink-0 w-16 text-center text-[10px]">Signature التوقيع</span>
                                <div className="flex-1 border-b-[1.5px] border-dotted border-[#002B5B] mb-1 mx-2"></div>
                            </div>
                        </div>
                    </div>
                    {/* Shipper */}
                    <div className="flex-1 p-3 flex flex-col justify-between relative bg-white">
                        <div className="flex flex-col gap-2 relative z-10 text-[9px]">
                            <span dir="ltr" className="w-full text-left leading-snug">I confirm that the shipped products are free from defects or prohibited items and are fit for transport in accordance with applicable regulations.</span>
                            <span dir="rtl" className="w-full text-right font-bold mt-2 leading-relaxed">أقر بأن المنتجات المشحونة خالية من العيوب أو المواد الممنوعة، وصالحة للنقل وفق الأنظمة المعمول بها.</span>
                        </div>
                        <div className="flex flex-col gap-4 font-bold mt-8 w-full" dir="ltr">
                            <div className="flex justify-between items-end w-full">
                                <span className="shrink-0 w-16 text-center text-[10px]">Date التاريخ</span>
                                <div className="flex-1 border-b-[1.5px] border-dotted border-[#002B5B] mb-1 mx-2"></div>
                            </div>
                            <div className="flex justify-between items-end w-full">
                                <span className="shrink-0 w-16 text-center text-[10px]">signature التوقيع</span>
                                <div className="flex-1 border-b-[1.5px] border-dotted border-[#002B5B] mb-1 mx-2"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 0; 
                    }
                    body { 
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        background: white !important;
                    }
                    @page :first {
                        /* First page specific rules if needed */
                    }
                    /* Ensure exact dimensions in print */
                    .w-\\[210mm\\] {
                        width: 100% !important;
                        max-width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 auto !important;
                        padding: 10mm !important;
                        box-sizing: border-box !important;
                        transform: scale(0.95);
                        transform-origin: top center;
                        page-break-after: always;
                    }
                }
            `}} />
        </div>
    );
};
