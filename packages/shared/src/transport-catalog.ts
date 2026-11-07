export type TransportSource = "DMRC" | "INDIAN_RAILWAYS" | "DTC" | "ISBT";
export type TransportPlaceType = "METRO" | "RAILWAY" | "BUS_STOP";

export type TransportPlace = {
  source: TransportSource;
  placeType: TransportPlaceType;
  state: string;
  city: string;
  name: string;
};

// Checked-in Delhi NCR baseline. Refresh this list from the operators' public
// station directories when the directory is reviewed; runtime matching never
// scrapes external sites.
export const DELHI_NCR_TRANSPORT_PLACES: readonly TransportPlace[] = [
  ...DMRC_METRO_STATIONS.map((name) => ({
    source: "DMRC" as const,
    placeType: "METRO" as const,
    state: name.includes("Noida") || name.includes("Greater Noida") ? "Uttar Pradesh" : "Delhi",
    city: name.includes("Noida") || name.includes("Greater Noida") ? "Noida" : "New Delhi",
    name: name.endsWith("Metro") ? name : `${name} Metro`,
  })),
  { source: "DMRC", placeType: "METRO", state: "Delhi", city: "New Delhi", name: "Rajiv Chowk Metro" },
  { source: "DMRC", placeType: "METRO", state: "Delhi", city: "New Delhi", name: "Central Secretariat Metro" },
  { source: "DMRC", placeType: "METRO", state: "Delhi", city: "New Delhi", name: "Kashmere Gate Metro" },
  { source: "DMRC", placeType: "METRO", state: "Delhi", city: "New Delhi", name: "Hauz Khas Metro" },
  { source: "DMRC", placeType: "METRO", state: "Delhi", city: "New Delhi", name: "Dwarka Sector 21 Metro" },
  { source: "DMRC", placeType: "METRO", state: "Delhi", city: "New Delhi", name: "Chandni Chowk Metro" },
  { source: "DMRC", placeType: "METRO", state: "Delhi", city: "New Delhi", name: "Saket Metro" },
  { source: "DMRC", placeType: "METRO", state: "Uttar Pradesh", city: "Noida", name: "Noida Sector 18 Metro" },
  { source: "DMRC", placeType: "METRO", state: "Delhi", city: "New Delhi", name: "Karol Bagh Metro" },
  { source: "INDIAN_RAILWAYS", placeType: "RAILWAY", state: "Delhi", city: "New Delhi", name: "New Delhi Railway Station" },
  { source: "INDIAN_RAILWAYS", placeType: "RAILWAY", state: "Delhi", city: "New Delhi", name: "Old Delhi Railway Station" },
  { source: "INDIAN_RAILWAYS", placeType: "RAILWAY", state: "Delhi", city: "New Delhi", name: "Hazrat Nizamuddin Railway Station" },
  { source: "INDIAN_RAILWAYS", placeType: "RAILWAY", state: "Delhi", city: "New Delhi", name: "Anand Vihar Terminal" },
  { source: "INDIAN_RAILWAYS", placeType: "RAILWAY", state: "Delhi", city: "New Delhi", name: "Delhi Cantt Railway Station" },
  { source: "INDIAN_RAILWAYS", placeType: "RAILWAY", state: "Delhi", city: "New Delhi", name: "Sabzi Mandi Railway Station" },
  { source: "ISBT", placeType: "BUS_STOP", state: "Delhi", city: "New Delhi", name: "Kashmere Gate ISBT" },
  { source: "ISBT", placeType: "BUS_STOP", state: "Delhi", city: "New Delhi", name: "Anand Vihar ISBT" },
  { source: "ISBT", placeType: "BUS_STOP", state: "Delhi", city: "New Delhi", name: "Sarai Kale Khan ISBT" },
  { source: "DTC", placeType: "BUS_STOP", state: "Delhi", city: "New Delhi", name: "Mori Gate Bus Stop" },
  { source: "DTC", placeType: "BUS_STOP", state: "Delhi", city: "New Delhi", name: "Connaught Place Bus Stop" },
  { source: "DTC", placeType: "BUS_STOP", state: "Delhi", city: "New Delhi", name: "South Extension Bus Stop" },
  { source: "DTC", placeType: "BUS_STOP", state: "Delhi", city: "New Delhi", name: "Dwarka Bus Terminal" },
  { source: "DTC", placeType: "BUS_STOP", state: "Haryana", city: "Gurugram", name: "Gurugram Bus Stand" },
  { source: "DTC", placeType: "BUS_STOP", state: "Uttar Pradesh", city: "Noida", name: "Noida Bus Station" },
];
import { DMRC_METRO_STATIONS } from "./dmrc-stations";
