// Day-2 end-to-end check: run the Encore agent loop for one persona against
// the cached slim seeds and log the composed itinerary.
// Usage (from encore/): npx tsx scripts/run-loop.ts [persona_id]  (default: margaret)
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getPersona } from "../lib/personas";
import { getSeeds } from "../lib/seeds";
import { composeNightOut } from "../lib/agent";

const here = dirname(fileURLToPath(import.meta.url));
const personaId = process.argv[2] ?? "margaret";

const profile = getPersona(personaId);
const seeds = getSeeds(personaId);
const nightOut = composeNightOut(profile, seeds.venues, seeds.dining);

const outDir = join(here, "..", "..", "results");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${personaId}_itinerary.json`);
writeFileSync(outPath, JSON.stringify(nightOut, null, 2));

console.log(`persona : ${profile.name}, ${profile.age} — ${profile.bio}`);
console.log(`venue   : ${nightOut.venue.name} (affinity ${nightOut.venue.affinity.toFixed(4)})`);
console.log(`dining  : ${nightOut.dining.name} (affinity ${nightOut.dining.affinity.toFixed(4)})`);
console.log(
  `budget  : est $${nightOut.budget.estimate_usd} vs $${nightOut.budget.cap_usd} cap — ${
    nightOut.budget.fits ? "FITS" : "OVER BUDGET (flagged)"
  }`
);
console.log(`rationale:`);
for (const r of nightOut.practicalityRationale) console.log(`  - ${r}`);
console.log(`wrote ${outPath}`);
