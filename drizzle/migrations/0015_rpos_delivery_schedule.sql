-- Delivery schedule and escalation indicators. Apply after 0014.
CREATE TABLE IF NOT EXISTS public.rpos_delivery_schedule (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 250),
 start_date date NOT NULL,
 finish_date date NOT NULL,
 baseline_finish_date date NOT NULL,
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','in_progress','blocked','completed','cancelled')),
 progress_percent integer NOT NULL DEFAULT 0 CHECK(progress_percent BETWEEN 0 AND 100),
 depends_on uuid REFERENCES public.rpos_delivery_schedule(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(finish_date>=start_date),
 CHECK(status<>'completed' OR progress_percent=100)
);
ALTER TABLE public.rpos_delivery_schedule ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_delivery_schedule FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_delivery_schedule TO authenticated;
CREATE POLICY rpos_schedule_read ON public.rpos_delivery_schedule FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id WHERE p.id=project_id AND m.user_id=auth.uid())
 OR EXISTS (SELECT 1 FROM public.project_memberships m WHERE m.project_id=project_id AND m.user_id=auth.uid())
);
CREATE OR REPLACE VIEW public.rpos_delivery_escalations WITH (security_invoker=true) AS
 SELECT project_id,'schedule'::text AS item_type,id::text AS item_id,title,
 CASE WHEN status='blocked' THEN 'blocked' ELSE 'overdue' END AS reason
 FROM public.rpos_delivery_schedule
 WHERE status='blocked' OR (finish_date<current_date AND status NOT IN ('completed','cancelled'))
 UNION ALL
 SELECT project_id,record_type,id::text,title,
 CASE WHEN priority='critical' THEN 'critical_priority' ELSE 'overdue' END
 FROM public.rpos_delivery_records
 WHERE status NOT IN ('closed','resolved','cancelled','approved','rejected')
 AND (priority='critical' OR (due_date<current_date AND due_date IS NOT NULL));
GRANT SELECT ON public.rpos_delivery_escalations TO authenticated;
