// Build-time: slim the cached Day-1 Qloo seed files into encore/data/slim.json.
// Keeps only the fields the agent loop + UI need, so the deployed app is
// self-contained (no ../seeds dependency at runtime) and small.
// Usage: node scripts/slim-seeds.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seedsDir = join(root, "..", "seeds");
const outDir = join(root, "data");

function localityString(raw) {
  const loc = raw?.properties?.locality;
  if (typeof loc === "string") return loc;
  const parts = [loc?.city?.name, loc?.county?.name, loc?.state?.name].filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}, ${parts[parts.length - 1]}`;
  if (parts.length === 1) return parts[0];
  // Last resort: parse the "City, ST ZIP" tail off the address.
  const addr = raw?.properties?.address ?? "";
  const m = addr.match(/([A-Za-z .']+),\s*([A-Z]{2})\s*\d{5}/);
  if (m) return `${m[1].trim()}, ${m[2]}`;
  return loc?.metro?.name ?? "";
}

function slimOne(raw) {
  return {
    name: raw.name ?? "",
    entity_id: raw.entity_id ?? "",
    affinity: raw?.query?.affinity ?? 0,
    popularity: raw.popularity ?? 0,
    lat: raw?.location?.lat ?? null,
    lon: raw?.location?.lon ?? null,
    address: raw?.properties?.address ?? "",
    locality: localityString(raw),
    price_level: raw?.properties?.price_level ?? null,
    business_rating: raw?.properties?.business_rating ?? null,
    tags: (raw.tags ?? []).map((t) => ({ id: t.id, name: t.name })),
  };
}

const personas = ["margaret", "robert", "elena"];
const out = {};
for (const p of personas) {
  let venues = JSON.parse(readFileSync(join(seedsDir, `${p}_venues.json`), "utf8")).map(slimOne);
  // Day-2+ refinements (e.g. robert_venues_refine.json) merge in, dedup by entity_id.
  const refinePath = join(seedsDir, `${p}_venues_refine.json`);
  if (existsSync(refinePath)) {
    const seen = new Set(venues.map((v) => v.entity_id));
    for (const v of JSON.parse(readFileSync(refinePath, "utf8")).map(slimOne)) {
      if (!seen.has(v.entity_id)) {
        venues.push(v);
        seen.add(v.entity_id);
      }
    }
  }
  const dining = JSON.parse(readFileSync(join(seedsDir, `${p}_dining.json`), "utf8")).map(slimOne);
  out[p] = { venues, dining };
  console.log(`${p}: ${out[p].venues.length} venues, ${out[p].dining.length} dining`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "slim.json"), JSON.stringify(out));
console.log("wrote", join(outDir, "slim.json"));
