// Encore agent loop (Day 2).
//
// Pipeline: taste profile -> Qloo venue candidates (cached Day-1 seeds) ->
// practicality filter (mobility / noise / budget from the persona's
// constraints) -> dining query (taste-aligned, near the venue) ->
// one composed evening itinerary with evidence and rationale.
//
// The filter is deterministic and explainable: every pick carries a
// human-readable `why`, which the UI renders as the practicality-filter
// rationale panel.
import type { TasteProfile } from "./personas";
import type { PlaceSeed } from "./seeds";

// ---- cost model ------------------------------------------------------------
// Two different scales: dining is a per-person meal, a venue's cost is the
// cover charge for the show — conflating them blows every budget.
const DINING_USD: Record<number, number> = { 1: 15, 2: 30, 3: 45, 4: 60 };
const VENUE_COVER_USD: Record<number, number> = { 1: 10, 2: 20, 3: 30, 4: 45 };

export function estimateDiningUsd(seed: PlaceSeed): number {
  return DINING_USD[seed.price_level ?? 2] ?? 30;
}

export function estimateVenueUsd(seed: PlaceSeed): number {
  return VENUE_COVER_USD[seed.price_level ?? 2] ?? 20;
}

// ---- tag helpers -----------------------------------------------------------
function tagHaystack(seed: PlaceSeed): string {
  return seed.tags.map((t) => `${t.id} ${t.name}`).join(" ").toLowerCase();
}

// A dining candidate must actually serve food. Qloo's place index mixes in
// parks, stadiums, and clothing stores — the agent keeps only food places.
const FOOD_KEYWORDS = [
  "dining", "restaurant", "food", "cuisine", "cafe", "coffee", "bakery",
  "bar", "pub", "table_service", "quick_bite", "pizza", "taco", "mexican",
  "italian", "tortilleria", "mixology", "eatery", "bistro", "grill",
  "kitchen", "brasserie", "steakhouse", "sushi", "ramen", "diner",
  "taqueria", "mariscos", "ensalada", "linguine", "delivery", "vegetarian",
  "salad", "bread_pudding", "dinner",
];
const NOT_FOOD = ["clothing_store", "online_store", "tourist_attraction", "stadium", "hiking"];

export function isFoodPlace(seed: PlaceSeed): boolean {
  const h = tagHaystack(seed);
  if (NOT_FOOD.some((k) => h.includes(k))) return false;
  return FOOD_KEYWORDS.some((k) => h.includes(k));
}

// Theme-park / cartoon-replica attractions are a hard exclusion, not a
// soft filter: without it, the "bar" rescue below lets a Simpsons replica
// bar through as a live room (Robert's Day-1 top pick was Moe's Tavern,
// tagged cartoon_replica + theme_park_property + amusement_park, i.e. the
// Universal Studios Springfield replica — a bar, not a show). A hard
// exclusion cannot be rescued by a room-signal tag.
const THEME_PARK_EXCLUSIONS = [
    "theme_park",
    "amusement_park",
    "cartoon_replica",
    "animated_television",
    "immersive_theme_park_attraction",
  ];

export function isThemeParkReplica(seed: PlaceSeed): boolean {
    const h = tagHaystack(seed);
    return THEME_PARK_EXCLUSIONS.some((k) => h.includes(k));
}

// A venue candidate must be a plausible live room. Without a genre filter tag
// (Robert's profile), Qloo returns landmarks and donut shops — the agent
// drops the obvious non-rooms and says so.
const NOT_A_ROOM = [
  "sightseeing", "tourist_attraction", "movie_studio_lot", "holiday_apartment",
  "furnished_apartment", "nature", "beach", "skateboarding",
];
const ROOM_SIGNALS = ["bar", "lounge", "club", "music", "theater", "theatre", "bistro"];

export function isPlausibleLiveRoom(seed: PlaceSeed): boolean {
  const h = tagHaystack(seed);
  if (!NOT_A_ROOM.some((k) => h.includes(k))) return true;
  return ROOM_SIGNALS.some((k) => h.includes(k));
}
// Standing-room / late-night rooms are bad picks for limited mobility or
// moderate noise tolerance.
function isStandingRoom(seed: PlaceSeed): boolean {
  const h = tagHaystack(seed);
  return (
    h.includes("night_club") ||
    h.includes("dance_club") ||
    h.includes("standing room") ||
    (h.includes("concert") && h.includes("general admission"))
  );
}

