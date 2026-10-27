// @ts-nocheck -- strict-mode typing cleanup pending for the RPOS prototype
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronDown, HelpCircle, Lock, Menu, Search, Sun, Moon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ROLES, type RoleId } from "@/lib/rpos/config";
import { actions, currentUser, useRpos } from "@/lib/rpos/store";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setMobileOpen(false), [loc.pathname, loc.searchStr]);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 shrink-0 bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <SideNav onClose={() => setMobileOpen(false)} />
      </aside>
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-navy/50 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SideNav({ onClose }: { onClose: () => void }) {
  const s = useRpos();
  const user = currentUser(s);
  const loc = useLocation();
  const view = new URLSearchParams(loc.searchStr).get("view");
  const activeId = NAV.find((n) => (n.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.to)))?.id;
  const [open, setOpen] = useState<string | undefined>(activeId);
  useEffect(() => setOpen(activeId), [activeId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">R</span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-bold tracking-tight">RPOS</span>
            <span className="block text-[10px] text-sidebar-foreground/60">Renewable Project OS</span>
          </span>
        </Link>
        <button className="lg:hidden" aria-label="Close" onClick={onClose}><X className="size-4" /></button>
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((n, i) => {
          const allowed = user.modules.includes(n.id);
          const active = activeId === n.id;
          const Icon = n.icon;
          if (!allowed)
            return (
              <div key={n.id} title={`Not available for ${user.name}`} className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-sidebar-foreground/30">
                <span className="w-4 text-[10px] tabular-nums">{i + 1}</span>
                <Icon className="size-4" /> <span className="flex-1 truncate">{n.label}</span> <Lock className="size-3" />
              </div>
            );
          return (
            <div key={n.id}>
              <div className={cn("flex items-center rounded-md", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60")}>
                <Link to={n.to} className="flex flex-1 items-center gap-2.5 px-2.5 py-1.5 text-[13px] font-medium">
                  <span className="w-4 text-[10px] tabular-nums text-sidebar-foreground/50">{i + 1}</span>
                  <Icon className={cn("size-4", active && "text-sidebar-primary")} />
                  <span className="truncate">{n.label}</span>
                </Link>
                {n.views.length > 0 && (
                  <button aria-label={`Expand ${n.label}`} aria-expanded={open === n.id} onClick={() => setOpen(open === n.id ? undefined : n.id)} className="px-2 py-1.5 text-sidebar-foreground/60 hover:text-sidebar-foreground">
                    <ChevronDown className={cn("size-3.5 transition", open === n.id && "rotate-180")} />
                  </button>
                )}
              </div>
              {open === n.id && n.views.length > 0 && (
                <ul className="mb-1 ml-8 mt-0.5 border-l border-sidebar-border">
                  {n.views.map((v) => (
                    <li key={v.id}>
                      <Link to={n.to} search={{ view: v.id } as never} className={cn("block truncate py-1 pl-3 pr-2 text-xs", active && view === v.id ? "font-semibold text-sidebar-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
                        {v.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3 text-[11px] text-sidebar-foreground/60">
        Viewing as <b className="text-sidebar-foreground">{user.name}</b>
        <br />UI prototype · mock data
      </div>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const s = useRpos();
  const user = currentUser(s);
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  const portfolios = s.portfolios.filter((p) => s.orgId === "all" || p.orgId === s.orgId);
  const projects = s.projects.filter((p) => s.portfolioId === "all" ? portfolios.some((pf) => pf.id === p.portfolioId) : p.portfolioId === s.portfolioId);
  const unread = s.notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur md:px-5">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={onMenu}><Menu className="size-4" /></Button>
      <div className="hidden items-center gap-1.5 md:flex">
        <Ctx label="Organisation" value={s.orgId} onChange={(v) => actions.setContext({ orgId: v, portfolioId: "all", projectId: "all" })} options={[["all", "All organisations"], ...s.organisations.map((o) => [o.id, o.name])]} />
        <Ctx label="Portfolio" value={s.portfolioId} onChange={(v) => actions.setContext({ portfolioId: v, projectId: "all" })} options={[["all", "All portfolios"], ...portfolios.map((p) => [p.id, p.name])]} />
        <Ctx label="Project" value={s.projectId} onChange={(v) => actions.setContext({ projectId: v })} options={[["all", "All projects"], ...projects.map((p) => [p.id, p.name])]} />
      </div>
      <button onClick={() => setSearchOpen(true)} className="ml-auto flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-xs text-muted-foreground hover:border-primary md:w-64">
        <Search className="size-3.5" /> <span className="hidden md:inline">Search RPOS…</span>
        <kbd className="ml-auto hidden rounded border px-1 text-[10px] md:inline">⌘K</kbd>
      </button>
      <Popover onOpenChange={(o) => !o && unread && actions.markNotificationsRead()}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Notifications (${unread} unread)`} className="relative">
            <Bell className="size-4" />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">{unread}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="border-b px-3 py-2 font-display text-sm font-semibold">Notifications</div>
          <ul className="max-h-80 divide-y overflow-y-auto">
            {s.notifications.map((n) => (
              <li key={n.id}>
                <button onClick={() => n.href && navigate({ to: n.href })} className={cn("block w-full px-3 py-2 text-left text-xs hover:bg-accent", !n.read && "bg-primary-soft")}>
                  {n.text}
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">{n.at}</span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Help and support"><HelpCircle className="size-4" /></Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-2 text-xs">
          <p className="font-display text-sm font-semibold">Help & support</p>
          <p className="text-muted-foreground">RPOS guides organisations from readiness through activation, delivery and assurance. Use the selectors to change context; press ⌘K to search any record.</p>
          <p className="text-muted-foreground">Every AI output is labelled and requires human approval before it changes a register.</p>
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="icon" aria-label="Toggle dark mode" onClick={() => setDark(!dark)}>{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted" aria-label="User profile">
            <span className="grid size-7 place-items-center rounded-full bg-navy text-[11px] font-bold text-navy-foreground">{user.person.split(" ").map((x) => x[0]).slice(-2).join("")}</span>
            <span className="hidden text-left leading-tight xl:block">
              <span className="block text-xs font-semibold">{user.person}</span>
              <span className="block text-[10px] text-muted-foreground">{user.name}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Switch demo role</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={s.roleId} onValueChange={(v) => actions.setContext({ roleId: v as RoleId })}>
            {ROLES.map((r) => (
              <DropdownMenuRadioItem key={r.id} value={r.id} className="text-xs">
                {r.name} <span className="ml-auto text-[10px] text-muted-foreground">{r.person}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/admin", search: { view: "notifications" } })}>Notification preferences</DropdownMenuItem>
          {user.modules.includes("admin") && <DropdownMenuItem onClick={() => navigate({ to: "/admin", search: { view: "settings" } })}>Settings</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

function Ctx({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-8 max-w-48 border-transparent bg-muted text-xs font-semibold hover:border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useRpos();
  const navigate = useNavigate();
  const go = (fn: () => void) => { onOpenChange(false); fn(); };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search projects, risks, evidence, decisions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Projects">
          {s.projects.map((p) => (
            <CommandItem key={p.id} value={`${p.id} ${p.name}`} onSelect={() => go(() => navigate({ to: "/projects/$id", params: { id: p.id } }))}>
              {p.name} <span className="ml-auto text-xs text-muted-foreground">{p.technology}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Modules">
          {NAV.map((n) => (
            <CommandItem key={n.id} value={`module ${n.label}`} onSelect={() => go(() => navigate({ to: n.to }))}>{n.label}</CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Records">
          {s.records.slice(0, 400).map((r) => (
            <CommandItem key={r.id} value={`${r.id} ${r.title}`} onSelect={() => go(() => navigate({ to: "/records/$id", params: { id: r.id } }))}>
              <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span> {r.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
