// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Loader2, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AGENTS } from "@/lib/rpos/config";
import { dayOffset } from "@/lib/rpos/data";
import { actions, currentUser, projectName } from "@/lib/rpos/store";
import type { AgentProposal } from "@/lib/rpos/types";
import { useScope } from "@/components/rpos/hooks";
import { EmptyState, Field, Kpi, PageHeader, Panel, ViewTabs, searchView } from "@/components/rpos/page";
import { NAV } from "@/components/rpos/nav";
import { SourceTag, StatusBadge } from "@/components/rpos/status";
import { BarsChart, Grid } from "@/components/rpos/viz";

export const Route = createFileRoute("/agents")({
  validateSearch: searchView,
  head: () => ({
    meta: [
      { title: "AI Agent Centre — RPOS" },
      { name: "description", content: "Specialist RPOS agents, their operating contracts, proposals and the human review queue." },
      { property: "og:title", content: "AI Agent Centre — RPOS" },
      { property: "og:description", content: "Specialist agents with human-in-the-loop review." },
    ],
  }),
  component: Agents,
});

const agentStatus = (i: number) => (i % 7 === 3 ? "Paused" : i % 5 === 4 ? "Evaluating" : "Active");
const INPUTS: Record<string, string[]> = { RKI: ["Sources", "Evidence", "Knowledge objects"], Readiness: ["Readiness criteria", "Evidence", "Findings"], Domain: ["Domain studies", "Contracts", "Evidence"], Activation: ["Project plan", "RACI", "Registers"], Delivery: ["Schedule", "Risk register", "Decision log"], Assurance: ["Requirements", "Tests", "Acceptance records"], Intelligence: ["Approved registers", "KPIs"], Knowledge: ["Closed projects", "Lessons"], Platform: ["User request", "All agent outputs"] };
const OUTPUTS: Record<string, string[]> = { RKI: ["Evidence drafts", "Gap flags", "Contradictions"], Readiness: ["Draft domain scores", "Findings"], Domain: ["Observations", "Recommendations"], Activation: ["Draft plans", "RACI proposals"], Delivery: ["Risk proposals", "Decision papers"], Assurance: ["Verification gaps", "NCR trend analysis"], Intelligence: ["Draft briefs"], Knowledge: ["Lesson drafts"], Platform: ["Routed responses"] };

