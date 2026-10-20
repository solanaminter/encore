// GET /api/night-out?persona=<margaret|robert|elena>[&refresh=live]
//
// Route B (ARCHITECTURE.md): the browser never sees the Qloo key. Persona
// results ship from the cached slim seeds (data/slim.json, built Day 1);
// an optional live refresh hits the raw REST API server-side with the key
// from the QLOO_API_KEY env var only.
import { NextRequest, NextResponse } from "next/server";
import { getPersona } from "@/lib/personas";
import { getSeeds, type PlaceSeed, type PersonaSeeds } from "@/lib/seeds";
import { composeNightOut } from "@/lib/agent";

const BASE_URL = "https://hackathon.api.qloo.com";
const LIVE_TTL_MS = 10 * 60 * 1000;
const liveCache = new Map<string, { at: number; seeds: PersonaSeeds }>();

function slimRaw(raw: any): PlaceSeed {
  return {
    name: raw.name ?? "",
    entity_id: raw.entity_id ?? "",
    affinity: raw?.query?.affinity ?? 0,
    popularity: raw.popularity ?? 0,
    lat: raw?.location?.lat ?? null,
    lon: raw?.location?.lon ?? null,
    address: raw?.properties?.address ?? "",
    locality: raw?.properties?.locality ?? "",
    price_level: raw?.properties?.price_level ?? null,
    business_rating: raw?.properties?.business_rating ?? null,
    tags: (raw.tags ?? []).map((t: any) => ({ id: t.id, name: t.name })),
  };
}

async function fetchInsights(params: Record<string, string>, apiKey: string): Promise<PlaceSeed[]> {
  const qs = new URLSearchParams({ "filter.type": "urn:entity:place", take: "8", sort_by: "affinity", ...params });
  const res = await fetch(`${BASE_URL}/v2/insights?${qs.toString()}`, {
    headers: { "X-Api-Key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Qloo insights ${res.status}`);
  const body = await res.json();
  return (body.results ?? []).map(slimRaw);
}

async function liveSeeds(personaId: string, apiKey: string): Promise<PersonaSeeds> {
  const hit = liveCache.get(personaId);
  if (hit && Date.now() - hit.at < LIVE_TTL_MS) return hit.seeds;

  const p = getPersona(personaId);
  const venueParams: Record<string, string> = {
    "filter.location.query": p.constraints.location,
  };
  if (p.signals.artist_entity_ids.length || p.signals.person_entity_ids.length) {
    venueParams["signal.interests.entities"] = [
      ...p.signals.artist_entity_ids,
      ...p.signals.person_entity_ids,
    ].join(",");
  }
  const venueTags = [...p.signals.music_tag_urns, ...p.signals.venue_filter_tag_urns];
  if (venueTags.length) venueParams["signal.interests.tags"] = venueTags.join(",");
  if (p.signals.venue_filter_tag_urns.length) {
    venueParams["filter.tags"] = p.signals.venue_filter_tag_urns.join(",");
  }

  const diningParams: Record<string, string> = {
    "filter.location.query": p.constraints.location,
  };
  if (p.signals.cuisine_tag_urns.length) {
    diningParams["signal.interests.tags"] = p.signals.cuisine_tag_urns.join(",");
  }

  const [venues, dining] = await Promise.all([
    fetchInsights(venueParams, apiKey),
    fetchInsights(diningParams, apiKey),
  ]);
  const seeds = { venues, dining };
  liveCache.set(personaId, { at: Date.now(), seeds });
  return seeds;
}

export async function GET(req: NextRequest) {
  const personaId = req.nextUrl.searchParams.get("persona") ?? "margaret";
  try {
    const profile = getPersona(personaId);
    let seeds: PersonaSeeds = getSeeds(personaId);
    let servedFrom: "cache" | "live" = "cache";
    let note: string | undefined;

    if (req.nextUrl.searchParams.get("refresh") === "live") {
      const apiKey = process.env.QLOO_API_KEY;
      if (apiKey) {
        try {
          seeds = await liveSeeds(personaId, apiKey);
          servedFrom = "live";
        } catch (e) {
          note = `live refresh failed (${e instanceof Error ? e.message : "unknown"}); served from cache`;
        }
      } else {
        note = "QLOO_API_KEY not set on the server; served from cache";
      }
    }

    const nightOut = composeNightOut(profile, seeds.venues, seeds.dining);
    return NextResponse.json({ ...nightOut, cached: servedFrom === "cache", servedFrom, note });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown error" },
      { status: 400 }
    );
  }
}
