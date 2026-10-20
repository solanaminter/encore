# Encore — 60–90s Narrated Demo Script (draft)

**Runtime:** ~80 seconds narration (~160 words). Voice: local Kokoro (`npx hyperframes tts`, voice `af_heart`, free). Rendered as end-to-end walkthrough + architecture section per the campaign video standard.

## Visual 1 (0:00–0:08) — Cold open
*On screen:* Title card "Encore", subtitle "A taste-driven night out for isolated older adults", Qloo Agentic Hackathon badge.

**Narration:** "Every year, millions of older adults want a night out — but they don't want a generic list of restaurants. They want a plan that fits their taste, their budget, and their body."

## Visual 2 (0:08–0:25) — Real demo: persona picker
*On screen:* Screen capture of the live Encore app (public Vercel demo). Cursor selects **Margaret, 74 — jazz, old Hollywood films, bad knees, $60 budget**.

**Narration:** "Meet Margaret. Seventy-four, loves jazz, bad knees, sixty-dollar budget. Instead of guessing, Encore asks Qloo — which has real taste-affinity data on every place in Los Angeles."

## Visual 3 (0:25–0:50) — Real demo: composed itinerary
*On screen:* Itinerary panel animates in: venue **Catalina Jazz Club (affinity 0.9245)**, dining **The Edmon (0.9203)**, budget line "est $75 vs $60 — flagged", practicality-rationale panel showing the standing-room lounge that was dropped for mobility.

**Narration:** "Encore composes the whole evening from live Qloo evidence. Catalina Jazz Club at ninety-two percent affinity. Dinner at The Edmon. And it tells the truth: this evening runs fifteen dollars over Margaret's budget — flagged, not hidden. A standing-room lounge was rejected outright because of her knees."

## Visual 4 (0:50–1:05) — Architecture section
*On screen:* Animated architecture diagram: Browser → `/api/night-out` (Vercel serverless) → Qloo Insights API (`hackathon.api.qloo.com`, affinity + tag URNs + price levels) → agent loop (mobility/noise hard filters → venue-plausibility → dining filter → budget-aware ranking) → cached itinerary.

**Narration:** "Under the hood: a Next.js app on Vercel. The browser never sees the API key — a serverless route calls Qloo's insights API for affinity scores and tag signals, then our agent loop applies mobility, noise, and budget filters with an explanation for every decision."

## Visual 5 (1:05–1:20) — Before/after + close
*On screen:* Split panel "Generic LLM plan" vs "Qloo evidence plan", then close card: live demo URL, GitHub repo, Purple Castle Ventures.

**Narration:** "A generic chatbot recommends the same five tourist spots to everyone. Encore recommends from evidence. Taste-matched, budget-honest, mobility-aware — a night out people will actually take."

## Shot list for the render leg
- Title card (motion-graphics, Encore wordmark + Qloo badge)
- Screen capture: persona picker → Margaret select (cursor or click highlight)
- Screen capture: itinerary panel reveal (scroll or staggered card animation)
- Animated architecture diagram (browser → serverless → Qloo API → agent loop → itinerary)
- Before/after split panel
- Close card (demo URL, repo, "Built by Purple Castle Ventures")
