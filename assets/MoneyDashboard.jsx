import React from "react";

const edgeTeams = [
  {
    team: "ATL",
    name: "Atlanta Braves",
    grade: "A+",
    fire: "🔥🔥🔥🔥🔥",
    note: "Elite stack spot",
    score: "96.4",
    opp: "vs MIA",
  },
  {
    team: "LAD",
    name: "Los Angeles Dodgers",
    grade: "A",
    fire: "🔥🔥🔥🔥½",
    note: "Ceiling spot",
    score: "93.1",
    opp: "vs COL",
  },
  {
    team: "NYY",
    name: "New York Yankees",
    grade: "A",
    fire: "🔥🔥🔥🔥½",
    note: "Power environment",
    score: "91.7",
    opp: "vs TOR",
  },
];

const stacks = [
  {
    title: "Nuclear Stack #1",
    team: "LAD 1-5",
    summary: "Attack weak bullpen • hard-hit upside • elite run environment",
    score: "94/99",
  },
  {
    title: "Nuclear Stack #2",
    team: "ATL 2-6",
    summary: "Reverse split edge • elevated total • leverage path in GPP",
    score: "92/99",
  },
];

const hitters = [
  { name: "Acuna Jr.", tag: "Power + Speed", grade: "A+" },
  { name: "Ohtani", tag: "Nuke ceiling", grade: "A+" },
  { name: "Judge", tag: "HR pressure", grade: "A" },
  { name: "Olson", tag: "Fly-ball smash", grade: "A" },
];

const signals = [
  "Top park boost: LAD game",
  "Bullpen meltdown risk: MIA",
  "Wind boost: +12% HR carry",
  "Sharp money leaning over",
];

