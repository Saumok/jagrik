// Static resource directory. Emergency numbers are national (same everywhere in
// India); civic helplines are matched to the citizen's city when we can detect it.

export interface Helpline {
  label: string;
  number: string;
  note?: string;
}

// National emergency lines — always shown, top priority.
export const EMERGENCY: Helpline[] = [
  { label: "All-in-one emergency", number: "112", note: "Police · Fire · Ambulance" },
  { label: "Police", number: "100" },
  { label: "Fire brigade", number: "101" },
  { label: "Ambulance", number: "102", note: "Free public ambulance" },
  { label: "Emergency / disaster ambulance", number: "108" },
  { label: "Women's helpline", number: "1091" },
  { label: "Child helpline", number: "1098" },
  { label: "Senior citizen helpline", number: "14567" },
  { label: "Disaster management (NDMA)", number: "1078" },
  { label: "Road accident emergency", number: "1073" },
  { label: "Electricity complaints", number: "1912" },
];

export interface CivicDirectory {
  city: string;
  body: string; // municipal body
  lines: Helpline[];
}

// City civic helplines, keyed by a lowercased city token (matched loosely).
export const CITY_CIVIC: Record<string, CivicDirectory> = {
  kolkata: {
    city: "Kolkata",
    body: "Kolkata Municipal Corporation (KMC)",
    lines: [
      { label: "KMC control room", number: "18003453375", note: "Civic complaints, toll-free" },
      { label: "KMC water / drainage", number: "03322861212" },
      { label: "Kolkata Police", number: "03222143230", note: "Lalbazar control room" },
    ],
  },
  delhi: {
    city: "Delhi",
    body: "Municipal Corporation of Delhi (MCD)",
    lines: [
      { label: "MCD helpline", number: "1533", note: "Civic complaints" },
      { label: "Delhi Jal Board (water)", number: "1916" },
      { label: "Delhi traffic police", number: "1095" },
    ],
  },
  mumbai: {
    city: "Mumbai",
    body: "Brihanmumbai Municipal Corporation (BMC)",
    lines: [
      { label: "BMC helpline", number: "1916", note: "Civic complaints, 24x7" },
      { label: "BMC disaster control", number: "02222694725" },
    ],
  },
  bengaluru: {
    city: "Bengaluru",
    body: "Bruhat Bengaluru Mahanagara Palike (BBMP)",
    lines: [
      { label: "BBMP helpline (Sahaaya)", number: "1533", note: "Civic complaints" },
      { label: "BBMP control room", number: "08022660000" },
      { label: "BWSSB (water)", number: "1916" },
    ],
  },
  chennai: {
    city: "Chennai",
    body: "Greater Chennai Corporation (GCC)",
    lines: [
      { label: "GCC helpline", number: "1913", note: "Civic complaints" },
      { label: "Metro Water", number: "04545671200" },
    ],
  },
  hyderabad: {
    city: "Hyderabad",
    body: "Greater Hyderabad Municipal Corporation (GHMC)",
    lines: [
      { label: "GHMC helpline", number: "04021111111", note: "Civic complaints" },
      { label: "Water board (HMWSSB)", number: "155313" },
    ],
  },
  pune: {
    city: "Pune",
    body: "Pune Municipal Corporation (PMC)",
    lines: [
      { label: "PMC helpline", number: "1800103222", note: "Civic complaints" },
      { label: "PMC control room", number: "02025501000" },
    ],
  },
  ahmedabad: {
    city: "Ahmedabad",
    body: "Ahmedabad Municipal Corporation (AMC)",
    lines: [
      { label: "AMC helpline", number: "155303", note: "Civic complaints" },
      { label: "AMC control room", number: "07925391811" },
    ],
  },
};

// National civic fallback when the city isn't in our directory.
export const CIVIC_FALLBACK: CivicDirectory = {
  city: "",
  body: "Your municipal corporation",
  lines: [
    { label: "Swachh Bharat / civic grievances", number: "1969" },
    { label: "CPGRAMS (central grievances)", number: "18001801322" },
    { label: "Electricity complaints", number: "1912" },
  ],
};

export function civicForCity(city?: string | null): CivicDirectory {
  if (!city) return CIVIC_FALLBACK;
  const key = city.toLowerCase();
  for (const k of Object.keys(CITY_CIVIC)) {
    if (key.includes(k)) return CITY_CIVIC[k];
  }
  return CIVIC_FALLBACK;
}