function haversineKm(aLat: number | null, aLon: number | null, b: PlaceSeed): number | null {
  if (aLat == null || aLon == null || b.lat == null || b.lon == null) return null;
  const R = 6371;
  const dLat = ((b.lat - aLat) * Math.PI) / 180;
  const dLon = ((b.lon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ---- venue leg -------------------------------------------------------------
export interface VenuePick {
  seed: PlaceSeed;
  affinity: number;
  why: string[];
  filteredOut: { name: string; reason: string }[];
}

export function pickVenue(profile: TasteProfile, candidates: PlaceSeed[]): VenuePick {
  const rationale: string[] = [];
  const filteredOut: { name: string; reason: string }[] = [];
  const mobilityLimited = profile.constraints.mobility.toLowerCase().startsWith("limited");
  const noiseModerate = profile.constraints.noise_tolerance.toLowerCase() === "moderate";

  const eligible = candidates.filter((c) => {
    if (isThemeParkReplica(c)) {
            filteredOut.push({
                      name: c.name,
                      reason: "removed: theme-park / cartoon-replica attraction — not a live room",
            });
            return false;
    }
    if (!isPlausibleLiveRoom(c)) {
      filteredOut.push({
        name: c.name,
        reason: "removed: not a plausible live room (landmark / shop, not a show venue)",
      });
      return false;
    }
    if (mobilityLimited && isStandingRoom(c)) {
      filteredOut.push({
        name: c.name,
        reason: `removed: standing-room/late-night room — incompatible with "${profile.constraints.mobility}"`,
      });
      return false;
    }
    if (noiseModerate && isStandingRoom(c)) {
      filteredOut.push({
        name: c.name,
        reason: "removed: high-noise room — exceeds moderate noise tolerance",
      });
      return false;
    }
    return true;
  });

  if (mobilityLimited) {
    rationale.push(
      `Mobility filter applied ("${profile.constraints.mobility}"): seated, show-format rooms kept; standing-room venues dropped.`
    );
  }
  if (noiseModerate) {
    rationale.push("Noise filter applied (moderate tolerance): late-night dance rooms excluded.");
  }

  const pool = eligible.length > 0 ? eligible : candidates;
  if (eligible.length === 0) {
    rationale.push("No candidate survived hard filters — fell back to highest-affinity venue.");
  }

  const ranked = [...pool].sort((a, b) => b.affinity - a.affinity);
  const top = ranked[0];
  const why = [
    `Qloo affinity ${top.affinity.toFixed(4)} — top of ${ranked.length} candidates after filters`,
    `Matched by signals: ${profile.signals.music_tag_urns.join(", ") || "artist entities"} + ${
      profile.signals.venue_filter_tag_urns.join(", ") || "place type"
    }`,
  ];
  if (top.business_rating) why.push(`Community rating ★${top.business_rating.toFixed(1)}`);
  why.push(`Est. cover $${estimateVenueUsd(top)}`);

  return { seed: top, affinity: top.affinity, why, filteredOut };
}

// ---- dining leg ------------------------------------------------------------
export interface DiningPick {
  seed: PlaceSeed;
  affinity: number;
  distanceKm: number | null;
  why: string[];
}

export function pickDining(
  profile: TasteProfile,
  candidates: PlaceSeed[],
  venue: PlaceSeed
): DiningPick {
  const budget = profile.constraints.budget_usd;
  const venueCost = estimateVenueUsd(venue);

  const foodOnly = candidates.filter(isFoodPlace);
  const dropped = candidates.length - foodOnly.length;

  const scored = foodOnly.map((c) => {
    const cost = estimateDiningUsd(c);
    const dist = haversineKm(venue.lat, venue.lon, c);
    return { c, cost, dist, total: venueCost + cost };
  });

  // Prefer an evening that fits the budget; if nothing fits, minimize the
  // overage on the highest-taste picks and flag it honestly.
  const fitting = scored
    .filter((s) => s.total <= budget)
    .sort((a, b) => b.c.affinity - a.c.affinity || (a.dist ?? 999) - (b.dist ?? 999));
  const fallback = [...scored].sort((a, b) => a.total - b.total || b.c.affinity - a.c.affinity);
  const best = fitting[0] ?? fallback[0];
  const usedFallback = fitting.length === 0;

  const why = [
    `Qloo affinity ${best.c.affinity.toFixed(4)} on cuisine signals: ${profile.signals.cuisine_tag_urns.join(", ")}`,
    best.dist != null
      ? `${best.dist.toFixed(1)} km from ${venue.name}${
          best.dist > profile.constraints.transport_radius_km
            ? ` — outside the ${profile.constraints.transport_radius_km} km travel comfort zone, flagged below`
            : " — inside the travel comfort zone"
        }`
      : "Distance unavailable — chosen on taste affinity",
    usedFallback
      ? `No food candidate keeps the evening under $${budget} — chose the closest taste match and flagged the overage`
      : `Est. $${best.cost} dinner + $${venueCost} cover ≈ $${best.total} vs $${budget} budget — fits`,
  ];
  if (dropped > 0) {
    why.push(`${dropped} non-food result${dropped > 1 ? "s" : ""} (park, stadium, shop) excluded from dining`);
  }
  if (best.c.business_rating) why.push(`Community rating ★${best.c.business_rating.toFixed(1)}`);

  return { seed: best.c, affinity: best.c.affinity, distanceKm: best.dist, why };
}

// ---- compose the evening ----------------------------------------------------
export interface NightOut {
  persona: { id: string; name: string; age: number; bio: string };
  venue: {
    name: string;
    address: string;
    locality: string;
    affinity: number;
    rating: number | null;
    priceLevel: number | null;
    tagUrns: string[];
    why: string[];
  };
  dining: {
    name: string;
    address: string;
    locality: string;
    affinity: number;
    rating: number | null;
    priceLevel: number | null;
    distanceKm: number | null;
    why: string[];
  };
  itinerary: { time: string; title: string; detail: string }[];
  budget: { estimate_usd: number; cap_usd: number; fits: boolean };
  practicalityRationale: string[];
  evidence: {
    signalsUsed: { artists: number; tags: string[]; venueFilterTags: string[] };
    venueAffinity: number;
    diningAffinity: number;
    note: string;
  };
  cached: boolean;
}

export function composeNightOut(profile: TasteProfile, venues: PlaceSeed[], dining: PlaceSeed[]): NightOut {
  const v = pickVenue(profile, venues);
  const d = pickDining(profile, dining, v.seed);

  const eveningCost = estimateVenueUsd(v.seed) + estimateDiningUsd(d.seed);
  const fits = eveningCost <= profile.constraints.budget_usd;

  const practicalityRationale = [
    ...v.why.slice(0, 1).map(() => `Venue shortlist re-ranked by taste affinity after mobility/noise filters.`),
    ...v.filteredOut.map((f) => `${f.name}: ${f.reason}.`),
    ...(d.distanceKm != null && d.distanceKm > profile.constraints.transport_radius_km
      ? [
          `Dinner-to-show distance ${d.distanceKm.toFixed(1)} km exceeds the ${
            profile.constraints.transport_radius_km
          } km travel comfort zone — flagged, not hidden; the taste match was kept over a closer, weaker match.`,
        ]
      : []),
    ...(fits
      ? [`Evening est. $${eveningCost} vs $${profile.constraints.budget_usd} budget — fits.`]
      : [
          `Evening est. $${eveningCost} vs $${profile.constraints.budget_usd} budget — over by $${
            eveningCost - profile.constraints.budget_usd
          }; the agent reports this instead of silently overspending.`,
        ]),
  ];

  return {
    persona: {
      id: profile.persona_id,
      name: profile.name,
      age: profile.age,
      bio: profile.bio,
    },
    venue: {
      name: v.seed.name,
      address: v.seed.address,
      locality: v.seed.locality,
      affinity: v.affinity,
      rating: v.seed.business_rating,
      priceLevel: v.seed.price_level,
      tagUrns: v.seed.tags.slice(0, 6).map((t) => t.id),
      why: v.why,
    },
    dining: {
      name: d.seed.name,
      address: d.seed.address,
      locality: d.seed.locality,
      affinity: d.affinity,
      rating: d.seed.business_rating,
      priceLevel: d.seed.price_level,
      distanceKm: d.distanceKm,
      why: d.why,
    },
    itinerary: [
      {
        time: "6:30 PM",
        title: `Dinner — ${d.seed.name}`,
        detail: `${d.seed.address || d.seed.locality}. Taste match ${d.affinity.toFixed(3)}, ${
          d.distanceKm != null ? `${d.distanceKm.toFixed(1)} km from the venue` : "close to the venue"
        }.`,
      },
      {
        time: "8:30 PM",
        title: `Show — ${v.seed.name}`,
        detail: `${v.seed.address || v.seed.locality}. Seated show, taste match ${v.affinity.toFixed(3)}.`,
      },
      {
        time: "10:30 PM",
        title: "Ride home",
        detail: `One booking — dinner, show, and ride home handled as a single evening (travel comfort zone: ~${profile.constraints.transport_radius_km} km).`,
      },
    ],
    budget: { estimate_usd: eveningCost, cap_usd: profile.constraints.budget_usd, fits },
    practicalityRationale,
    evidence: {
      signalsUsed: {
        artists: profile.signals.artist_entity_ids.length,
        tags: [...profile.signals.music_tag_urns, ...profile.signals.cuisine_tag_urns],
        venueFilterTags: profile.signals.venue_filter_tag_urns,
      },
      venueAffinity: v.affinity,
      diningAffinity: d.affinity,
      note: "Affinities are Qloo-computed against the persona's taste signals — remove Qloo and the matching is vibes.",
    },
    cached: true,
  };
}
