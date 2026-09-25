"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { SortableTh } from "@/components/ui/SortableTh";
import { useSort } from "@/lib/useSort";
import { applySort, compareStrings } from "@/lib/sort";
import { parseUserAgent } from "@/lib/user-agent";

export interface LoginEventRow {
  id: string;
  createdAt: string;
  event: "logowanie" | "blad_logowania" | "wylogowanie";
  userId: string | null;
  email: string | null;
  fullName: string | null;
  ip: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  reason: string | null;
}

type SortKey = "createdAt" | "user" | "event" | "ip" | "browser" | "place";

const EVENT_LABELS: Record<LoginEventRow["event"], string> = {
  logowanie: "Zalogowano",
  blad_logowania: "Nieudane logowanie",
  wylogowanie: "Wylogowano",
};

const PAGE_SIZE = 50;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function placeOf(e: LoginEventRow): string {
  return [e.city, e.country].filter(Boolean).join(", ");
}

function userLabel(e: LoginEventRow): string {
  return e.fullName ? `${e.fullName} (${e.email ?? "—"})` : (e.email ?? "—");
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "danger" && value > 0 ? "text-danger" : ""}`}>{value}</p>
    </div>
  );
}

export function SesjeLogowanClient({
  events,
  loadError,
  limit,
}: {
  events: LoginEventRow[];
  loadError: boolean;
  limit: number;
}) {
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("createdAt", "desc");
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<string[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [now] = useState(() => Date.now());

  // Podsumowanie z ostatnich 24 godzin i lista kont (do filtra i tabeli "ostatnie logowanie").
  const { summary, users } = useMemo(() => {
    const dayAgo = now - 24 * 60 * 60 * 1000;
    let logins = 0;
    let failures = 0;
    const activeUsers = new Set<string>();
    const byUser = new Map<
      string,
      { key: string; label: string; lastLogin: string | null; lastIp: string | null; count: number }
    >();

    for (const e of events) {
      const recent = new Date(e.createdAt).getTime() >= dayAgo;
      if (recent && e.event === "logowanie") {
        logins += 1;
        activeUsers.add(e.userId ?? e.email ?? e.id);
      }
      if (recent && e.event === "blad_logowania") failures += 1;

      if (e.event === "logowanie") {
        const key = e.userId ?? e.email ?? e.id;
        const entry = byUser.get(key) ?? { key, label: userLabel(e), lastLogin: null, lastIp: null, count: 0 };
        entry.count += 1;
        // events są posortowane od najnowszych, więc pierwsze trafienie to ostatnie logowanie
        if (!entry.lastLogin) {
          entry.lastLogin = e.createdAt;
          entry.lastIp = e.ip;
        }
        byUser.set(key, entry);
      }
    }
    return {
      summary: { logins, failures, activeUsers: activeUsers.size },
      users: Array.from(byUser.values()).sort((a, b) => compareStrings(a.label, b.label)),
    };
  }, [events, now]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (eventFilter.length > 0 && !eventFilter.includes(e.event)) return false;
      if (userFilter.length > 0 && !userFilter.includes(e.userId ?? e.email ?? e.id)) return false;
      if (q) {
        const ua = parseUserAgent(e.userAgent);
        const haystack = [e.fullName, e.email, e.ip, e.city, e.country, ua.browser, ua.os, e.reason]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, query, eventFilter, userFilter]);

  const sorted = useMemo(() => {
    const comparators: Record<string, (a: LoginEventRow, b: LoginEventRow) => number> = {
      createdAt: (a, b) => compareStrings(a.createdAt, b.createdAt),
      user: (a, b) => compareStrings(userLabel(a), userLabel(b)),
      event: (a, b) => compareStrings(EVENT_LABELS[a.event], EVENT_LABELS[b.event]),
      ip: (a, b) => compareStrings(a.ip ?? "", b.ip ?? ""),
      browser: (a, b) =>
        compareStrings(parseUserAgent(a.userAgent).browser, parseUserAgent(b.userAgent).browser),
      place: (a, b) => compareStrings(placeOf(a), placeOf(b)),
    };
    return applySort(filtered, sortKey, sortDir, comparators);
  }, [filtered, sortKey, sortDir]);

  const shown = sorted.slice(0, visible);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Sesje logowań</h1>
        <p className="text-sm text-muted">
          Dziennik logowań do systemu: udane i nieudane próby oraz wylogowania — z adresem IP,
          przeglądarką, systemem i przybliżoną lokalizacją. Widoczny tylko dla administratora.
          Pokazuje ostatnie {limit} zdarzeń.
        </p>
      </div>

      {loadError && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          Nie udało się wczytać dziennika (czy uruchomiono migrację 0041?).
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Logowania (24 h)" value={summary.logins} />
        <StatCard label="Aktywni użytkownicy (24 h)" value={summary.activeUsers} />
        <StatCard label="Nieudane próby (24 h)" value={summary.failures} tone="danger" />
        <StatCard label="Zdarzeń w dzienniku" value={events.length} />
      </div>

      {users.length > 0 && (
        <div className="rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Ostatnie logowanie kont</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2 font-medium">Użytkownik</th>
                  <th className="px-4 py-2 font-medium">Ostatnie logowanie</th>
                  <th className="px-4 py-2 font-medium">Ostatni adres IP</th>
                  <th className="px-4 py-2 font-medium">Liczba logowań</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.key} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{u.label}</td>
                    <td className="px-4 py-2" suppressHydrationWarning>
                      {u.lastLogin ? formatDateTime(u.lastLogin) : "—"}
                    </td>
                    <td className="px-4 py-2">{u.lastIp ?? "—"}</td>
                    <td className="px-4 py-2">{u.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Szukaj: użytkownik, e-mail, adres IP, miasto, przeglądarka…"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <MultiSelectFilter
          label="Zdarzenie"
          options={Object.entries(EVENT_LABELS).map(([value, label]) => ({ value, label }))}
          selected={eventFilter}
          onChange={(v) => {
            setEventFilter(v);
            setVisible(PAGE_SIZE);
          }}
        />
        <MultiSelectFilter
          label="Użytkownik"
          options={users.map((u) => ({ value: u.key, label: u.label }))}
          selected={userFilter}
          onChange={(v) => {
            setUserFilter(v);
            setVisible(PAGE_SIZE);
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
              <th className="w-10 px-3 py-2.5 font-medium">L.p.</th>
              <SortableTh label="Data i godzina" sortKey="createdAt" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="whitespace-nowrap px-3 py-2.5 font-medium" />
              <SortableTh label="Użytkownik" sortKey="user" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
              <SortableTh label="Zdarzenie" sortKey="event" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
              <SortableTh label="Adres IP" sortKey="ip" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
              <SortableTh label="Lokalizacja" sortKey="place" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
              <SortableTh label="Przeglądarka / system" sortKey="browser" currentKey={sortKey} direction={sortDir} onSort={(k) => toggleSort(k as SortKey)} className="px-3 py-2.5 font-medium" />
              <th className="px-3 py-2.5 font-medium">Szczegóły</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  Brak zdarzeń spełniających kryteria.
                </td>
              </tr>
            ) : (
              shown.map((e, i) => {
                const ua = parseUserAgent(e.userAgent);
                return (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-xs">{i + 1}</td>
                    <td className="whitespace-nowrap px-3 py-2" suppressHydrationWarning>
                      {formatDateTime(e.createdAt)}
                    </td>
                    <td className="px-3 py-2">{userLabel(e)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={e.event === "logowanie" ? "success" : e.event === "blad_logowania" ? "danger" : "default"}>
                        {EVENT_LABELS[e.event]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{e.ip ?? "—"}</td>
                    <td className="px-3 py-2">{placeOf(e) || "—"}</td>
                    <td className="px-3 py-2" title={e.userAgent ?? undefined}>
                      {ua.browser} · {ua.os} · {ua.device}
                    </td>
                    <td className="px-3 py-2 text-muted">{e.reason ?? ""}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Pokazano {shown.length} z {sorted.length}
        </span>
        {shown.length < sorted.length && (
          <Button variant="secondary" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Pokaż więcej
          </Button>
        )}
      </div>
    </div>
  );
}
