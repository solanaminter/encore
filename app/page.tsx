"use client";

import { useEffect, useState } from "react";

interface NightOut {
  persona: { id: string; name: string; age: number; bio: string };
  venue: { name: string; address: string; locality: string; affinity: number; rating: number | null; priceLevel: number | null; tagUrns: string[]; why: string[] };
  dining: { name: string; address: string; locality: string; affinity: number; rating: number | null; priceLevel: number | null; distanceKm: number | null; why: string[] };
  itinerary: { time: string; title: string; detail: string }[];
  budget: { estimate_usd: number; cap_usd: number; fits: boolean };
  practicalityRationale: string[];
  evidence: { signalsUsed: { artists: number; tags: string[]; venueFilterTags: string[] }; venueAffinity: number; diningAffinity: number; note: string };
  servedFrom?: string;
  note?: string;
}

const PERSONA_CARDS = [
  { id: "margaret", name: "Margaret", age: 74, blurb: "Jazz + old Hollywood · bad knees · $60 budget" },
  { id: "robert", name: "Robert", age: 68, blurb: "Classic rock + film noir · tight budget" },
  { id: "elena", name: "Elena", age: 72, blurb: "Salsa + Latin cinema · Spanish-language rooms" },
];

const LOOP_STAGES = [
  { title: "Taste profile", body: "60-second capture: artists, films, cuisines — plus mobility, budget, transport radius." },
  { title: "Qloo venue query", body: "Insights API with taste signals + genre tags. Returns real rooms with affinity scores." },
  { title: "Practicality filter", body: "Mobility, noise, and budget constraints re-rank the shortlist. Nothing silent — over-budget is flagged." },
  { title: "Dining query", body: "Cuisine signals near the venue. Closest taste-match that keeps the evening on budget." },
  { title: "One evening", body: "A single Saturday card: dinner, show, ride home. Nothing surfaces when affinity clears no bar." },
];

const GENERIC_PLAN = [
  "7:00 PM — Dinner at a highly-rated Italian restaurant downtown",
  "9:00 PM — Live music at a popular venue nearby",
  "Why: 'These are popular with people your age.'",
];

function AffinityBar({ value }: { value: number }) {
  return (
    <div className="affbar" title={`affinity ${value.toFixed(4)}`}>
      <div className="affbar-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      <span className="affbar-num">{value.toFixed(4)}</span>
    </div>
  );
}

export default function Home() {
  const [personaId, setPersonaId] = useState("margaret");
  const [data, setData] = useState<NightOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/night-out?persona=${personaId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [personaId]);

  return (
    <main className="wrap">
      <header className="hero">
        <div className="kicker">Encore · Qloo Agentic Hackathon</div>
        <h1>A taste-matched Saturday, for the people who raised us.</h1>
        <p className="lede">
          One in three older adults reports loneliness. Encore turns taste into companionship:
          a background agent that surfaces <em>one</em> “your weekend” card only when Qloo affinity
          clears the bar — a taste-matched show, dinner near the venue, the evening handled.
        </p>
      </header>

      <section className="picker">
        {PERSONA_CARDS.map((p) => (
          <button
            key={p.id}
            className={`pcard${personaId === p.id ? " active" : ""}`}
            onClick={() => setPersonaId(p.id)}
          >
            <div className="pcard-name">{p.name}, {p.age}</div>
            <div className="pcard-blurb">{p.blurb}</div>
          </button>
        ))}
      </section>

      {loading && <div className="status">Composing {personaId}’s evening…</div>}
      {error && <div className="status error">Couldn’t load the itinerary: {error}</div>}

      {data && !loading && (
        <>
          <section className="grid2">
            <article className="card">
              <div className="card-kicker">Dinner · 6:30 PM</div>
              <h2>{data.dining.name}</h2>
              <div className="meta">{data.dining.address || data.dining.locality}</div>
              <AffinityBar value={data.dining.affinity} />
              <ul className="why">{data.dining.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </article>
            <article className="card">
              <div className="card-kicker">Show · 8:30 PM</div>
              <h2>{data.venue.name}</h2>
              <div className="meta">{data.venue.address || data.venue.locality}</div>
              <AffinityBar value={data.venue.affinity} />
              <ul className="why">{data.venue.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </article>
          </section>

          <section className="card timeline">
            <div className="card-kicker">The evening</div>
            {data.itinerary.map((s, i) => (
              <div className="trow" key={i}>
                <div className="ttime">{s.time}</div>
                <div><strong>{s.title}</strong><div className="meta">{s.detail}</div></div>
              </div>
            ))}
            <div className={`budget${data.budget.fits ? " ok" : " over"}`}>
              Evening est. ${data.budget.estimate_usd} vs ${data.budget.cap_usd} budget —{" "}
              {data.budget.fits ? "fits comfortably." : "over budget, flagged honestly by the agent."}
            </div>
          </section>

          <section className="card">
            <div className="card-kicker">Practicality-filter rationale</div>
            <ul className="why">{data.practicalityRationale.map((r, i) => <li key={i}>{r}</li>)}</ul>
            <div className="meta dim">
              Served from {data.servedFrom === "live" ? "a live Qloo query" : "the cached Day-1 Qloo evidence"}
              {data.note ? ` — ${data.note}` : ""}. The API key lives in a server-side env var; the browser never sees it.
            </div>
          </section>

          <section className="loop">
            <div className="card-kicker">The Encore loop</div>
            <div className="stages">
              {LOOP_STAGES.map((s, i) => (
                <div className="stage" key={i}>
                  <div className="stage-n">{i + 1}</div>
                  <div className="stage-t">{s.title}</div>
                  <div className="stage-b">{s.body}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid2">
            <article className="card before">
              <div className="card-kicker">Generic LLM plan (no Qloo)</div>
              <ul className="why">{GENERIC_PLAN.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </article>
            <article className="card after">
              <div className="card-kicker">Qloo-grounded plan (this page)</div>
              <ul className="why">
                <li>Venue affinity <strong>{data.evidence.venueAffinity.toFixed(4)}</strong>, dining affinity <strong>{data.evidence.diningAffinity.toFixed(4)}</strong> — computed from taste, not vibes.</li>
                <li>Signals: {data.evidence.signalsUsed.artists} artist entities, tags {data.evidence.signalsUsed.tags.join(", ") || "—"}.</li>
                <li>Venue filter tags: {data.evidence.signalsUsed.venueFilterTags.join(", ") || "—"}.</li>
                <li>{data.evidence.note}</li>
              </ul>
            </article>
          </section>
        </>
      )}

      <footer className="foot">
        Encore · Purple Castle Ventures · built on the Qloo Taste AI API · demo data cached from live Day-1 queries
      </footer>
    </main>
  );
}
