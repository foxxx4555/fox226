import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function AdminTickets() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTickets().then(data => setTickets(data || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    open: 'bg-secondary/10 text-secondary', in_progress: 'bg-primary/10 text-primary',
    resolved: 'bg-accent/10 text-accent', closed: 'bg-muted text-muted-foreground',
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">{t('support_tickets')}</h2>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t('no_data')}</div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموضوع</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map(ticket => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                    <TableCell><Badge variant="outline">{ticket.priority}</Badge></TableCell>
                    <TableCell><Badge className={statusColors[ticket.status] || ''}>{ticket.status}</Badge></TableCell>
                    <TableCell>{new Date(ticket.created_at).toLocaleDateString('ar')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
