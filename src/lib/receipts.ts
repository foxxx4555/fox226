import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { formatShortId } from './formatters';

export interface ReceiptData {
    invoice_id: string;
    shipment_id: string;
    shipper_name: string;
    amount: number;
    date: string;
    receipt_number?: string;
}

export const generateReceiptPdf = async (data: ReceiptData, printRef?: React.RefObject<HTMLDivElement>) => {
    if (printRef?.current) {
        try {
            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Receipt_${formatShortId(data.shipment_id, 'SH')}.pdf`);
            return;
        } catch (error) {
            console.error('Error generating PDF with html2canvas:', error);
            // Fallback to standard generation if needed, but standard is broken for Arabic
        }
    }

    // Fallback or Old Method (Not recommended for Arabic but kept for compatibility)
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    
    // --- Header Section ---
    doc.setFillColor(30, 58, 138); // Dark blue (Slate/Blue 900)
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('SAS TRANSPORT', 20, 25);
    
    doc.setFontSize(10);
    doc.text('SMART LOGISTICS SOLUTIONS', 20, 32);
    
    doc.setFontSize(18);
    doc.text('SENED EL-QABD', pageWidth - 20, 25, { align: 'right' });
    doc.text('سند قبض ضريبي', pageWidth - 20, 34, { align: 'right' });

    // --- Receipt Info ---
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`Receipt No: ${data.receipt_number || formatShortId(data.invoice_id, 'REC')}`, 20, 55);
    doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, pageWidth - 20, 55, { align: 'right' });

    // --- Content Box ---
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(15, 65, pageWidth - 30, 100, 3, 3, 'FD');

    doc.setFontSize(12);
    doc.text('Payment Acknowledgement / إقرار باستلام مبلغ', pageWidth / 2, 80, { align: 'center' });

    doc.setFontSize(11);
    doc.text(`We acknowledge that SAS Transport has received from:`, 25, 100);
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(`${data.shipper_name}`, 25, 108);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.text(`The sum of:`, 25, 120);
    doc.setFontSize(15);
    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.text(`${data.amount.toLocaleString()} SAR / ر.س`, 25, 130);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.text(`In payment for Shipment ID:`, 25, 145);
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(`${formatShortId(data.shipment_id, 'SH')}`, 25, 153);

    // --- Footer ---
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 200, pageWidth - 20, 200);
    
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.text('This is a computer-generated document and requires no signature.', pageWidth / 2, 210, { align: 'center' });
    doc.text('شكراً لتعاملكم مع ساس للنقل الذكي', pageWidth / 2, 216, { align: 'center' });
    
    doc.setFontSize(8);
    doc.text('www.sas-transport.com | support@sas-transport.com', pageWidth / 2, 225, { align: 'center' });

    // Save PDF
    doc.save(`Receipt_${formatShortId(data.shipment_id, 'SH')}.pdf`);
};
