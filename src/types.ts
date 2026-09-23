export type Team = "A" | "B";
export type Traveler = {
  id: string;
  name: string;
  team: Team;
  animal: string;
  color: string;
  returnDate: string;
};
export type Source = {
  id: string;
  name: string;
  url: string;
  checkedAt: string;
  status: string;
  note: string;
};
export type Place = {
  id: string;
  name: string;
  local: string;
  english: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
  image: string;
  description: string;
  hours: string;
  cost: string;
  stay: string;
  walking: string;
  rain: string;
  transport: string;
  reservation: string;
  sourceIds: string[];
  menu?: string;
  budget?: number[];
  days?: number[];
  fit?: string;
  mealNote?: string;
  galleryUrl?: string;
};
export type Event = {
  id: string;
  day: number;
  startAt: string;
  endAt: string;
  timeZone: string;
  endTimeZone?: string;
  teamIds: Team[];
  title: string;
  category: string;
  placeId: string;
  transport: string;
  walking: string;
  notes: string;
  cost: {
    currency: string;
    min: number;
    max: number;
    people: number;
    basis: string;
    includes: string;
  };
  status: string;
  reservationRequired: boolean;
  sourceIds: string[];
};
export type Trip = {
  travelers: Traveler[];
  places: Place[];
  events: Event[];
  sources: Source[];
  transports: {
    id: string;
    title: string;
    options: {
      name: string;
      time: string;
      cost: string;
      detail: string;
      departure: string;
    }[];
    sourceIds: string[];
  }[];
  checklist: string[];
  pending: string[];
  alternatives: {
    title: string;
    description: string;
    cost: string;
    placeIds: string[];
  }[];
  flights: {
    id: string;
    teams: Team[];
    departure: string;
    arrival: string;
    from: string;
    to: string;
    note: string;
  }[];
  hotel: { name: string; checkIn: string; checkOut: string; note: string };
};
