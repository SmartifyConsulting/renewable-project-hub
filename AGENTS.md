<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## RPOS database
- Keep `public.projects` private with RLS and service-role-only grants until real workspace access policies are implemented; the prototype role selector is not authentication.
- Store project fields in snake_case matching the RPOS Project model; defer the portfolio foreign key until its table exists so this table can be created independently.
