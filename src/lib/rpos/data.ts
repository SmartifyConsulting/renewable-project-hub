import { BANDS, DOMAINS, PEOPLE, REGISTERS, type Band } from "./config";
import type {
  ActivationTask,
  AgentProposal,
  AuditEvent,
  Notification,
  Organisation,
  Portfolio,
  Project,
  ReadinessEntry,
  RecordItem,
} from "./types";

// Deterministic pseudo-random so SSR and client render identical mock data.
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry(42);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];

export const TODAY = new Date("2026-10-27T09:00:00Z");
export function dayOffset(d: number) {
  const x = new Date(TODAY);
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
}

export const ORGANISATIONS: Organisation[] = [
  { id: "ORG-1", name: "Heita Renewables", country: "South Africa" },
  { id: "ORG-2", name: "Meridian Infrastructure Partners", country: "United Kingdom" },
];

export const PORTFOLIOS: Portfolio[] = [
  { id: "PF-01", orgId: "ORG-1", name: "Southern Solar Growth", description: "Utility-scale solar PV pipeline across Southern Africa and Chile.", owner: "Thandi Mokoena", status: "Active", geography: "South Africa, Chile", technology: "Solar PV" },
  { id: "PF-02", orgId: "ORG-1", name: "Wind Expansion Programme", description: "Onshore wind projects under REIPPPP Bid Window 7 and private PPAs.", owner: "Richard Okafor", status: "Active", geography: "South Africa", technology: "Wind" },
  { id: "PF-03", orgId: "ORG-2", name: "Storage & Hybrid Platform", description: "Battery storage and hybrid solar-plus-storage assets for grid services.", owner: "Sofia Herrera", status: "Active", geography: "South Africa", technology: "BESS, Hybrid" },
];

export const PROJECTS: Project[] = [
  { id: "PRJ-001", portfolioId: "PF-01", name: "Karoo Sun Solar PV", technology: "Solar PV", capacity: "180 MWp", country: "South Africa", region: "Northern Cape", stage: "Development", status: "Active", director: "Thandi Mokoena", manager: "James Whitfield", budget: 2950, spent: 312, spi: 0.94, cpi: 0.98, cod: "2028-09-30", offtaker: "Eskom (REIPPPP BW7)", epc: "TBC – shortlist of 3", objective: "Deliver 180 MWp of contracted solar capacity with IRR ≥ 13.5% and 40% local content.", activationDay: 0 },
  { id: "PRJ-002", portfolioId: "PF-02", name: "Highveld Wind Farm", technology: "Wind", capacity: "140 MW", country: "South Africa", region: "Mpumalanga", stage: "Pre-construction", status: "Active", director: "Richard Okafor", manager: "Kofi Mensah", budget: 3800, spent: 640, spi: 0.88, cpi: 0.95, cod: "2028-03-31", offtaker: "Sasol (Private PPA)", epc: "Vestas / Concor JV", objective: "Commission 140 MW wind for corporate offtake; secure 20-year PPA revenue.", activationDay: 60 },
  { id: "PRJ-003", portfolioId: "PF-03", name: "Saldanha BESS", technology: "BESS", capacity: "100 MW / 400 MWh", country: "South Africa", region: "Western Cape", stage: "Construction", status: "Active", director: "Sofia Herrera", manager: "Daniel Brooks", budget: 2100, spent: 1180, spi: 1.02, cpi: 0.91, cod: "2027-06-30", offtaker: "Eskom BESIPPPP", epc: "Hitachi Energy", objective: "Provide 4-hour storage and ancillary services under BESIPPPP W2.", activationDay: 60 },
  { id: "PRJ-004", portfolioId: "PF-01", name: "Atacama Ridge Solar", technology: "Solar PV", capacity: "250 MWp", country: "Chile", region: "Antofagasta", stage: "Feasibility", status: "Active", director: "Thandi Mokoena", manager: "Sofia Herrera", budget: 3100, spent: 48, spi: 0.97, cpi: 1.03, cod: "2029-12-31", offtaker: "Merchant + CNE tender", epc: "Not appointed", objective: "Confirm feasibility of 250 MWp merchant/tender hybrid revenue project.", activationDay: 0 },
  { id: "PRJ-005", portfolioId: "PF-02", name: "Eastern Cape Wind II", technology: "Wind", capacity: "210 MW", country: "South Africa", region: "Eastern Cape", stage: "Activation", status: "Active", director: "Richard Okafor", manager: "James Whitfield", budget: 5200, spent: 210, spi: 0.91, cpi: 0.99, cod: "2029-06-30", offtaker: "Eskom (REIPPPP BW7)", epc: "Nordex / WBHO", objective: "Activate delivery within 60 days of financial close and establish full controls.", activationDay: 34 },
  { id: "PRJ-006", portfolioId: "PF-03", name: "Mpumalanga Hybrid Solar + Storage", technology: "Hybrid", capacity: "120 MWp + 60 MWh", country: "South Africa", region: "Mpumalanga", stage: "Operations", status: "Closed", director: "Sofia Herrera", manager: "Daniel Brooks", budget: 1900, spent: 1874, spi: 1.0, cpi: 1.01, cod: "2026-02-28", offtaker: "Anglo American (Private PPA)", epc: "Juwi", objective: "Hybrid generation for mining offtaker; handed over to operations.", activationDay: 60 },
];

