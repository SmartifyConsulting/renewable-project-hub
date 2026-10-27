-- Apply after 0030. Escalation thresholds now affect actual in-app notification severity.
-- No scheduled job or external delivery is implied.
CREATE OR REPLACE VIEW public.rpos_notifications WITH (security_invoker=true) AS
 SELECT 'delivery:'||r.id::text AS notification_key,r.project_id,
 'delivery'::text AS category,r.title,
 CASE WHEN r.priority='critical' THEN 'Critical priority'
      WHEN r.due_date < current_date - COALESCE(ep.critical_days,7) THEN 'Critically overdue'
      WHEN r.due_date < current_date - COALESCE(ep.warning_days,2) THEN 'Escalated overdue'
      ELSE 'Overdue action' END AS message,
 CASE WHEN r.priority='critical' OR r.due_date < current_date - COALESCE(ep.critical_days,7) THEN 'critical'
      WHEN r.due_date < current_date - COALESCE(ep.warning_days,2) THEN 'high'
      ELSE 'medium' END AS severity,
 r.owner_user_id AS recipient_id,r.created_at AS occurred_at
 FROM public.rpos_delivery_records r
 JOIN public.projects p ON p.id=r.project_id
 JOIN public.portfolios pf ON pf.id=p.portfolio_id
 LEFT JOIN public.rpos_escalation_policies ep ON ep.organisation_id=pf.org_id
 WHERE r.owner_user_id IS NOT NULL AND r.status NOT IN ('closed','resolved','cancelled','approved','rejected')
 AND (r.priority='critical' OR r.due_date<current_date)
 UNION ALL
 SELECT 'schedule:'||s.id::text,s.project_id,'schedule',s.title,
 CASE WHEN s.status='blocked' THEN 'Schedule blocked'
      WHEN s.finish_date < current_date - COALESCE(ep.critical_days,7) THEN 'Critically overdue schedule'
      WHEN s.finish_date < current_date - COALESCE(ep.warning_days,2) THEN 'Escalated schedule delay'
      ELSE 'Schedule overdue' END,
 CASE WHEN s.finish_date < current_date - COALESCE(ep.critical_days,7) THEN 'critical'
      WHEN s.status='blocked' OR s.finish_date < current_date - COALESCE(ep.warning_days,2) THEN 'high'
      ELSE 'medium' END,
 s.created_by,s.created_at
 FROM public.rpos_delivery_schedule s
 JOIN public.projects p ON p.id=s.project_id
 JOIN public.portfolios pf ON pf.id=p.portfolio_id
 LEFT JOIN public.rpos_escalation_policies ep ON ep.organisation_id=pf.org_id
 WHERE s.status='blocked' OR (s.finish_date<current_date AND s.status NOT IN ('completed','cancelled'))
 UNION ALL
 SELECT 'review:'||a.id::text,a.project_id,'approval',a.title,
 'AI recommendation awaiting independent review','medium',NULL::uuid,a.created_at
 FROM public.rpos_ai_recommendations a WHERE a.status='submitted';
GRANT SELECT ON public.rpos_notifications TO authenticated;
