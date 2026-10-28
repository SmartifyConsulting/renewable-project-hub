-- 0033: Require independent verification before an NCR can be closed.
CREATE OR REPLACE FUNCTION private.rpos_guard_ncr_closure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF NEW.status='closed' AND NOT EXISTS (
  SELECT 1 FROM public.rpos_assurance_verifications v
  WHERE v.ncr_id=NEW.id AND v.project_id=NEW.project_id
   AND v.verified_by IS DISTINCT FROM NEW.created_by
   AND (NEW.owner_user_id IS NULL OR v.verified_by IS DISTINCT FROM NEW.owner_user_id)
   AND length(btrim(coalesce(v.verification_notes,'')))>=10
 ) THEN
  RAISE EXCEPTION 'Independent verification is required before NCR closure';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rpos_ncr_closure_guard ON public.rpos_assurance_ncrs;
CREATE TRIGGER rpos_ncr_closure_guard
 BEFORE INSERT OR UPDATE OF status,created_by,owner_user_id,project_id
 ON public.rpos_assurance_ncrs
 FOR EACH ROW EXECUTE FUNCTION private.rpos_guard_ncr_closure();
