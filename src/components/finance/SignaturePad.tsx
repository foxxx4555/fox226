import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, RotateCcw, PenTool } from 'lucide-react';

interface SignaturePadProps {
    onSave: (signatureDataUrl: string) => void;
    onCancel: () => void;
}

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
    }, []);

    const getPos = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            setIsDrawing(true);
        }
    };

    const draw = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const endDrawing = () => {
        setIsDrawing(false);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const save = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            onSave(dataUrl);
        }
    };

    return (
        <Card className="p-4 bg-white rounded-3xl border-2 border-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <PenTool size={18} className="text-blue-600" /> توقيع المستلم (رقمي)
                </h3>
                <Button variant="ghost" size="sm" onClick={clear} className="text-slate-400 font-bold hover:text-rose-500">
                    <RotateCcw size={16} className="ml-2" /> مسح
                </Button>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 overflow-hidden touch-none">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={200}
                    className="w-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                />
            </div>

            <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold border-2 border-slate-100" onClick={onCancel}>
                    إلغاء
                </Button>
                <Button className="flex-1 h-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={save}>
                    <Check size={18} /> اعتماد التوقيع
                </Button>
            </div>
        </Card>
    );
}
