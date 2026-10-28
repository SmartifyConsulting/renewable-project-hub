import { Link, useRouterState } from "@tanstack/react-router";

const sections = [
 { to: "/knowledge-live", label: "Sources & reviews" },
 { to: "/knowledge-facts", label: "Facts & contradictions" },
] as const;

/** Knowledge Intelligence owns its own secondary navigation. */
export function KnowledgeSubnav() {
 const pathname = useRouterState({ select: state => state.location.pathname });
 return <nav aria-label="Knowledge Intelligence sections" className="flex flex-wrap gap-1 border-b pb-2">
  {sections.map(section => {
   const active = pathname === section.to;
   return <Link key={section.to} to={section.to}
    aria-current={active ? "page" : undefined}
    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
    {section.label}
   </Link>;
  })}
 </nav>;
}
