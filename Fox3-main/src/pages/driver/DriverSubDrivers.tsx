import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { SubDriver } from '@/types';

export default function DriverSubDrivers() {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const [drivers, setDrivers] = useState<SubDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ driver_name: '', driver_phone: '', id_number: '', license_number: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchDrivers = async () => {
    if (!userProfile?.id) return;
    try {
      const data = await api.getSubDrivers(userProfile.id);
      setDrivers(data as SubDriver[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDrivers(); }, [userProfile]);

  const handleAdd = async () => {
    if (!userProfile?.id) return;
    setSubmitting(true);
    try {
      await api.addSubDriver(form, userProfile.id);
      toast.success(t('success'));
      setDialogOpen(false);
      setForm({ driver_name: '', driver_phone: '', id_number: '', license_number: '' });
      fetchDrivers();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSubDriver(id);
      toast.success(t('success'));
      fetchDrivers();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{t('my_drivers')}</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={18} className="me-2" />{t('add_driver')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('add_driver')}</DialogTitle>
                <DialogDescription>أدخل بيانات السائق الجديد لإضافته إلى أسطولك المعتمد في النظام.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>{t('driver_name')}</Label><Input value={form.driver_name} onChange={e => setForm(p => ({...p, driver_name: e.target.value}))} className="mt-1" /></div>
                <div><Label>{t('phone')}</Label><Input value={form.driver_phone} onChange={e => setForm(p => ({...p, driver_phone: e.target.value}))} className="mt-1" dir="ltr" /></div>
                <div><Label>{t('id_number')}</Label><Input value={form.id_number} onChange={e => setForm(p => ({...p, id_number: e.target.value}))} className="mt-1" dir="ltr" /></div>
                <div><Label>{t('license_number')}</Label><Input value={form.license_number} onChange={e => setForm(p => ({...p, license_number: e.target.value}))} className="mt-1" dir="ltr" /></div>
                <Button onClick={handleAdd} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="animate-spin" /> : t('save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t('no_data')}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {drivers.map(driver => (
              <Card key={driver.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-accent/10"><UserPlus size={24} className="text-accent" /></div>
                      <div>
                        <p className="font-semibold">{driver.driver_name}</p>
                        <p className="text-sm text-muted-foreground">{driver.driver_phone}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(driver.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