const TITLES: Record<string, string[]> = {
  risk: ["Grid capacity allocation delayed by NTCSA", "Module price escalation above contingency", "Community objection to access road", "Late issue of Water Use Licence", "Turbine supply slot slippage", "Currency exposure on imported equipment", "Geotechnical conditions worse than assumed", "Avifauna monitoring extends EIA timeline", "Lender technical advisor comments unresolved", "Battery cell supply chain concentration"],
  issue: ["Substation design not aligned with grid code", "Land lease registration incomplete", "Contractor mobilisation behind plan", "Missing as-built drawings for access road", "Labour dispute at laydown area", "Cable delivery damaged in transit"],
  decision: ["Approve EPC preferred bidder", "Adopt single-axis tracker technology", "Accept revised grid connection date", "Approve local content strategy", "Proceed to financial close", "Approve change to turbine hub height", "Select BESS augmentation strategy"],
  action: ["Submit updated grid study to NTCSA", "Finalise land lease addenda", "Issue RFQ for transformers", "Update financial model with Q3 tariffs", "Close out lender TA comments", "Complete stakeholder engagement plan", "Prepare board paper for FID", "Register risk owners for new risks", "Upload signed EIA record of decision"],
  dependency: ["NTCSA budget quote issuance", "Municipal road upgrade", "Department of Water licence", "Eskom self-build agreement", "Port of Ngqura turbine handling slot"],
  change: ["Increase inverter station count", "Relocate O&M building", "Extend construction period by 6 weeks", "Add 20 MWh BESS augmentation", "Change cable route around wetland"],
  requirement: ["Comply with SA Grid Code reactive power requirements", "Meet 40% local content threshold", "Maintain 300 m setback from homesteads", "Lender: independent engineer sign-off at COD", "SCADA integration with NTCSA control centre", "Bird collision monitoring for 2 years", "Fire suppression per NFPA 855"],
  deliverable: ["Basic design report", "Energy yield assessment (P50/P90)", "EIA final report", "Grid connection application", "Financial model v4", "Construction execution plan", "Commissioning procedures", "O&M handover pack"],
  workpackage: ["WP1 Grid & interconnection", "WP2 Civil & structural", "WP3 Electrical BoP", "WP4 Permitting & compliance", "WP5 Commercial & finance", "WP6 Stakeholder & ED"],
  milestone: ["Grid budget quote received", "Environmental authorisation", "Financial close", "Notice to proceed", "First power", "Commercial operation date"],
  evidence: ["Signed land option agreements", "NTCSA cost estimate letter", "Independent yield report – DNV", "Record of decision – DFFE", "Geotechnical investigation report", "Draft PPA term sheet", "Bird and bat monitoring report", "Lender TA comment log", "Insurance broker indication"],
  source: ["DFFE Record of Decision", "NTCSA Cost Estimate Letter", "DNV Energy Yield Assessment", "Land Option Agreements", "REIPPPP BW7 RFP", "Geotech Report – SRK", "Financial Model v3.2", "Grid Code v10.1"],
  gap: ["No evidence of servitude registration", "Missing P90 one-year yield figure", "Unconfirmed water source for construction", "No signed community trust deed", "Insurance programme not evidenced"],
  contradiction: ["Capacity 180 MWp vs 175 MWp in grid application", "COD date differs between PPA and schedule", "Two versions of the land parcel boundary", "Tariff assumption differs model vs term sheet"],
  control: ["Weekly risk register review", "Monthly cost reporting reconciliation", "Change request approval threshold", "Document control check", "Permit condition compliance audit", "HSE inspection"],
  test: ["Pile pull-out test", "Transformer FAT", "Insulation resistance test", "Battery container SAT", "Protection relay testing", "Turbine mechanical completion inspection"],
  ncr: ["Rebar cover below specification", "Incorrect cable glands installed", "Concrete cube strength failure", "Unapproved welding procedure"],
  defect: ["Tracker motor fault row 42", "Inverter communication drop-out", "HVAC unit alarm container 7", "Earthing continuity failure"],
  capa: ["Retrain civil subcontractor on cover requirements", "Replace non-compliant cable glands", "Update ITP for concrete pours", "Re-qualify welding procedure"],
  review: ["Gate 3 readiness review", "Basic design review", "Monthly quality review", "Deliverable review – EIA", "Commissioning readiness review"],
  finding: ["Grid connection evidence older than 6 months", "Risk register lacks quantified exposure", "RACI incomplete for commissioning", "Local content plan not evidenced", "Model sensitivities not documented"],
  recommendation: ["Commission updated grid study", "Increase contingency to 8%", "Appoint community liaison officer", "Run independent schedule review", "Escalate servitude registration"],
  stakeholder: ["NTCSA Grid Planning", "Local Municipality", "Community Trust", "Lenders – Standard Bank", "DFFE", "Landowner group", "Eskom Grid Access Unit"],
  document: ["Project Execution Plan", "Single Line Diagram Rev C", "EPC Contract", "Risk Management Procedure", "Stakeholder Engagement Plan", "Board minutes – Sept"],
  knowledge: ["Grid connection application template", "SOP – Readiness assessment", "Lesson: early servitude registration", "Best practice: tracker procurement", "Reusable requirement set – SA Grid Code", "Reusable WP – BESS commissioning", "Assurance test library – PV", "Reference: REIPPPP BW7 RFP summary"],
  meeting: ["Project Board", "Weekly delivery meeting", "Technical review – grid", "Monthly risk review", "Steering committee"],
  intervention: ["Executive escalation to NTCSA", "Bring in schedule recovery specialist", "Re-baseline commissioning plan", "Accelerate land registration"],
  acceptance: ["Acceptance – EIA final report", "Acceptance – Transformer FAT", "Acceptance – Basic design", "Acceptance – Commissioning procedures"],
};

