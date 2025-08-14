import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Top Gear–style freestanding leaderboard
 * ------------------------------------------------------------
 * • Weekly window: Sunday 00:00 → next Sunday 00:00 (local tz)
 * • Fetches laps from the provided API
 * • Groups by Car @ Track for the week and shows the selected combo
 * • Nicer, freestanding look with a "board on a stand" aesthetic
 *
 * CORS NOTE
 * If you see "Failed to fetch" in the browser, the public endpoint is likely
 * blocking cross‑origin requests. In that case, proxy the request (examples):
 * 1) Next.js route (pages/api/laps.ts)
 *    export default async function handler(req, res) {
 *      const r = await fetch("https://aronday.tines.com/api/public/murder-trials");
 *      const data = await r.json();
 *      res.setHeader("Access-Control-Allow-Origin", "*");
 *      res.status(200).json(data);
 *    }
 *    Then set `proxyUrl` to "/api/laps".
 *
 * 2) Cloudflare Worker (very similar) — return JSON with CORS header.
 *
 * This component supports an optional `proxyUrl` prop if you want to pass your
 * server route. If omitted, it calls the public API directly.
 */

export default function TopGearLeaderboard({ proxyUrl, logoUrl, logoAlt = "Logo" }: { proxyUrl?: string; logoUrl?: string; logoAlt?: string }) {
  const API_URL = "https://aronday.tines.com/api/public/murder-trials";

  // ---- State ----
  const [raw, setRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedKey, setSelectedKey] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [usedDemo, setUsedDemo] = useState(false);

  // ---- Fetch ----
  async function fetchData({ allowDemoFallback = false }: { allowDemoFallback?: boolean } = {}) {
    const url = proxyUrl || API_URL;
    try {
      setLoading(true);
      setError("");
      setUsedDemo(false);
      const res = await fetch(url + (url.includes("?") ? "&" : "?") + `cb=${Date.now()}`, {
        headers: { Accept: "application/json" },
        mode: "cors",
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error("Unexpected response shape");
      setRaw(json);
      setLastFetchedAt(new Date());
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
      // Optional demo so the UI is previewable when CORS blocks fetch
      if (allowDemoFallback) {
        const demo = [
          {
            fullName: "Aron Day",
            lapTime: "58.8125",
            driverRating: "1892",
            eventId: "01K2MVHA0SVZW8ERD31WSBBY33",
            lapId: "01K2MVWYJYV0J7MJVAQ9YAX410",
            trackTemp: "27",
            trackUsage: "28",
            fuelUsed: "0.6845195",
            carId: "145",
            carName: "Toyota GR86",
            trackName: "Lime Rock Park",
            trackId: "31",
            startTime: new Date().toISOString(),
          },
          {
            fullName: "Jane Driver",
            lapTime: "59.103",
            driverRating: "2101",
            lapId: "demo-2",
            trackTemp: "27",
            trackUsage: "29",
            carId: "145",
            carName: "Toyota GR86",
            trackName: "Lime Rock Park",
            trackId: "31",
            startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          },
          {
            fullName: "Max Speedman",
            lapTime: "60.245",
            driverRating: "1705",
            lapId: "demo-3",
            trackTemp: "27",
            trackUsage: "26",
            carId: "145",
            carName: "Toyota GR86",
            trackName: "Lime Rock Park",
            trackId: "31",
            startTime: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
          },
        ];
        setRaw(demo);
        setUsedDemo(true);
        setLastFetchedAt(new Date());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Try normal fetch; if it fails, auto-enable demo so you can see the UI
    fetchData({ allowDemoFallback: true });
    const id = setInterval(() => fetchData(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [proxyUrl]);

  // ---- Helpers ----
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  const formatLap = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    const secs = Math.floor(seconds);
    const millis = Math.round((seconds - secs) * 1000);
    return `${minutes}:${pad(secs, 2)}.${pad(millis, 3)}`;
  };
  const parseLapTime = (str: string): number => {
    const n = parseFloat(str);
    return Number.isFinite(n) ? n : NaN;
  };
  function weekBounds(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sun
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day);
    const endExclusive = new Date(start);
    endExclusive.setDate(endExclusive.getDate() + 7);
    return { start, endExclusive };
  }

  // ---- Normalize & filter to this week ----
  type Lap = {
    fullName: string;
    lapTime: number;
    driverRating?: number | null;
    eventId?: string;
    lapId?: string;
    trackTemp?: number | null;
    trackUsage?: number | null;
    fuelUsed?: number | null;
    carId?: string;
    carName: string;
    trackName: string;
    trackId?: string;
    startTime: Date;
  };

  const laps: Lap[] = useMemo(() => {
    return raw
      .map((r: any) => ({
        fullName: r.fullName ?? "",
        lapTime: parseLapTime(r.lapTime),
        driverRating: r.driverRating ? Number(r.driverRating) : null,
        eventId: r.eventId,
        lapId: r.lapId,
        trackTemp: r.trackTemp ? Number(r.trackTemp) : null,
        trackUsage: r.trackUsage ? Number(r.trackUsage) : null,
        fuelUsed: r.fuelUsed ? Number(r.fuelUsed) : null,
        carId: r.carId,
        carName: r.carName ?? "",
        trackName: r.trackName ?? "",
        trackId: r.trackId,
        startTime: new Date(r.startTime),
      }))
      .filter((r) => Number.isFinite(r.lapTime) && r.carName && r.trackName && !isNaN(r.startTime.getTime()));
  }, [raw]);

  const { start: weekStart, endExclusive: weekEnd } = useMemo(() => weekBounds(new Date()), []);
  const lapsThisWeek = useMemo(() => laps.filter((l) => l.startTime >= weekStart && l.startTime < weekEnd), [laps, weekStart, weekEnd]);

  type Combo = { key: string; carName: string; trackName: string; laps: Lap[] };
  const combos: Combo[] = useMemo(() => {
    const map = new Map<string, Combo>();
    for (const lap of lapsThisWeek) {
      const key = `${lap.carName}@@${lap.trackName}`;
      if (!map.has(key)) map.set(key, { key, carName: lap.carName, trackName: lap.trackName, laps: [] });
      map.get(key)!.laps.push(lap);
    }
    const list = Array.from(map.values());
    list.sort((a, b) => {
      const c = b.laps.length - a.laps.length;
      if (c) return c;
      const latestA = Math.max(...a.laps.map((l) => l.startTime.getTime()));
      const latestB = Math.max(...b.laps.map((l) => l.startTime.getTime()));
      return latestB - latestA;
    });
    return list;
  }, [lapsThisWeek]);

  useEffect(() => {
    if (combos.length && !selectedKey) setSelectedKey(combos[0].key);
    if (!combos.length) setSelectedKey("");
  }, [combos, selectedKey]);

  const selectedCombo = useMemo(() => combos.find((c) => c.key === selectedKey), [combos, selectedKey]);

  const rows = useMemo(() => {
    if (!selectedCombo) return [] as (Lap & { pos: number; delta?: number })[];
    const sorted = [...selectedCombo.laps].sort((a, b) => a.lapTime - b.lapTime);
    const leader = sorted[0]?.lapTime ?? 0;
    return sorted.map((lap, i) => ({ ...lap, pos: i + 1, delta: lap.lapTime - leader }));
  }, [selectedCombo]);

  const rangeLabel = useMemo(() => {
    const fmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const s = new Intl.DateTimeFormat(undefined, fmt).format(weekStart);
    const e = new Intl.DateTimeFormat(undefined, fmt).format(new Date(weekEnd.getTime() - 1));
    return `${s} – ${e}`;
  }, [weekStart, weekEnd]);

  // ---- UI ----
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-black text-slate-100 flex items-center justify-center p-6">
      <div className="relative w-full max-w-5xl">
        {/* shadow + stand to feel freestanding */}
        <div className="absolute inset-x-12 -bottom-8 h-10 bg-black/60 blur-2xl rounded-full"></div>
        <div className="absolute left-1/2 -bottom-24 -translate-x-1/2 pointer-events-none select-none">
          <div className="h-16 w-2 mx-auto rounded-full bg-gradient-to-b from-slate-600 to-slate-900 shadow-[0_0_30px_rgba(0,0,0,0.5)]" />
          <div className="mt-3 h-4 w-44 mx-auto rounded-md bg-slate-800/90 shadow-2xl border border-slate-700" />
        </div>

        {/* board */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur shadow-2xl">
          {/* top accent */}
          <div className="absolute inset-x-0 -top-24 h-32 bg-gradient-to-b from-yellow-400/20 via-yellow-400/0 to-transparent blur-2xl" />

          {/* header */}
          <div className="px-6 sm:px-8 pt-6">
            {/* centered top logo */}
            {logoUrl && (
              <div className="w-full flex justify-center py-6 sm:py-8">
                <img src={logoUrl} alt={logoAlt} className="h-14 sm:h-20 w-auto object-contain drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {logoUrl ? null : (
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-slate-900 font-black">TG</span>
                )}
                <div>
                  {/* <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Team M.U.R.D.E.R. Leaderboard</h1> */}
                  <p className="text-xs text-slate-400">Weekly (Sun→Sun) • {rangeLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {lastFetchedAt && (
                  <span className="text-slate-400 hidden sm:inline">Updated {new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(lastFetchedAt)}</span>
                )}
                <button
                  onClick={() => fetchData({ allowDemoFallback: false })}
                  className="rounded-full border border-slate-700 px-3 py-1.5 hover:bg-slate-800 active:scale-95 transition"
                  disabled={loading}
                  aria-label="Refresh"
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>

            {/* combo picker */}
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="uppercase tracking-widest text-[10px] text-slate-400">This Week's Combo</p>
                {selectedCombo ? (
                  <h2 className="mt-1 text-3xl sm:text-4xl font-extrabold">
                    <span className="text-yellow-400">{selectedCombo.carName}</span>
                    <span className="mx-2 text-slate-400">@</span>
                    <span className="text-cyan-400">{selectedCombo.trackName}</span>
                  </h2>
                ) : (
                  <h2 className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-400">No laps yet this week</h2>
                )}
                <p className="text-xs text-slate-500 mt-1">Next rotation begins Sunday • {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(weekEnd)}</p>
              </div>
              <div className="flex items-center gap-2">
                {combos.length > 1 && (
                  <label className="text-xs text-slate-400" htmlFor="comboSel">Choose combo</label>
                )}
                <select
                  id="comboSel"
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                >
                  {combos.length === 0 && <option value="">—</option>}
                  {combos.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.carName} @ {c.trackName} ({c.laps.length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* error helper */}
            {error && (
              <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
                <p className="font-semibold">{error.includes("Failed to fetch") ? "Fetch blocked (likely CORS)" : "Error"}</p>
                <p className="mt-1 opacity-90">
                  {error.includes("Failed to fetch")
                    ? "The browser couldn't reach the public endpoint due to cross‑origin policy. Pass a proxyUrl prop that points to your own server route (e.g. /api/laps) which forwards the request and adds CORS headers."
                    : error}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => fetchData({ allowDemoFallback: false })} className="rounded-lg border border-red-800/50 bg-red-900/30 px-3 py-1.5 text-red-100">Try again</button>
                  <button onClick={() => fetchData({ allowDemoFallback: true })} className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-slate-100">Load demo data</button>
                </div>
              </div>
            )}
          </div>

          {/* table */}
          {selectedCombo && (
            <div className="mt-6 px-2 sm:px-6 pb-8">
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
                <div className="grid grid-cols-12 gap-0 bg-slate-900/70 px-4 py-3 text-xs uppercase tracking-wider text-slate-400">
                  <div className="col-span-1">Pos</div>
                  <div className="col-span-5 sm:col-span-5">Driver</div>
                  <div className="col-span-3 sm:col-span-3">Lap</div>
                  <div className="col-span-3 sm:col-span-3">Δ</div>
                </div>
                <ol className="divide-y divide-slate-800/70">
                  <AnimatePresence initial={false}>
                    {rows.map((r) => (
                      <motion.li
                        key={r.lapId ?? r.fullName + r.lapTime}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className={[
                          "grid grid-cols-12 items-center px-4 py-3 text-base sm:text-lg",
                          r.pos === 1 ? "bg-yellow-400/10" :
                          r.pos === 2 ? "bg-slate-400/10" :
                          r.pos === 3 ? "bg-amber-800/10" : "",
                        ].join(" ")}
                      >
                        <div className="col-span-1 font-black tabular-nums">
                          <span className={[
                            "inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2",
                            r.pos === 1 ? "border-yellow-400 text-yellow-300" :
                            r.pos === 2 ? "border-slate-300 text-slate-200" :
                            r.pos === 3 ? "border-amber-500 text-amber-400" :
                            "border-slate-700 text-slate-300",
                          ].join(" ")}>{r.pos}</span>
                        </div>
                        <div className="col-span-5 sm:col-span-5 font-medium truncate">{r.fullName}</div>
                        <div className="col-span-3 sm:col-span-3 font-mono tabular-nums text-2xl">
                          {formatLap(r.lapTime)}
                        </div>
                        <div className="col-span-3 sm:col-span-3 font-mono tabular-nums text-slate-300">
                          {r.pos === 1 ? "—" : "+" + formatLap(r.delta || 0)}
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              </div>

              {/* meta */}
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-400">
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2">Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2">Week start: {weekStart.toLocaleString()}</div>
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2">Week end: {weekEnd.toLocaleString()}</div>
              </div>

              {usedDemo && (
                <div className="mt-4 rounded-lg border border-amber-600/40 bg-amber-900/20 px-3 py-2 text-amber-200 text-xs">
                  Showing demo data so you can see the UI. Add a proxyUrl to enable real fetching if the browser blocks CORS.
                </div>
              )}
            </div>
          )}

          {!selectedCombo && !loading && !error && (
            <div className="px-6 sm:px-8 pb-10 text-sm text-slate-300">No combos detected for this week yet.</div>
          )}

          <div className="px-6 sm:px-8 pb-8 text-[11px] text-slate-500">
            Built with React + Tailwind. Weekly board rotates every Sunday.
          </div>
        </div>
      </div>
    </div>
  );
}
