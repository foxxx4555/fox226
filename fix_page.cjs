const fs = require('fs');
let text = fs.readFileSync('src/pages/admin/AdminUsers.tsx', 'utf8');

text = text.replace('export default function AdminUsers() {', 'export default function AdminShippersDrivers() {');

text = text.replace(
    'import { Loader2, Search, UserCheck, UserX, UserSearch, Shield, MapPin, Phone, Trash2, Key, Eye, EyeOff, Calendar, Mail, FileText, CheckCircle, Wallet } from \'lucide-react\';',
    'import { Loader2, Search, UserCheck, UserX, UserSearch, Shield, MapPin, Phone, Trash2, Key, Eye, EyeOff, Calendar, Mail, FileText, CheckCircle, Wallet, Truck } from \'lucide-react\';'
);

text = text.replace(
    /<div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500\/20 text-white">[\s\S]*?<UsersIcon size=\{32\} \/>[\s\S]*?<\/div>[\s\S]*?إدارة المستخدمين[\s\S]*?<\/h1>[\s\S]*?<p className="text-slate-400 font-bold text-lg mt-2 mr-16">مراقبة وتوثيق حسابات السائقين والشركاء<\/p>/m,
    '<div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white"><Truck size={32} /></div>إدارة الشاحنين والنواقل</h1><p className="text-slate-400 font-bold text-lg mt-2 mr-16">إدارة حسابات التجار وسائقي مركبات النقل</p>'
);

text = text.replace(
    /<Button[\s\S]*?onClick=\{\(\) => window\.location\.href = '\/admin\/admins'\}[\s\S]*?>[\s\S]*?إدارة الصلاحيات والمسؤولين[\s\S]*?<\/Button>[\s\S]*?<\/div>/m,
    '</div>'
);

text = text.replace(
    /<Tabs defaultValue="all" className="w-full space-y-8" dir="rtl">[\s\S]*?<TabsList className="bg-transparent border-none gap-2">[\s\S]*?<TabsTrigger value="all".*?<\/TabsTrigger>[\s\S]*?<TabsTrigger value="shippers".*?<\/TabsTrigger>[\s\S]*?<TabsTrigger value="drivers".*?<\/TabsTrigger>([\s\S]*?)<TabsTrigger value="receivers".*?<\/TabsTrigger>[\s\S]*?<TabsTrigger value="admins".*?<\/TabsTrigger>[\s\S]*?<\/TabsList>([\s\S]*?)<\/div>[\s\S]*?<TabsContent value="all".*?>[\s\S]*?<\/TabsContent>([\s\S]*?)<TabsContent value="receivers".*?>[\s\S]*?<\/TabsContent>[\s\S]*?<TabsContent value="admins".*?>[\s\S]*?<\/TabsContent>[\s\S]*?<\/Tabs>/m,
    '<Tabs defaultValue="shippers" className="w-full space-y-8" dir="rtl"><div className="flex items-center justify-between bg-white p-3 rounded-3xl shadow-lg border border-slate-50"><TabsList className="bg-transparent border-none gap-2"><TabsTrigger value="shippers" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">شاحنون ({shippers.length})</TabsTrigger><TabsTrigger value="drivers" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">ناقلون وسائقون ({drivers.length})</TabsTrigger>$1</TabsList>$2</div>$3</Tabs>'
);

fs.writeFileSync('src/pages/admin/AdminShippersDrivers.tsx', text, 'utf8');
console.log('File recreated successfully via Node script.');
