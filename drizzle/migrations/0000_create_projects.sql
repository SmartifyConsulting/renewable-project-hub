CREATE TABLE public.projects (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  portfolio_id text,
  name text NOT NULL,
  technology text NOT NULL DEFAULT 'Solar PV',
  capacity text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'South Africa',
  region text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'Origination',
  status text NOT NULL DEFAULT 'Active',
  director text NOT NULL DEFAULT '',
  manager text NOT NULL DEFAULT '',
  budget numeric NOT NULL DEFAULT 0,
  spent numeric NOT NULL DEFAULT 0,
  spi numeric NOT NULL DEFAULT 1,
  cpi numeric NOT NULL DEFAULT 1,
  cod date,
  offtaker text NOT NULL DEFAULT '',
  epc text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  activation_day integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON TABLE public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.projects IS 'RPOS Project register. Private until real workspace membership and project access policies are implemented; demo UI roles do not authorize database access.';
COMMENT ON COLUMN public.projects.portfolio_id IS 'RPOS portfolio reference; foreign key deferred until the portfolio table exists.';
CREATE INDEX projects_portfolio_id_idx ON public.projects (portfolio_id);
CREATE FUNCTION public.set_project_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_project_updated_at();