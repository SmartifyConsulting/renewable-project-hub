import { useCallback, useSyncExternalStore } from "react";

const KEY = "rpos:active-project";
const EVENT = "rpos:active-project-changed";

function subscribe(callback: () => void) {
 if (typeof window === "undefined") return () => {};
 window.addEventListener("storage", callback);
 window.addEventListener(EVENT, callback);
 return () => {
  window.removeEventListener("storage", callback);
  window.removeEventListener(EVENT, callback);
 };
}
function snapshot() {
 if (typeof window === "undefined") return "";
 try { return window.localStorage.getItem(KEY) ?? ""; } catch { return ""; }
}
function serverSnapshot() { return ""; }

/** Project preference is navigation context only; all access remains enforced by Supabase RLS. */
export function useActiveProject() {
 const projectId = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
 const setProjectId = useCallback((id: string) => {
  if (typeof window === "undefined") return;
  try {
   if (id) window.localStorage.setItem(KEY, id);
   else window.localStorage.removeItem(KEY);
   window.dispatchEvent(new Event(EVENT));
  } catch { /* Storage can be unavailable in private browsing. */ }
 }, []);
 return [projectId, setProjectId] as const;
}
