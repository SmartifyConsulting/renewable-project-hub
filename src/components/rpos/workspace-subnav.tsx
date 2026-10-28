import { Link, useRouterState } from "@tanstack/react-router";

type Section = { to: "/delivery-live" | "/schedule" | "/agents-live" | "/agent-evidence"; label: string };
const sections: Record<"delivery" | "agents", Section[]> = {
 delivery: [
  { to: "/delivery-live", label: "Registers & decisions" },
  { to: "/schedule", label: "Schedule & milestones" },
 ],
 agents: [
  { to: "/agents-live", label: "Agents & recommendations" },
  { to: "/agent-evidence", label: "Evidence briefs" },
 ],
};

export function WorkspaceSubnav({ area }: { area: "delivery" | "agents" }) {
 const pathname = useRouterState({ select: state => state.location.pathname });
 return <nav aria-label={area === "delivery" ? "Delivery sections" : "AI Intelligence sections"} className="flex flex-wrap gap-1 border-b pb-2">
  {sections[area].map(section => {
   const active = pathname === section.to;
   return <Link key={section.to} to={section.to}
    aria-current={active ? "page" : undefined}
    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
    {section.label}
   </Link>;
  })}
 </nav>;
}