let auditSeq = 1;
function audit(actor: string, action: string, at: string, target?: string, projectId?: string): AuditEvent {
  return { id: `AUD-${String(auditSeq++).padStart(5, "0")}`, at, actor, action, target, projectId };
}

function genRecords(): RecordItem[] {
  const out: RecordItem[] = [];
  for (const def of Object.values(REGISTERS)) {
    const titles = TITLES[def.key] ?? [];
    let n = 1;
    PROJECTS.forEach((p, pi) => {
      const count = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < count; i++) {
        const title = titles[(pi * 2 + i) % titles.length];
        const status = p.status === "Closed" ? def.statuses[def.statuses.length - 1] : def.statuses[Math.floor(rnd() * def.statuses.length)];
        const created = dayOffset(-Math.floor(rnd() * 160) - 5);
        const due = dayOffset(Math.floor(rnd() * 120) - 30);
        const fields: Record<string, string> = {};
        for (const ex of def.extra ?? []) {
          if (ex.options) fields[ex.key] = pick(ex.options);
          else if (ex.key === "progress") fields[ex.key] = String(Math.floor(rnd() * 100));
          else if (ex.key === "confidence") fields[ex.key] = String(55 + Math.floor(rnd() * 44));
          else if (ex.key === "version") fields[ex.key] = `v${1 + Math.floor(rnd() * 4)}.${Math.floor(rnd() * 10)}`;
          else if (ex.key === "impact") fields[ex.key] = `R ${(rnd() * 25).toFixed(1)} m`;
          else if (ex.key === "party") fields[ex.key] = pick(["NTCSA", "Municipality", "DFFE", "Transnet Port", "Landowner"]);
        }
        if (def.key === "risk" || def.key === "finding") fields.domain = fields.domain ?? pick(DOMAINS).name;
        const owner = pick(PEOPLE);
        const id = `${def.prefix}-${p.id.slice(-3)}-${String(n++).padStart(3, "0")}`;
        out.push({
          id,
          type: def.key,
          title,
          description: `${title} — ${p.name}. Recorded against the ${p.stage.toLowerCase()} stage with linked evidence and owner accountability.`,
          projectId: p.id,
          owner,
          status,
          severity: def.severity ? (BANDS[Math.min(4, Math.floor(rnd() * 5))] as Band) : undefined,
          created,
          due,
          fields,
          links: [],
          comments: rnd() > 0.5 ? [{ id: `C-${id}`, author: pick(PEOPLE), at: dayOffset(-3), text: "Reviewed at weekly delivery meeting; owner to confirm next steps." }] : [],
          attachments: rnd() > 0.6 ? [`${title.replace(/[^a-z0-9]+/gi, "_").slice(0, 28)}.pdf`] : [],
          history: [audit(owner, "Created", created, id, p.id)],
        });
      }
    });
  }
  // Coherent relationships per project: source → evidence → requirement/risk/decision/finding → action/recommendation
  for (const p of PROJECTS) {
    const by = (t: string) => out.filter((r) => r.projectId === p.id && r.type === t);
    const src = by("source"), evd = by("evidence"), req = by("requirement"), rsk = by("risk"), dec = by("decision"), act = by("action"), fnd = by("finding"), rcm = by("recommendation"), tst = by("test"), dlv = by("deliverable"), ctl = by("control"), acc = by("acceptance");
    const link = (a?: RecordItem, b?: RecordItem) => {
      if (!a || !b) return;
      if (!a.links.includes(b.id)) a.links.push(b.id);
      if (!b.links.includes(a.id)) b.links.push(a.id);
    };
    evd.forEach((e, i) => {
      link(src[i % src.length], e);
      link(e, req[i % req.length]);
      link(e, rsk[i % rsk.length]);
      link(e, dec[i % dec.length]);
      link(e, fnd[i % fnd.length]);
    });
    rsk.forEach((r, i) => link(r, act[i % act.length]));
    fnd.forEach((f, i) => { link(f, rcm[i % rcm.length]); link(f, act[(i + 1) % act.length]); });
    rcm.forEach((r, i) => link(r, dec[i % dec.length]));
    req.forEach((r, i) => { link(r, tst[i % tst.length]); link(r, dlv[i % dlv.length]); });
    tst.forEach((t, i) => link(t, acc[i % acc.length]));
    ctl.forEach((c, i) => link(c, evd[i % evd.length]));
  }
  return out;
}

