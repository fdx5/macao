import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  (page as any).runtimeErrors = [];
  page.on("pageerror", (error) =>
    (page as any).runtimeErrors.push(error.message),
  );
});
test.afterEach(async ({ page }) => {
  expect((page as any).runtimeErrors).toEqual([]);
});
async function enter(page: any, person = "최태준") {
  await page.goto("/");
  await expect(page.locator("#code")).toBeVisible();
  const code = (await readFile("storage/local-access-code.txt", "utf8")).trim();
  await page.locator("#code").fill(code);
  await page.getByRole("button", { name: "여행 시작하기" }).click();
  await page
    .getByRole("button", { name: new RegExp(`${person}.*A팀|${person}.*B팀`) })
    .click();
  await expect(
    page.getByRole("heading", { name: new RegExp(person + "님") }),
  ).toBeVisible();
}
test("main trip flow, responsive layout, dates, details and profile restoration", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page);
  await expect(page.locator(".hero")).toBeVisible();
  await expect(page.locator(".hero img")).toHaveJSProperty("complete", true);
  await page.screenshot({
    path: `test-results/${info.project.name}-dashboard.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("tab", { name: /DAY 03/ }).click();
  await expect(
    page.getByRole("button", { name: "세 사람의 작은 마을 산책" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "세 사람의 작은 마을 산책" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "기사님께 보여주기" }).click();
  await expect(page.locator(".taxi-address")).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.locator(".user-button").click();
  await expect(
    page.getByRole("heading", { name: "나의 작은 여행 여권." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /최태준님/ })).toBeVisible();
  expect(errors).toEqual([]);
});
test("restaurant photo banners load and A team show is visible on day three", async ({
  page,
}, info) => {
  await enter(page);
  for (const day of [1, 2, 3, 4]) {
    await page.getByRole("tab", { name: new RegExp(`DAY 0${day}`) }).click();
    const photos = page.locator(".food-photo img");
    expect(await photos.count()).toBeGreaterThan(0);
    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded();
      await expect
        .poll(() => photo.evaluate((el: HTMLImageElement) => el.naturalWidth))
        .toBeGreaterThan(0);
    }
  }
  await page.getByRole("tab", { name: /DAY 03/ }).click();
  await expect(
    page.getByRole("button", { name: "하우스 오브 댄싱 워터", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".event-row")
      .filter({
        has: page.getByRole("button", {
          name: "하우스 오브 댄싱 워터",
          exact: true,
        }),
      }),
  ).toContainText("19:30");
  await page.locator(".food-section").screenshot({
    path: `test-results/${info.project.name}-restaurant-banners.png`,
  });
  await page
    .getByRole("button", { name: "하우스 오브 댄싱 워터", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Dancing Water Theater");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("B team return and A team remaining itinerary", async ({ page }) => {
  await enter(page, "고혜린");
  await page.getByRole("tab", { name: /DAY 04/ }).click();
  await expect(
    page.getByRole("heading", { name: "B팀의 마카오 여정은 마무리되었어요." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "A팀의 남은 하루 보기" }).click();
  await expect(
    page.getByRole("button", { name: "추억을 안고, 인천으로" }),
  ).toBeVisible();
});
test("checklist, time simulation, default animal profile", async ({
  page,
}, info) => {
  await enter(page);
  await page.locator(".quick-strip>button").first().click();
  await page
    .getByText("여권 유효기간과 항공권·터미널 확인", { exact: true })
    .click();
  await expect(page.locator(".checklist input").first()).toBeChecked();
  await page.getByRole("button", { name: "3일차 오후 보기" }).click();
  await expect(page.locator(".simulation-banner")).toContainText(
    "실제 현재 시간이 아닙니다",
  );
  await page.locator(".user-button").click();
  await expect(page.locator(".profile-identity svg.avatar")).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.screenshot({
    path: `test-results/${info.project.name}-profile.png`,
    fullPage: true,
  });
  await expect(page.locator(".profile-identity svg.avatar")).toBeVisible();
});
test("map with geolocation failure keeps external navigation available", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        watchPosition: (_s: any, e: any) => {
          setTimeout(() => e({ code: 1 }), 10);
          return 1;
        },
        clearWatch: () => {},
      },
    });
  });
  await enter(page);
  await page.locator(".quick-strip>button").last().click();
  await page.getByRole("button", { name: "내 위치 확인" }).click();
  await expect(page.getByRole("status")).toContainText("위치 권한");
  await page.locator(".map-place-list button").first().click();
  await expect(page.locator(".map-selection a")).toHaveAttribute(
    "href",
    /origin=22.1484/,
  );
  await page.screenshot({
    path: `test-results/${info.project.name}-map.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("all five travelers can switch and location starts only by button, then stops", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).geoCalls = 0;
    Object.defineProperty(navigator, "geolocation", {
      value: {
        watchPosition: (success: any) => {
          (window as any).geoCalls++;
          setTimeout(
            () =>
              success({
                coords: { latitude: 22.15, longitude: 113.56, accuracy: 12 },
              }),
            10,
          );
          return 7;
        },
        clearWatch: () => {
          (window as any).geoStopped = true;
        },
      },
    });
  });
  await enter(page, "황미균");
  for (const name of ["최주혜", "최태일", "고혜린", "최태준"]) {
    await page.locator(".user-button").click();
    await page.getByRole("button", { name: "다른 여행자로 전환" }).click();
    await page
      .getByRole("button", { name: new RegExp(`${name}.*[AB]팀`) })
      .click();
    await expect(
      page.getByRole("heading", { name: new RegExp(name + "님") }),
    ).toBeVisible();
  }
  expect(await page.evaluate(() => (window as any).geoCalls)).toBe(0);
  await page.locator(".quick-strip>button").last().click();
  await page.getByRole("button", { name: "내 위치 확인" }).click();
  await expect(page.getByRole("status")).toContainText("±12m");
  await page.getByRole("button", { name: "위치 사용 중지" }).click();
  await expect(page.getByRole("status")).toContainText("위치 사용을 중지");
  expect(await page.evaluate(() => (window as any).geoStopped)).toBeTruthy();
});
