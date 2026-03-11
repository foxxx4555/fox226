import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WalletCardProps {
    balance: number;
    frozenBalance?: number;
    currency: string;
    type: 'shipper' | 'carrier' | 'platform';
    onRefresh?: () => void;
    onTopUp?: () => void;
    onWithdraw?: () => void;
}

const WalletCard: React.FC<WalletCardProps> = ({
    balance,
    frozenBalance = 0,
    currency = 'SAR',
    type,
    onRefresh,
    onTopUp,
    onWithdraw
}) => {
    const titles = {
        shipper: 'محفظة الشاحن',
        carrier: 'محفظة الناقل',
        platform: 'محفظة المنصة'
    };

    const bgColors = {
        shipper: 'bg-gradient-to-br from-blue-600 to-blue-800',
        carrier: 'bg-gradient-to-br from-emerald-600 to-emerald-800',
        platform: 'bg-gradient-to-br from-purple-600 to-purple-800'
    };

    return (
        <Card className={`${bgColors[type]} text-white border-none shadow-xl rounded-3xl overflow-hidden relative`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center relative z-10">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Wallet size={20} className="text-white/80" />
                        {titles[type]}
                    </CardTitle>
                    {onRefresh && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onRefresh}
                            className="text-white/60 hover:text-white hover:bg-white/10 rounded-full"
                        >
                            <RefreshCw size={16} />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-white/60 text-sm font-medium mb-1">
                                {type === 'shipper' ? 'إجمالي المديونية الحالية' : 'الرصيد المتاح للسحب'}
                            </p>
                            <h2 className="text-4xl font-black tracking-tight">
                                {type === 'shipper' ? Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                <span className="text-xl font-bold text-white/40 ms-2">{currency}</span>
                            </h2>
                        </div>
                        
                        {type === 'carrier' && (
                            <div className="text-right">
                                <p className="text-white/60 text-xs font-bold mb-1">الأرباح المجمدة</p>
                                <div className="bg-white/10 px-3 py-1 rounded-lg border border-white/10">
                                    <span className="text-lg font-black">{frozenBalance.toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-white/40 ms-1">{currency}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {onTopUp && (
                            <Button
                                onClick={onTopUp}
                                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-none font-bold rounded-xl h-11"
                            >
                                <ArrowDownRight size={18} className="me-2 text-blue-200" />
                                شحن الرصيد
                            </Button>
                        )}
                        {(type === 'carrier' || type === 'platform') && onWithdraw && (
                            <Button
                                onClick={onWithdraw}
                                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-none font-bold rounded-xl h-11"
                            >
                                <ArrowUpRight size={18} className="me-2 text-emerald-200" />
                                سحب الأرباح
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default WalletCard;
