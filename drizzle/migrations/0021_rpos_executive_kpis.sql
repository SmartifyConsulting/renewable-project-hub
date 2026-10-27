-- Executive Intelligence: security-invoker project KPI view.
-- Apply after migration 0020.
CREATE OR REPLACE VIEW public.rpos_executive_project_kpis WITH (security_invoker=true) AS
SELECT p.id AS project_id,p.name AS project_name,p.portfolio_id,
 (SELECT count(*) FROM public.rpos_activation_items a WHERE a.project_id=p.id) AS activation_total,
 (SELECT count(*) FROM public.rpos_activation_items a WHERE a.project_id=p.id AND a.status='completed') AS activation_completed,
 (SELECT count(*) FROM public.rpos_activation_items a WHERE a.project_id=p.id AND a.status='blocked') AS activation_blocked,
 (SELECT count(*) FROM public.rpos_delivery_records d WHERE d.project_id=p.id AND d.record_type='risk' AND d.status NOT IN ('closed','resolved','cancelled')) AS open_risks,
 (SELECT count(*) FROM public.rpos_delivery_records d WHERE d.project_id=p.id AND d.record_type='issue' AND d.status NOT IN ('closed','resolved','cancelled')) AS open_issues,
 (SELECT count(*) FROM public.rpos_delivery_records d WHERE d.project_id=p.id AND d.record_type='action' AND d.status NOT IN ('closed','resolved','cancelled')) AS open_actions,
 (SELECT count(*) FROM public.rpos_delivery_records d WHERE d.project_id=p.id AND d.record_type='change' AND d.status='pending_approval') AS pending_changes,
 (SELECT count(*) FROM public.rpos_delivery_schedule s WHERE s.project_id=p.id) AS schedule_total,
 (SELECT count(*) FROM public.rpos_delivery_schedule s WHERE s.project_id=p.id AND s.status='completed') AS schedule_completed,
 (SELECT count(*) FROM public.rpos_delivery_schedule s WHERE s.project_id=p.id AND s.finish_date<current_date AND s.status NOT IN ('completed','cancelled')) AS schedule_overdue,
 (SELECT count(*) FROM public.rpos_assurance_inspections i WHERE i.project_id=p.id) AS inspections_total,
 (SELECT count(*) FROM public.rpos_assurance_ncrs n WHERE n.project_id=p.id AND n.status<>'closed') AS open_ncrs,
 (SELECT count(*) FROM public.rpos_assurance_ncrs n WHERE n.project_id=p.id AND n.severity='critical' AND n.status<>'closed') AS critical_ncrs,
 (SELECT count(*) FROM public.rpos_assurance_ncrs n WHERE n.project_id=p.id AND n.status='closed') AS closed_ncrs
FROM public.projects p;
REVOKE ALL ON public.rpos_executive_project_kpis FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_executive_project_kpis TO authenticated;
