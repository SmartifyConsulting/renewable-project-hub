import { cn } from "@/lib/utils";
import { Panel } from "./page";

export function OrgChart({ director, manager }: { director: string; manager: string }) {
  const leads = [["Grid & Electrical", "Dr. Marco Rossi"], ["Delivery", "Sipho Ndlovu"], ["Assurance", "Claire Bennett"], ["PMO", "Aisha Patel"], ["Knowledge", "Lerato Dlamini"]];
  const Box = ({ t, n, dark }: { t: string; n: string; dark?: boolean }) => <div className={cn("rounded-md border px-3 py-2 text-center text-xs", dark ? "bg-navy text-navy-foreground" : "bg-card")}><div className="font-semibold">{n}</div><div className={dark ? "text-navy-foreground/70" : "text-muted-foreground"}>{t}</div></div>;
  return (
    <Panel title="Project organisation">
      <div className="flex flex-col items-center gap-3">
        <Box t="Project Sponsor / Executive" n="Richard Okafor" dark />
        <span className="h-4 w-px bg-border" />
        <Box t="Project Director" n={director} dark />
        <span className="h-4 w-px bg-border" />
        <Box t="Project Manager" n={manager} />
        <span className="h-4 w-px bg-border" />
        <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-5">{leads.map(([t, n]) => <Box key={t} t={`${t} lead`} n={n} />)}</div>
      </div>
    </Panel>
  );
}
