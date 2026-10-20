# Encore — Architecture Decision (Day 1)

Decision: **Route B** — Next.js on Vercel, with Vercel serverless functions as the
Qloo backend, calling the raw REST API.

## The routes considered

- **Route A:** Vercel frontend + backend container (e.g. Modal) running the
  `@qloo/qloo-harness` package long-lived; frontend calls the backend.
- **Route B:** Vercel frontend + Vercel serverless route handlers calling
  `GET https://hackathon.api.qloo.com/v2/insights?...` directly, with the key in
  an `X-Api-Key` header from a server-side env var (`QLOO_API_KEY`).

## Why Route B

1. The kit's "serverless is not a supported route" warning applies to `qloo mcp`
   (a stdio server needing a long-lived process) — not to plain HTTPS calls.
   The official docs document the raw REST endpoint as the norm for GET insights
   calls, with `X-Api-Key` auth and the hackathon base URL. This is a supported
   pattern, not a workaround.
2. One deploy target (`vercel deploy`) instead of two — no container to keep
   warm, no wake latency on demo night, no extra failure domain.
3. The serverless route still satisfies the security constraint the kit cares
   about: the key lives in a server-side env var and the browser never sees it.
4. Quota protection comes from a server-side cache, not from infrastructure:
   persona results are pre-computed and cached once (`../seeds/`), served from
   the route; live calls are bounded (one insights call per user action) and
   cached in-memory with a TTL.
5. The harness stays a **dev-time** tool: `@qloo/qloo-harness` is used for recon,
   seed generation, and `--dry-run` envelope checks — exactly as Day 1 used it.
   It is not installed at runtime.

## The request flow

```
Browser (persona select / taste capture)
  → GET/POST /api/night-out?persona=<id>        (Vercel serverless, Node 22+)
  → server-side: check cache → if miss,
     GET https://hackathon.api.qloo.com/v2/insights
       ?filter.type=urn:entity:place
       &signal.interests.entities=<ids>
       &signal.interests.tags=<tag URNs>
       &filter.location.query=<persona location>
       &take=8&sort_by=affinity
     header: X-Api-Key: $QLOO_API_KEY
  → respond with { venue, dining, itinerary, evidence: { affinity, tagUrns } }
```

The "before" (generic-LLM plan) is static authored content; the "after" panel
renders live Qloo evidence: per-venue `query.affinity` scores, popularity, and
the tag URNs that produced the match. This is the load-bearing-Qloo argument
the Technology Implementation criterion demands.

## Day-1 facts that locked this in

- Hackathon keys 401 on `https://api.qloo.com` and work on
  `https://hackathon.api.qloo.com` — the harness needed
  `qloo config set base-url https://hackathon.api.qloo.com` (documented so the
  build VM stays correct).
- Harness `insights` output carries affinity at `query.affinity` (not top-level
  `affinity`) — the server route will read that field.
- Venue leg proven: `urn:tag:genre:music:jazz` signal +
  `urn:tag:genre:place:jazz_club` filter resolves real LA jazz clubs
  (Catalina Jazz Club, affinity 1.0; The Baked Potato; Seabird Jazz Lounge).
- Dining leg proven: cuisine-tag signals near the venue return real restaurants
  with ratings and price levels (Osteria Mozza 0.9776; Musso & Frank Grill
  0.9111 — an old-Hollywood room, perfect for Margaret).