function Agents() {
  const { view = "overview" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { s } = useScope();
  const [detail, setDetail] = useState<string | null>(null);
  const go = (v: string) => navigate({ search: { view: v } });
  const pending = s.proposals.filter((p) => p.status === "Pending review");
  const agent = AGENTS.find((a) => a.id === detail);
  return (
    <div>
      <PageHeader crumbs={["AI Agent Centre"]} title="AI Agent Centre" description="Specialist agents observe and recommend. Humans approve. Deterministic controls enforce." />
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-ai-soft p-3 text-xs">
        <ShieldAlert className="size-4 text-ai" /> <b>Operating contract:</b> agents cannot approve material decisions or write to registers directly. Legend:
        <SourceTag kind="AI observation" /><SourceTag kind="AI recommendation" /><SourceTag kind="Human-approved" /><SourceTag kind="System control" />
      </div>
      <ViewTabs views={NAV[10].views} value={view} onChange={go} />
      {view === "overview" && (
        <div className="space-y-4">
          <Grid cols={4}>
            <Kpi label="Specialist agents" value={AGENTS.length} onClick={() => go("directory")} />
            <Kpi label="Awaiting human review" value={pending.length} tone={pending.length ? "bad" : "good"} onClick={() => go("queue")} />
            <Kpi label="Approved proposals" value={s.proposals.filter((p) => p.status === "Approved").length} onClick={() => go("queue")} />
            <Kpi label="Acceptance rate (90d)" value="71%" onClick={() => go("performance")} />
          </Grid>
          <Panel title="Agents by operating area"><BarsChart data={[...new Set(AGENTS.map((a) => a.area))].map((ar) => ({ name: ar, Agents: AGENTS.filter((a) => a.area === ar).length }))} keys={["Agents"]} /></Panel>
        </div>
      )}
      {view === "directory" && (
        <Panel title="Agent directory" bodyClass="p-0 overflow-x-auto">
          <table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr>{["ID", "Agent", "Area", "Responsibility", "Status", "Open proposals"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{AGENTS.map((a, i) => <tr key={a.id} tabIndex={0} onClick={() => setDetail(a.id)} onKeyDown={(e) => e.key === "Enter" && setDetail(a.id)} className="cursor-pointer border-t hover:bg-accent/50"><td className="px-3 py-2 font-mono">{a.id}</td><td className="px-3 font-semibold">{a.name}</td><td className="px-3">{a.area}</td><td className="max-w-md px-3 text-muted-foreground">{a.resp}</td><td className="px-3"><StatusBadge status={agentStatus(i)} /></td><td className="px-3 tabular-nums">{s.proposals.filter((p) => p.agentId === a.id && p.status === "Pending review").length}</td></tr>)}</tbody>
          </table>
        </Panel>
      )}
      {view === "console" && <Console />}
      {view === "queue" && <Queue />}
      {view === "performance" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Proposal acceptance by agent (90 days)"><BarsChart horizontal height={480} data={AGENTS.map((a, i) => ({ name: a.name.replace(" Agent", ""), Accepted: 40 + ((i * 13) % 50), Rejected: 5 + ((i * 7) % 20) }))} keys={["Accepted", "Rejected"]} stacked /></Panel>
          <Panel title="Evaluation history" bodyClass="p-0"><table className="w-full text-xs"><thead className="bg-muted/60 text-left text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2">Agent</th><th>Evaluation</th><th>Date</th><th>Precision</th><th>Result</th></tr></thead><tbody>{AGENTS.slice(0, 12).map((a, i) => <tr key={a.id} className="border-t"><td className="px-3 py-2">{a.name}</td><td>Golden set v{1 + (i % 3)}</td><td>{dayOffset(-i * 6)}</td><td className="tabular-nums">{(0.78 + ((i * 3) % 18) / 100).toFixed(2)}</td><td><StatusBadge status={i % 6 === 5 ? "Failed" : "Passed"} /></td></tr>)}</tbody></table></Panel>
        </div>
      )}
      <Sheet open={!!agent} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {agent && (
            <>
              <SheetHeader className="px-0"><SheetDescription>{agent.id} · {agent.area}</SheetDescription><SheetTitle className="font-display">{agent.name}</SheetTitle></SheetHeader>
              <div className="space-y-4 text-sm">
                <p>{agent.resp}</p>
                <dl className="grid grid-cols-2 gap-3"><Field label="Status"><StatusBadge status={agentStatus(AGENTS.indexOf(agent))} /></Field><Field label="Autonomy">Recommend only</Field><Field label="Input sources">{(INPUTS[agent.area] ?? []).join(", ")}</Field><Field label="Output types">{(OUTPUTS[agent.area] ?? []).join(", ")}</Field></dl>
                <div><h4 className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Supported tasks</h4><ul className="list-disc pl-5 text-xs">{["Analyse linked evidence", "Draft observations with confidence", "Propose actions for human review", "Explain assumptions and lineage"].map((t) => <li key={t}>{t}</li>)}</ul></div>
                <div className="rounded-md border bg-ai-soft p-3 text-xs"><b>Operating contract.</b> Reads approved RPOS objects within the user's access. Writes only proposals. Every output records evidence, assumptions and confidence. Material decisions require a human with delegated authority.</div>
                <div><h4 className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Recent activity</h4>{s.proposals.filter((p) => p.agentId === agent.id).map((p) => <div key={p.id} className="flex justify-between border-b py-1.5 text-xs"><span>{p.title}</span><StatusBadge status={p.status} /></div>)}{!s.proposals.some((p) => p.agentId === agent.id) && <p className="text-xs text-muted-foreground">No proposals yet.</p>}</div>
                <Button size="sm" onClick={() => { setDetail(null); go("console"); }}>Open in console</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProposalCard({ p }: { p: AgentProposal }) {
  const { s } = useScope();
  const user = currentUser(s);
  const agent = AGENTS.find((a) => a.id === p.agentId)!;
  return (
    <div className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SourceTag kind={p.kind === "Observation" ? "AI observation" : "AI recommendation"} />
        <span className="text-xs text-muted-foreground">{agent.name} · {projectName(s, p.projectId)} · {p.created}</span>
        <span className="ml-auto"><StatusBadge status={p.status} /></span>
      </div>
      <h3 className="font-display font-semibold">{p.title}</h3>
      <div className="grid gap-3 text-xs md:grid-cols-2">
        <div><h4 className="mb-1 font-bold uppercase text-muted-foreground">Analysis</h4><p>{p.analysis}</p></div>
        <div><h4 className="mb-1 font-bold uppercase text-muted-foreground">Supporting evidence</h4>{p.evidence.map((e) => <Link key={e} to="/records/$id" params={{ id: e }} className="block font-mono text-primary hover:underline">{e} {s.records.find((r) => r.id === e)?.title}</Link>)}</div>
        <div><h4 className="mb-1 font-bold uppercase text-muted-foreground">Assumptions</h4><ul className="list-disc pl-4">{p.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div>
        <div><h4 className="mb-1 font-bold uppercase text-muted-foreground">Findings</h4><ul className="list-disc pl-4">{p.findings.map((a) => <li key={a}>{a}</li>)}</ul></div>
      </div>
      <div className="text-xs"><b>Confidence:</b> {p.confidence}% · <b>Proposed actions:</b> {p.actions.join("; ")}</div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <SourceTag kind="System control" /><span className="text-[11px] text-muted-foreground">Approval requires a role with approval authority.</span>
        {p.status === "Pending review" ? (
          <span className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" disabled={!user.canApprove} onClick={() => { actions.reviewProposal(p.id, false); toast("Proposal rejected"); }}>Reject</Button>
            <Button size="sm" disabled={!user.canApprove} onClick={() => { const recs = actions.reviewProposal(p.id, true); toast.success(`Approved — ${recs.length} action(s) created`, { description: recs.map((r) => r.id).join(", ") }); }}>Approve & create actions</Button>
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-2 text-xs">{p.status === "Approved" && <SourceTag kind="Human-approved" />} by {p.reviewer}</span>
        )}
      </div>
    </div>
  );
}

function Queue() {
  const { s, projects } = useScope();
  const items = s.proposals.filter((p) => projects.some((x) => x.id === p.projectId));
  const pending = items.filter((p) => p.status === "Pending review");
  return (
    <div className="space-y-4">
      {!currentUser(s).canApprove && <p className="rounded-md border bg-warning-soft p-2.5 text-xs">You can view proposals but your role cannot approve them.</p>}
      {pending.length === 0 && <EmptyState title="No proposals awaiting review" />}
      {pending.map((p) => <ProposalCard key={p.id} p={p} />)}
      {items.filter((p) => p.status !== "Pending review").length > 0 && <h3 className="pt-2 font-display text-sm font-semibold">Reviewed</h3>}
      {items.filter((p) => p.status !== "Pending review").map((p) => <ProposalCard key={p.id} p={p} />)}
    </div>
  );
}

function Console() {
  const { s, projects, of } = useScope();
  const [agentId, setAgentId] = useState("AG14");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? s.projects[0].id);
  const [q, setQ] = useState("What are the emerging risks to our COD, and what should we do about them?");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AgentProposal | null>(null);
  const live = result ? s.proposals.find((p) => p.id === result.id) ?? result : null;
  const run = () => {
    setBusy(true);
    setResult(null);
    setTimeout(() => {
      const agent = AGENTS.find((a) => a.id === agentId)!;
      const ev = of("evidence").filter((e) => e.projectId === projectId).slice(0, 3);
      const risks = of("risk").filter((r) => r.projectId === projectId && r.status !== "Closed");
      const top = risks.find((r) => r.severity === "Very high") ?? risks[0];
      const p: AgentProposal = {
        id: `AGP-${String(s.proposals.length + 101)}`,
        agentId, projectId, kind: "Recommendation",
        title: top ? `Mitigate "${top.title}" before next gate` : "No material exposure identified",
        analysis: `${agent.name} reviewed ${ev.length} evidence items and ${risks.length} open risks for ${projectName(s, projectId)} in response to: "${q}". ${top ? `${top.id} is rated ${top.severity} with owner ${top.owner}; current mitigations do not reduce exposure within the schedule window.` : ""}`,
        evidence: [...ev.map((e) => e.id), ...(top ? [top.id] : [])],
        assumptions: ["Approved baseline schedule is current", "No change requests pending that alter scope", "Evidence older than 6 months treated as lower confidence"],
        findings: [`${risks.filter((r) => r.severity === "Very high" || r.severity === "High").length} high-rated risks open`, "Mitigation actions lack due dates for 2 risks"],
        confidence: 68 + (agentId.charCodeAt(3) % 20),
        actions: top ? [`Assign recovery plan for ${top.id}`, "Schedule executive review of exposure"] : ["Re-run analysis next reporting period"],
        status: "Pending review", created: dayOffset(0),
      };
      actions.addProposal(p);
      setResult(p);
      setBusy(false);
    }, 1500);
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <Panel title="Agent console">
        <div className="space-y-3">
          <Select value={agentId} onValueChange={setAgentId}><SelectTrigger aria-label="Agent"><SelectValue /></SelectTrigger><SelectContent>{AGENTS.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
          <Select value={projectId} onValueChange={setProjectId}><SelectTrigger aria-label="Project"><SelectValue /></SelectTrigger><SelectContent>{s.projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
          <Textarea aria-label="Your request" rows={5} value={q} onChange={(e) => setQ(e.target.value)} />
          <Button className="w-full" disabled={busy || !q.trim()} onClick={run}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send request</Button>
          <p className="text-[11px] text-muted-foreground">Responses are simulated in this prototype.</p>
        </div>
      </Panel>
      <div className="space-y-3">
        <div className="panel flex gap-3 p-4 text-sm"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-bold text-navy-foreground">You</span><p>{q}</p></div>
        {busy && <div className="panel flex items-center gap-3 p-4 text-sm text-muted-foreground"><Bot className="size-5 text-ai" /> Analysing evidence and registers…</div>}
        {live && <ProposalCard p={live} />}
        {!busy && !live && <EmptyState title="Send a request to see the agent's analysis" text="The response shows evidence, assumptions, findings, confidence and proposed actions for your approval." />}
      </div>
    </div>
  );
}
