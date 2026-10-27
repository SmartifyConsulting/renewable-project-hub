-- Private RKI document storage. Run after 0008.
-- Storage object names: <project-id>/<auth-user-id>/<random-uuid>.<extension>
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('rpos-knowledge','rpos-knowledge',false,26214400,
 ARRAY['application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS rpos_knowledge_storage_insert ON storage.objects;
CREATE POLICY rpos_knowledge_storage_insert ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
 bucket_id='rpos-knowledge'
 AND (storage.foldername(name))[2]=auth.uid()::text
 AND EXISTS (
   SELECT 1 FROM public.projects p
   JOIN public.portfolios pf ON pf.id=p.portfolio_id
   JOIN public.organisation_memberships om ON om.organisation_id=pf.org_id
   WHERE p.id=(storage.foldername(name))[1]
   AND om.user_id=auth.uid() AND om.role IN ('admin','director','manager')
 )
);
DROP POLICY IF EXISTS rpos_knowledge_storage_select ON storage.objects;
CREATE POLICY rpos_knowledge_storage_select ON storage.objects
FOR SELECT TO authenticated USING (
 bucket_id='rpos-knowledge'
 AND (
 EXISTS (
   SELECT 1 FROM public.projects p
   JOIN public.portfolios pf ON pf.id=p.portfolio_id
   JOIN public.organisation_memberships om ON om.organisation_id=pf.org_id
   WHERE p.id=(storage.foldername(name))[1] AND om.user_id=auth.uid()
 )
 OR EXISTS (
   SELECT 1 FROM public.project_memberships pm
   WHERE pm.project_id=(storage.foldername(name))[1] AND pm.user_id=auth.uid()
 )
 )
);
-- Deliberately no UPDATE or DELETE policy: document binaries are immutable once uploaded.
-- Prevent users registering a private bucket path that belongs to another project or uploader.
CREATE OR REPLACE FUNCTION private.rpos_validate_knowledge_source_path()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE object_name text;
BEGIN
 IF NEW.source_uri LIKE 'storage:rpos-knowledge/%' THEN
   object_name := substring(NEW.source_uri from length('storage:rpos-knowledge/')+1);
   IF split_part(object_name,'/',1)<>NEW.project_id
      OR split_part(object_name,'/',2)<>NEW.created_by::text
      OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='rpos-knowledge' AND o.name=object_name)
   THEN RAISE EXCEPTION 'Invalid project document reference' USING ERRCODE='22023'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rpos_validate_knowledge_path ON public.rpos_knowledge_sources;
CREATE TRIGGER rpos_validate_knowledge_path BEFORE INSERT ON public.rpos_knowledge_sources
FOR EACH ROW EXECUTE FUNCTION private.rpos_validate_knowledge_source_path();
