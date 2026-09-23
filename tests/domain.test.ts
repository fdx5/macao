import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  dayEvents,
  tripState,
  clock,
  macauDate,
  nextEvent,
  eventState,
  daysUntil,
  timeLabel,
} from "../src/domain.ts";
import type { Trip } from "../src/types.ts";
const trip: Trip = JSON.parse(await readFile("data/trip.json", "utf8"));
test("five immutable travelers and correct team split", () => {
  assert.equal(trip.travelers.length, 5);
  assert.equal(trip.travelers.filter((t) => t.team === "A").length, 3);
  assert.equal(dayEvents(trip.events, 4, "B").length, 0);
  const a = dayEvents(trip.events, 3, "A"),
    b = dayEvents(trip.events, 3, "B");
  assert(a.some((e) => e.placeId === "coloane"));
  assert(!b.some((e) => e.placeId === "coloane"));
  assert(b.some((e) => e.title === "마카오에서 인천으로"));
  assert.deepEqual(
    a.filter((e) => new Date(e.startAt) < new Date("2026-10-14T12:30+08:00")),
    b.filter((e) => new Date(e.startAt) < new Date("2026-10-14T12:30+08:00")),
  );
});
test("A team reaches the October 14 show after dinner and admission time", () => {
  const events = dayEvents(trip.events, 3, "A");
  const show = events.find((e) => e.title === "하우스 오브 댄싱 워터")!;
  assert.equal(show.startAt, "2026-10-14T19:30:00+08:00");
  assert.equal(show.cost.people, 3);
  assert(show.reservationRequired);
  assert(
    !dayEvents(trip.events, 3, "B").some((e) => e.placeId === show.placeId),
  );
  const dinner = events.find((e) => e.placeId === "antonio")!;
  assert.equal(dinner.startAt, "2026-10-14T17:00:00+08:00");
  assert.equal((+new Date(show.startAt) - +new Date(dinner.endAt)) / 60000, 75);
  const admission = events[events.indexOf(show) - 1];
  assert.equal(admission.placeId, show.placeId);
  assert.equal(
    (+new Date(admission.endAt) - +new Date(admission.startAt)) / 60000,
    30,
  );
  assert.equal(events.at(-1)!.placeId, "venetian");
});

test("explicit time zones, boundary states, no inferred visit completion", () => {
  const t = new Date("2026-10-11T16:30:00Z");
  assert.equal(macauDate(t), "2026-10-12");
  assert.equal(clock(t), "00:30");
  assert.equal(clock(t, "Asia/Seoul"), "01:30");
  assert.equal(daysUntil(new Date("2026-10-11T00:00:00+08:00")), 1);
  assert.equal(tripState(new Date("2026-10-11T23:59:00+08:00"), "A"), "before");
  assert.equal(tripState(t, "A"), "during");
  assert.equal(tripState(new Date("2026-10-14T22:46:00+09:00"), "B"), "after");
  assert.equal(tripState(new Date("2026-10-14T22:46:00+09:00"), "A"), "during");
  const event = trip.events.find((e) => e.title === "체크인 & 느긋한 휴식")!;
  assert.equal(
    eventState(event, new Date("2026-10-12T15:00+08:00")),
    "현재 예정 시간",
  );
  assert.equal(eventState(event, new Date(event.endAt)), "예정 시간 경과");
  assert(
    nextEvent(trip.events, new Date("2026-10-14T13:30+08:00"), "A")?.placeId ===
      "coloane",
  );
});
test("event chronology, valid places, source references and cost headcounts", () => {
  for (const day of [1, 2, 3, 4])
    for (const team of ["A", "B"] as const) {
      const events = dayEvents(trip.events, day, team);
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        assert(new Date(e.endAt) > new Date(e.startAt), e.id);
        if (i)
          assert(
            new Date(e.startAt) >= new Date(events[i - 1].endAt),
            `${e.id} overlap`,
          );
        assert.equal(typeof e.notes, "string", e.id);
        assert(trip.places.some((p) => p.id === e.placeId));
        assert.equal(
          e.cost.people,
          e.teamIds.length === 2 ? 5 : team === "A" ? 3 : 2,
        );
        for (const s of e.sourceIds)
          assert(trip.sources.some((x) => x.id === s));
      }
    }
});
test("trip weekdays and conservative airport arrival", () => {
  for (let d = 12; d <= 15; d++)
    assert.equal(new Date(`2026-10-${d}T12:00:00+08:00`).getUTCDay(), d - 11);
  for (const team of ["A", "B"] as const) {
    const es = dayEvents(trip.events, team === "A" ? 4 : 3, team);
    const arrival = es.find((e) => e.title === "체크인 · 수하물 · 출국심사")!;
    const flight = es.find((e) => e.category === "항공")!;
    assert.equal(
      (+new Date(flight.startAt) - +new Date(arrival.startAt)) / 3600000,
      3,
    );
  }
});
test("flight endpoints display each airport local time without inferring flight duration", () => {
  const flights = trip.events.filter((e) => e.category === "항공");
  assert.equal(flights.length, 3);
  assert.equal(timeLabel(flights[0]), "07:50");
  assert.equal(timeLabel(flights[0], true), "10:40");
  assert.equal(timeLabel(flights[1]), "16:10");
  assert.equal(timeLabel(flights[1], true), "22:45");
});
test("authentication, immutable records, no uploads and session survival after restart", async () => {
  const port = 3198;
  const base = `http://127.0.0.1:${port}`;
  let proc: ReturnType<typeof spawn>;
  async function start() {
    proc = spawn(process.execPath, ["server/index.mjs"], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
        FAMILY_ACCESS_CODE: "test-family-code",
        SESSION_SECRET: "test-session-secret-only",
        SITE_URL: base,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error("server timeout")), 15000);
      proc.stdout!.on("data", (data) => {
        if (String(data).includes("Macao ready")) {
          clearTimeout(timeout);
          resolve();
        }
      });
      proc.on("error", reject);
    });
  }
  async function stop() {
    proc.kill();
    await once(proc, "exit");
  }
  await start();
  try {
    assert.equal((await fetch(base + "/api/trip")).status, 401);
    assert.equal(
      (
        await fetch(base + "/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "wrong" }),
        })
      ).status,
      401,
    );
    const login = await fetch(base + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "test-family-code" }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const headers = { Cookie: cookie };
    assert.equal((await fetch(base + "/api/trip", { headers })).status, 200);
    assert.equal(
      (
        await fetch(base + "/api/profiles/migyun", {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ team: "B", name: "Changed" }),
        })
      ).status,
      405,
    );
    assert.equal(
      (
        await fetch(base + "/api/logout", {
          method: "POST",
          headers: { ...headers, Origin: "https://evil.example" },
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(base + "/api/profiles", { headers })).status,
      404,
    );
    assert.equal(
      (
        await fetch(base + "/api/profiles/migyun/photo", {
          method: "POST",
          headers,
        })
      ).status,
      404,
    );
    assert.equal(
      (await fetch(base + "/uploads/migyun.webp", { headers })).status,
      404,
    );
    await stop();
    await start();
    assert.deepEqual(
      await (await fetch(base + "/api/trip", { headers })).json(),
      trip,
    );
  } finally {
    await stop();
  }
});
