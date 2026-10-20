// Slimmed Qloo insights records (built from ../seeds/*.json by scripts/slim-seeds.mjs).
// These are cached Day-1 evidence — the agent loop serves from here first.
export interface PlaceSeed {
  name: string;
  entity_id: string;
  affinity: number;
  popularity: number;
  lat: number | null;
  lon: number | null;
  address: string;
  locality: string;
  price_level: number | null;
  business_rating: number | null;
  tags: { id: string; name: string }[];
}

export interface PersonaSeeds {
  venues: PlaceSeed[];
  dining: PlaceSeed[];
}

// Imported at build time; ../data is bundled with the app, so the route is
// self-contained under encore/ for `vercel deploy`.
import slimData from "../data/slim.json";

export function getSeeds(personaId: string): PersonaSeeds {
  const rec = (slimData as unknown as Record<string, PersonaSeeds>)[personaId];
  if (!rec) throw new Error(`no seeds for persona: ${personaId}`);
  return rec;
}
