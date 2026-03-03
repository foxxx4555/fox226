CREATE TABLE public.ticket_messages ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE, sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, message TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), is_read BOOLEAN DEFAULT FALSE );  ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;  CREATE POLICY \
Allow
participants
to
read
messages\ ON public.ticket_messages FOR SELECT USING (   auth.uid() IN (     SELECT user_id FROM public.support_tickets WHERE id = ticket_messages.ticket_id   )   OR   EXISTS (     SELECT 1 FROM public.user_roles ur      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'support')   ) );  CREATE POLICY \Allow
participants
to
insert
messages\ ON public.ticket_messages FOR INSERT WITH CHECK (   auth.uid() IN (     SELECT user_id FROM public.support_tickets WHERE id = ticket_messages.ticket_id   )   OR   EXISTS (     SELECT 1 FROM public.user_roles ur      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'support')   ) );  alter publication supabase_realtime add table public.ticket_messages;
