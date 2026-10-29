# Encore

**Live Demo:** https://encore-beta-ten.vercel.app
**Demo Video (Public):** https://www.youtube.com/watch?v=XdXskJzQKpg

A taste-matched night out for isolated older adults — Qloo Agentic Hackathon entry
(Purple Castle Ventures).

**The idea.** One in three older adults reports loneliness. Encore turns taste into
companionship: a 60-second taste capture (artists you love, films, cuisines you
crave, plus practical constraints — mobility, budget, transport radius) becomes a
Qloo taste profile. A background agent runs weekly and surfaces **one "your
weekend" card only when affinity clears the bar** — a taste-matched live show,
dinner near the venue, and the itinerary handled. Nothing surfaces when nothing
clears the bar. Not an app you open; a ritual that finds you.

**The demo judges will actually click.** Pick a persona (e.g. Margaret, 74 —
loves jazz and old Hollywood, bad knees, $60 budget) and watch the agent assemble
her Saturday. Then the before/after: the generic-LLM night-out plan vs. the
Qloo-grounded plan, with **affinity scores and tag URNs shown as evidence**.
Qloo is load-bearing: remove it and the matching is vibes.

## Status

Day-1 API recon complete (2026-10-19): venue and dining legs proven Qloo-native
against the hackathon API. The slimmed Day-1 Qloo records ship in this repo
in `data/slim.json` (built by `scripts/slim-seeds.mjs`, served via
`lib/seeds.ts`); persona results ship from those cached records, and live
calls refresh them on demand.

## Quick start

```bash
npm install
# copy the Qloo hackathon API key into your environment (never commit it):
export QLOO_API_KEY=<your-hackathon-key>
npm run dev
```

The demo page calls the server route `/api/night-out`, which talks to
`https://hackathon.api.qloo.com/v2/insights` with the key in an `X-Api-Key`
header. The browser never sees the key. Persona results ship from the cached
seed files; live calls refresh them on demand.

## Taste-profile schema

Persona taste profiles are defined in `lib/personas.ts` (artists, films,
cuisines, plus mobility, budget, and transport-radius constraints) and matched
against the cached Qloo records in `data/slim.json`.
