-- Notification inbox: security-invoker view over existing, RLS-protected project records.
-- No background email or push delivery is implied.
CREATE TABLE IF NOT EXISTS public.rpos_notification_reads (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 notification_key text NOT NULL CHECK(length(notification_key) BETWEEN 3 AND 200),
 read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,notification_key)
);
ALTER TABLE public.rpos_notification_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_notification_reads FROM PUBLIC,anon;
GRANT SELECT,INSERT,DELETE ON public.rpos_notification_reads TO authenticated;
DROP POLICY IF EXISTS rpos_notification_reads_own ON public.rpos_notification_reads;
CREATE POLICY rpos_notification_reads_own ON public.rpos_notification_reads FOR ALL TO authenticated
 USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

CREATE OR REPLACE VIEW public.rpos_notifications WITH (security_invoker=true) AS
 SELECT 'delivery:'||r.id::text AS notification_key,r.project_id,
 'delivery'::text AS category,r.title,
 CASE WHEN r.priority='critical' THEN 'Critical priority' ELSE 'Overdue action' END AS message,
 CASE WHEN r.priority='critical' THEN 'critical' ELSE 'high' END AS severity,
 r.owner_user_id AS recipient_id,r.created_at AS occurred_at
 FROM public.rpos_delivery_records r
 WHERE r.owner_user_id IS NOT NULL AND r.status NOT IN ('closed','resolved','cancelled','approved','rejected')
 AND (r.priority='critical' OR r.due_date<current_date)
 UNION ALL
 SELECT 'schedule:'||s.id::text,s.project_id,'schedule',s.title,
 CASE WHEN s.status='blocked' THEN 'Schedule blocked' ELSE 'Schedule overdue' END,
 'high',s.created_by,s.created_at
 FROM public.rpos_delivery_schedule s
 WHERE s.status='blocked' OR (s.finish_date<current_date AND s.status NOT IN ('completed','cancelled'))
 UNION ALL
 SELECT 'review:'||a.id::text,a.project_id,'approval',a.title,
 'AI recommendation awaiting independent review','medium',NULL::uuid,a.created_at
 FROM public.rpos_ai_recommendations a WHERE a.status='submitted';
GRANT SELECT ON public.rpos_notifications TO authenticated;

-- Read-only notification list filtered to the user, including review items for org admins/directors.
CREATE OR REPLACE FUNCTION public.rpos_my_notifications()
RETURNS TABLE(notification_key text,project_id text,category text,title text,message text,severity text,occurred_at timestamptz,is_read boolean)
LANGUAGE sql SECURITY INVOKER SET search_path TO '' STABLE AS $fn$
 SELECT n.notification_key,n.project_id,n.category,n.title,n.message,n.severity,n.occurred_at,
 (r.notification_key IS NOT NULL) AS is_read
 FROM public.rpos_notifications n
 LEFT JOIN public.rpos_notification_reads r ON r.notification_key=n.notification_key AND r.user_id=auth.uid()
 WHERE auth.uid() IS NOT NULL AND
 (n.recipient_id=auth.uid() OR (n.category='approval' AND EXISTS(
 SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id
 WHERE p.id=n.project_id AND m.user_id=auth.uid() AND m.role IN ('admin','director')
 )))
 ORDER BY n.occurred_at DESC LIMIT 300;
$fn$;
REVOKE ALL ON FUNCTION public.rpos_my_notifications() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_my_notifications() TO authenticated;