function genReadiness(): Record<string, Record<string, ReadinessEntry>> {
  const base: Record<string, number> = { "PRJ-001": 3.2, "PRJ-002": 4.0, "PRJ-003": 4.4, "PRJ-004": 2.0, "PRJ-005": 3.7, "PRJ-006": 4.7 };
  const res: Record<string, Record<string, ReadinessEntry>> = {};
  for (const p of PROJECTS) {
    res[p.id] = {};
    for (const d of DOMAINS) {
      const score = Math.max(0, Math.min(5, Math.round((base[p.id] + (rnd() - 0.5) * 2.2) * 2) / 2));
      res[p.id][d.id] = {
        score,
        confidence: 50 + Math.floor(rnd() * 48),
        evidence: Math.min(100, Math.round(score * 18 + rnd() * 15)),
        criteria: [0, 1, 2, 3, 4].map((i) => i < Math.round(score)),
        note: "",
      };
    }
  }
  return res;
}

const WORKSTREAMS = ["Governance & controls", "Commercial & contracts", "Engineering & design", "Procurement", "Permitting & compliance", "Stakeholder & community", "HSE & quality"];
function genActivation(): Record<string, ActivationTask[]> {
  const out: Record<string, ActivationTask[]> = {};
  for (const p of PROJECTS) {
    let k = 1;
    out[p.id] = WORKSTREAMS.flatMap((ws, wi) => {
      const items = [
        ["Mobilise workstream lead & team", 0, 7],
        [`${ws}: baseline plan`, 5 + wi, 14],
        [`${ws}: registers & controls set up`, 18 + wi, 18],
        [`${ws}: readiness confirmation`, 40 + (wi % 3) * 3, 12],
      ] as const;
      const tasks: ActivationTask[] = items.map(([name, start, duration]) => {
        const end = start + duration;
        const day = p.activationDay;
        const progress = day >= end ? 100 : day <= start ? 0 : Math.round(((day - start) / duration) * 100 - rnd() * 25);
        return { id: `${p.id}-AT${k++}`, workstream: ws, name, start, duration, owner: pick(PEOPLE), progress: Math.max(0, progress) };
      });
      return tasks;
    });
    out[p.id].push(
      { id: `${p.id}-M30`, workstream: "Milestones", name: "Day 30 control baseline", start: 30, duration: 0, owner: p.manager, progress: p.activationDay >= 30 ? 100 : 0, milestone: true },
      { id: `${p.id}-M60`, workstream: "Milestones", name: "Day 60 activation complete & handover", start: 60, duration: 0, owner: p.director, progress: p.activationDay >= 60 ? 100 : 0, milestone: true },
    );
  }
  return out;
}

