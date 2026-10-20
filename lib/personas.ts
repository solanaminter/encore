// Persona taste profiles — curated Day 1, per seeds/taste-profile.schema.json.
// Signals map 1:1 to Qloo insights params; constraints drive post-filtering.
export interface TasteProfile {
  persona_id: string;
  name: string;
  age: number;
  bio: string;
  signals: {
    artist_entity_ids: string[];
    person_entity_ids: string[];
    music_tag_urns: string[];
    cuisine_tag_urns: string[];
    venue_filter_tag_urns: string[];
  };
  constraints: {
    location: string;
    budget_usd: number;
    mobility: string;
    noise_tolerance: string;
    transport_radius_km: number;
  };
}

export const PERSONAS: TasteProfile[] = [
  {
    persona_id: "margaret",
    name: "Margaret",
    age: 74,
    bio: "Widowed, loves jazz and old Hollywood films, bad knees, $60 budget.",
    signals: {
      // Miles Davis, Frank Sinatra (Qloo entity IDs, bare UUIDs)
      artist_entity_ids: [
        "578CFC26-B696-449A-9655-3FB270DDA725",
        "FC0F8D26-BA80-4D83-8BBF-FC011DC8D241",
      ],
      person_entity_ids: [],
      music_tag_urns: ["urn:tag:genre:music:jazz"],
      cuisine_tag_urns: ["urn:tag:cuisine:qloo:italian"],
      venue_filter_tag_urns: ["urn:tag:genre:place:jazz_club"],
    },
    constraints: {
      location: "Los Angeles, CA",
      budget_usd: 60,
      mobility: "limited: bad knees, no stairs",
      noise_tolerance: "moderate",
      transport_radius_km: 15,
    },
  },
  {
    persona_id: "robert",
    name: "Robert",
    age: 68,
    bio: "Retired teacher, classic rock and film noir, tight budget.",
    signals: {
      // Bruce Springsteen; Humphrey Bogart
      artist_entity_ids: ["120E288E-858F-4AC1-A825-736D5A16D65F"],
      person_entity_ids: ["1703B043-5365-4275-992B-0E80989AE758"],
      music_tag_urns: ["urn:tag:genre:music:rock_and_roll"],
      cuisine_tag_urns: ["urn:tag:genre:place:restaurant:american"],
      venue_filter_tag_urns: [],
    },
    constraints: {
      location: "Pasadena, CA",
      budget_usd: 45,
      mobility: "none",
      noise_tolerance: "high",
      transport_radius_km: 12,
    },
  },
  {
    persona_id: "elena",
    name: "Elena",
    age: 72,
    bio: "Salsa dancer, Latin cinema, prefers Spanish-language rooms.",
    signals: {
      // Celia Cruz; Pedro Almodóvar
      artist_entity_ids: ["46E910B1-B242-4CB6-A045-A7ED0D30328E"],
      person_entity_ids: ["9D50A96D-179B-49B2-B47F-CFBF0D8E9A97"],
      music_tag_urns: [],
      cuisine_tag_urns: ["urn:tag:cuisine:qloo:mexican"],
      venue_filter_tag_urns: [],
    },
    constraints: {
      location: "East Los Angeles, CA",
      budget_usd: 50,
      mobility: "none",
      noise_tolerance: "high",
      transport_radius_km: 12,
    },
  },
];

export function getPersona(id: string): TasteProfile {
  const p = PERSONAS.find((x) => x.persona_id === id);
  if (!p) throw new Error(`unknown persona: ${id}`);
  return p;
}
