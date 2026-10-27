-- Enforce independently reviewed evidence at approval time.
-- Apply after 0008. Existing decisions remain historical records.
CREATE OR REPLACE FUNCTION private.rpos_require_verified_gate_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE missing_domains text;
BEGIN
 IF NEW.decision='rejected' THEN RETURN NEW; END IF;
 SELECT string_agg(d.domain_id, ', ' ORDER BY d.domain_id) INTO missing_domains
 FROM public.readiness_domain_assessments d
 WHERE d.project_id=NEW.project_id AND NOT EXISTS (
   SELECT 1 FROM public.rpos_readiness_source_links l
   JOIN public.rpos_knowledge_sources s ON s.id=l.source_id
   WHERE l.project_id=d.project_id AND l.domain_id=d.domain_id
   AND s.project_id=d.project_id AND s.status='verified'
   AND s.reviewed_by IS NOT NULL AND s.reviewed_by<>s.created_by
 );
 IF missing_domains IS NOT NULL THEN
   RAISE EXCEPTION 'Approval requires independently verified evidence for domains: %',missing_domains USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rpos_gate_evidence_required ON public.readiness_gate_decisions;
CREATE TRIGGER rpos_gate_evidence_required BEFORE INSERT ON public.readiness_gate_decisions
FOR EACH ROW EXECUTE FUNCTION private.rpos_require_verified_gate_evidence();
