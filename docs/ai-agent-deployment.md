# RPOS AI Agent deployment

GitHub commits do not deploy Supabase Edge Functions automatically.

## Prerequisites

1. Apply `drizzle/migrations/0028_rpos_ai_generation_provenance.sql` in the project's Supabase SQL Editor.
2. Create an OpenAI API key and keep it in Supabase Edge Function secrets, **not** in Vite/Lovable environment variables.
3. Ensure organisation administrators have enabled the relevant agent and at least one project fact has been independently accepted.

## Supabase CLI

From a trusted terminal with the Supabase CLI installed:

```sh
supabase login
supabase link --project-ref aggcfhtvsdsnefavhksa
supabase secrets set OPENAI_API_KEY="YOUR_KEY"
supabase secrets set OPENAI_MODEL="gpt-4.1-mini"
supabase secrets set ALLOWED_ORIGIN="https://YOUR-APP-DOMAIN"
supabase functions deploy rpos-agent-analyze
```

The function requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` (normally provided by Supabase hosting). Keep JWT verification enabled. Restrict `ALLOWED_ORIGIN` to the actual deployed application origin; never use a wildcard for production.

## Smoke test

Sign in to RPOS as a user authorised to write to the project. Open **Evidence Brief**, select a project and an enabled agent, confirm accepted facts are listed, then select **Generate AI recommendation**. Open **AI Agents** and confirm the recommendation is labelled **AI-generated**, with its model and source references, and remains **submitted** until an independent admin/director reviews it.

Expected safe failures: disabled agent (403), no accepted facts (422), invalid session (401), missing secret (503), AI provider error (502). Do not paste secrets into browser consoles or share screenshots containing them.

## Limitations before production

- The AI execution endpoint has not been live-tested or load-tested.
- The current model-generated provenance RPC can be invoked by authorised authenticated clients; its origin field is not cryptographic proof of an OpenAI call. Restrict to a trusted server-only path before treating provenance as tamper-resistant.
- The current endpoint has no per-user rate limit, cost quota, request deduplication, or asynchronous job queue. Do not enable broad production access until these controls are added.
- Evidence brief is capped at 200 accepted facts; the model receives the first 40, each truncated. This is not a comprehensive document review.
- Generated recommendations are advisory and require independent human approval.