export default function MoneyDashboard() {
  return (
    <div className="min-h-screen bg-[#05070b] text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(234,179,8,0.14),transparent_22%)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10">
        <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-1 text-sm tracking-[0.25em] text-emerald-300 uppercase">
              Money Mode Activated
            </div>
            <h1 className="text-5xl font-black tracking-tight md:text-7xl">
              <span className="bg-gradient-to-r from-emerald-300 via-green-400 to-amber-300 bg-clip-text text-transparent">
                ALLDAY MLB EDGE
              </span>
            </h1>
            <p className="mt-4 max-w-3xl text-base text-zinc-300 md:text-xl">
              Real-Time DFS Weapon • Stack Engine • Live Pressure Signals •
              Edge Grades that look like money.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:w-[360px]">
            {[
              ["Win Rate", "Top 1% Focus"],
              ["Mode", "GPP KILLER"],
              ["Signal", "LIVE"],
              ["Status", "UNHINGED"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.08)]"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  {k}
                </div>
                <div className="mt-2 text-lg font-bold text-emerald-300">{v}</div>
              </div>
            ))}
          </div>
        </header>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.45fr_0.9fr]">
          <div className="rounded-[28px] border border-emerald-400/15 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6 shadow-[0_0_80px_rgba(34,197,94,0.12)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.3em] text-zinc-400">
                  Edge Board
                </div>
                <h2 className="mt-2 text-3xl font-extrabold">Top Attack Spots</h2>
              </div>
              <div className="rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300">
                Exportable Rankings
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {edgeTeams.map((team) => (
                <div
                  key={team.team}
                  className="group rounded-[24px] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-300/40 hover:shadow-[0_0_35px_rgba(16,185,129,0.18)]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm tracking-[0.25em] text-zinc-400 uppercase">
                        {team.team}
                      </div>
                      <h3 className="mt-2 text-2xl font-extrabold">{team.name}</h3>
                    </div>
                    <div className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-right">
                      <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                        Score
                      </div>
                      <div className="text-lg font-black text-emerald-300">{team.score}</div>
                    </div>
                  </div>

                  <div className="mt-6 text-3xl font-black text-emerald-300">
                    {team.grade}
                  </div>
                  <div className="mt-1 text-lg">{team.fire}</div>
                  <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
                    <span>{team.note}</span>
                    <span>{team.opp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-amber-300/15 bg-gradient-to-b from-[#101318] to-[#07090d] p-6 shadow-[0_0_60px_rgba(245,158,11,0.10)]">
            <div className="text-sm uppercase tracking-[0.3em] text-zinc-400">
              ⚡ AI Picks
            </div>
            <h2 className="mt-2 text-3xl font-extrabold">Sharp Pressure Panel</h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Claude + GPT Edge Sync</div>
                <div className="mt-2 text-2xl font-black text-emerald-300">
                  Top Stack: LAD
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Leverage Status</div>
                <div className="mt-2 text-2xl font-black text-amber-300">HIGH</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Game Environment</div>
                <div className="mt-2 text-2xl font-black">Wind Out + Bullpen Fragile</div>
              </div>
            </div>

            <button className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-green-300 to-amber-300 px-5 py-4 text-lg font-black text-black shadow-[0_18px_60px_rgba(16,185,129,0.28)] transition hover:scale-[1.02]">
              UNLOCK THE EDGE
            </button>
          </div>
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.3em] text-zinc-400">
                  Stack Lab
                </div>
                <h2 className="mt-2 text-3xl font-extrabold">Nuclear Stack Engine</h2>
              </div>
              <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                Ceiling Focus
              </div>
            </div>

            <div className="grid gap-4">
              {stacks.map((stack) => (
                <div
                  key={stack.title}
                  className="rounded-[24px] border border-emerald-400/15 bg-gradient-to-r from-emerald-400/8 to-amber-300/5 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                        {stack.title}
                      </div>
                      <div className="mt-2 text-2xl font-black">{stack.team}</div>
                      <p className="mt-2 text-zinc-300">{stack.summary}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-5 py-4 text-center">
                      <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                        Stack Score
                      </div>
                      <div className="mt-2 text-3xl font-black text-amber-300">
                        {stack.score}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-zinc-950 to-zinc-900 p-6">
            <div className="text-sm uppercase tracking-[0.3em] text-zinc-400">
              Hitter Lab
            </div>
            <h2 className="mt-2 text-3xl font-extrabold">Power Bats</h2>

            <div className="mt-5 grid gap-3">
              {hitters.map((h) => (
                <div
                  key={h.name}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div>
                    <div className="text-lg font-bold">{h.name}</div>
                    <div className="text-sm text-zinc-400">{h.tag}</div>
                  </div>
                  <div className="rounded-full bg-emerald-500/10 px-4 py-2 font-black text-emerald-300">
                    {h.grade}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-sm uppercase tracking-[0.3em] text-zinc-400">
              Live Odds + Weather
            </div>
            <h2 className="mt-2 text-3xl font-extrabold">Market Fuel</h2>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-zinc-400">Implied Team Total</div>
                <div className="mt-2 text-3xl font-black text-emerald-300">5.9</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-zinc-400">Wind</div>
                <div className="mt-2 text-3xl font-black text-amber-300">12 MPH Out</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-zinc-400">Moneyline</div>
                <div className="mt-2 text-3xl font-black">-178</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-zinc-400">Total</div>
                <div className="mt-2 text-3xl font-black">9.5</div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-400/15 bg-gradient-to-br from-emerald-500/10 to-amber-300/5 p-6 shadow-[0_0_70px_rgba(16,185,129,0.10)]">
            <div className="text-sm uppercase tracking-[0.3em] text-zinc-400">
              Signals
            </div>
            <h2 className="mt-2 text-3xl font-extrabold">Slate Pressure Points</h2>

            <div className="mt-5 grid gap-3">
              {signals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 text-lg"
                >
                  {signal}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-amber-300/20 bg-black/25 p-5">
              <div className="text-sm uppercase tracking-[0.25em] text-zinc-400">
                Close Strong
              </div>
              <p className="mt-3 text-xl font-semibold text-zinc-100">
                Build lineups that feel like sharp money — not guesswork.
              </p>
              <p className="mt-2 text-zinc-300">
                This screen is designed to make users think one thing fast:
                there is money on this slate and this tool knows where it is.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
