REVOKE ALL ON TABLE public.projects FROM anon, authenticated;
GRANT ALL ON TABLE public.projects TO service_role;
REVOKE EXECUTE ON FUNCTION public.set_project_updated_at() FROM PUBLIC, anon, authenticated;