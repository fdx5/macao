import type { Event, Team } from "./types";
export const TRIP_START = "2026-10-12T00:00:00+08:00";
export function macauDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Macau",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function clock(now: Date, zone = "Asia/Macau") {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}
export function dayEvents(events: Event[], day: number, team: Team) {
  return events
    .filter((e) => e.day === day && e.teamIds.includes(team))
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
}
export function tripState(now: Date, team: Team) {
  const end = new Date(`2026-10-${team === "A" ? "15" : "14"}T22:45:00+09:00`);
  return now < new Date(TRIP_START) ? "before" : now > end ? "after" : "during";
}
export function eventState(event: Event, now: Date) {
  return now < new Date(event.startAt)
    ? "예정"
    : now < new Date(event.endAt)
      ? "현재 예정 시간"
      : "예정 시간 경과";
}
export function nextEvent(events: Event[], now: Date, team: Team) {
  return events
    .filter((e) => e.teamIds.includes(team) && new Date(e.startAt) > now)
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0];
}
export function timeLabel(event: Event, end = false) {
  return clock(
    new Date(end ? event.endAt : event.startAt),
    end ? event.endTimeZone || event.timeZone : event.timeZone,
  );
}
export function directions(
  lat: number,
  lng: number,
  origin?: { lat: number; lng: number },
  mode = "driving",
) {
  const q = new URLSearchParams({
    api: "1",
    destination: `${lat},${lng}`,
    travelmode: mode,
  });
  if (origin) q.set("origin", `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${q}`;
}
export function daysUntil(now: Date) {
  return Math.max(
    0,
    Math.ceil(
      (+new Date(TRIP_START) - +new Date(`${macauDate(now)}T00:00:00+08:00`)) /
        86400000,
    ),
  );
}