function genProposals(records: RecordItem[]): AgentProposal[] {
  const items: Array<[string, string, AgentProposal["kind"], string, string[]]> = [
    ["AG08", "PRJ-001", "Recommendation", "Commission updated grid capacity study before Gate 3", ["Raise action to procure updated grid study", "Add dependency on NTCSA capacity release"]],
    ["AG05", "PRJ-001", "Observation", "Capacity mismatch between grid application and yield report", ["Raise contradiction for resolution by Grid lead"]],
    ["AG14", "PRJ-002", "Recommendation", "Turbine slot slippage threatens COD by 7 weeks", ["Raise risk RSK (Very high)", "Schedule executive escalation with OEM"]],
    ["AG16", "PRJ-003", "Observation", "3 grid-code requirements lack verification evidence", ["Create verification tests for REQ items"]],
    ["AG11", "PRJ-004", "Recommendation", "Merchant tariff assumptions exceed P50 market curve", ["Run downside sensitivity", "Update financial model assumptions"]],
    ["AG12", "PRJ-005", "Recommendation", "Commissioning RACI incomplete at day 34 of activation", ["Assign RACI roles for commissioning workstream"]],
    ["AG18", "PRJ-002", "Observation", "Executive brief draft prepared for October board", ["Publish brief after Project Director approval"]],
  ];
  return items.map(([agentId, projectId, kind, title, actions], i) => {
    const ev = records.filter((r) => r.projectId === projectId && r.type === "evidence").slice(0, 3).map((r) => r.id);
    return {
      id: `AGP-${String(i + 1).padStart(3, "0")}`,
      agentId,
      projectId,
      kind,
      title,
      analysis: `Analysis of ${ev.length} linked evidence items and current registers indicates: ${title.toLowerCase()}. Exposure assessed against readiness criteria and current schedule baseline.`,
      evidence: ev,
      assumptions: ["Evidence dated within the last 6 months is current", "Baseline schedule v3 is the approved reference"],
      findings: ["Evidence coverage below threshold for affected domain", "No mitigating action currently assigned"],
      confidence: 62 + ((i * 7) % 30),
      actions,
      status: i === 6 ? "Approved" : "Pending review",
      reviewer: i === 6 ? "Richard Okafor" : undefined,
      created: dayOffset(-i),
    };
  });
}

export function initialData() {
  const records = genRecords();
  const audits: AuditEvent[] = records
    .flatMap((r) => r.history)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 200);
  const notifications: Notification[] = [
    { id: "N1", text: "Decision DEC awaiting your approval: Approve EPC preferred bidder", at: dayOffset(0), read: false, href: "/delivery" },
    { id: "N2", text: "Risk Intelligence Agent raised a Very high risk on Highveld Wind Farm", at: dayOffset(0), read: false, href: "/agents" },
    { id: "N3", text: "Gate 3 readiness review scheduled for Karoo Sun Solar PV", at: dayOffset(-1), read: false, href: "/readiness" },
    { id: "N4", text: "4 actions became overdue this week", at: dayOffset(-2), read: true, href: "/delivery" },
  ];
  return {
    organisations: ORGANISATIONS,
    portfolios: PORTFOLIOS,
    projects: PROJECTS,
    records,
    readiness: genReadiness(),
    activation: genActivation(),
    proposals: genProposals(records),
    audit: audits,
    notifications,
  };
}
