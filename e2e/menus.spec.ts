import { expect, test } from "@playwright/test";
import { shiftDate, todayInSeoul } from "../src/lib/dates";
import type { MenuState } from "../src/lib/model";

const imageBase = "https://cafeptthumb-phinf.pstatic.net/panbab-test";
const imageSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="1200" height="1600" fill="#f3eddd"/><text x="110" y="220" font-size="80" fill="#526244">TEST MENU FIXTURE</text></svg>';

function fixture(date = todayInSeoul()): Extract<MenuState, { status: "ready" }> {
  const image = (file: string) => ({
    url: `${imageBase}/${file}?type=w1600`,
    originalUrl: `${imageBase}/${file}`,
    width: 1200,
    height: 1600,
  });
  return {
    status: "ready",
    stale: false,
    snapshot: {
      version: 1,
      date,
      cutoffAt: new Date(`${date}T12:00:00+09:00`).toISOString(),
      collectedAt: new Date().toISOString(),
      warnings: [],
      menus: [
        {
          id: 900001,
          title: `${date} 테스트 밥집 점심 메뉴`,
          publishedAt: new Date(`${date}T09:15:00+09:00`).toISOString(),
          sourceUrl: "https://cafe.naver.com/f-e/cafes/30487307/articles/900001",
          restaurant: { id: "test-buffet", name: "테스트 밥집", building: "테스트타워", location: "2층", category: "한식뷔페" },
          images: [image("promotion.png"), image(`menu-${date}.png`), image("map.png")],
          text: "",
        },
        {
          id: 900002,
          title: `${date} 테스트 구내식당 점심 메뉴`,
          publishedAt: new Date(`${date}T08:30:00+09:00`).toISOString(),
          sourceUrl: "https://cafe.naver.com/f-e/cafes/30487307/articles/900002",
          restaurant: { id: "test-cafeteria", name: "테스트 구내식당", building: "테스트센터", location: "지하 1층", category: "구내식당" },
          images: [image("cafeteria.png")],
          text: "",
        },
        {
          id: 900003,
          title: `${date} 텍스트 식당 점심 메뉴`,
          publishedAt: new Date(`${date}T08:00:00+09:00`).toISOString(),
          sourceUrl: "https://cafe.naver.com/f-e/cafes/30487307/articles/900003",
          restaurant: { id: "test-text", name: "텍스트 식당", building: "테스트빌딩", location: "", category: "식당" },
          images: [],
          text: "테스트용 점심 메뉴\n김치찌개\n달걀말이",
        },
      ],
    },
  };
}

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.route("https://cafeptthumb-phinf.pstatic.net/**", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: imageSvg }),
  );
  await page.route("**/api/menus**", (route) => {
    const date = new URL(route.request().url()).searchParams.get("date") ?? todayInSeoul();
    return route.fulfill({ json: fixture(date) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "메뉴 다시 불러오기", exact: true }).click();
  await expect(page.locator(".menu-card")).toHaveCount(3);
});

test("responsive layout fits 320, 390, 820, and 1440px without overflow", async ({ page }) => {
  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const expectedColumns = width <= 680 ? 1 : width <= 1023 ? 2 : 3;
    await expect.poll(() => page.locator(".menu-grid").evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").length,
    )).toBe(expectedColumns);
    const dimensions = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});

test("restaurant search and category filters survive a reload through the URL", async ({ page }) => {
  const searchToggle = page.getByRole("button", { name: "식당 검색 열기", exact: true });
  if (await searchToggle.isVisible()) await searchToggle.click();
  await page.getByRole("searchbox", { name: "식당 또는 건물 검색" }).fill("테스트센터");
  await expect(page.locator(".menu-card")).toHaveCount(1);
  await expect(page.locator(".menu-card h3")).toHaveText("테스트 구내식당");
  expect(new URL(page.url()).searchParams.get("q")).toBe("테스트센터");
  await page.reload();
  await page.getByRole("button", { name: "메뉴 다시 불러오기", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "식당 또는 건물 검색" })).toHaveValue("테스트센터");
  await expect(page.locator(".menu-card")).toHaveCount(1);
  await page.getByRole("button", { name: "검색어 지우기", exact: true }).click();
  await page.getByRole("button", { name: /^구내식당/ }).click();
  await expect(page.locator(".menu-card")).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get("category")).toBe("구내식당");
});

test("saved restaurants persist locally and saved-only navigation works", async ({ page }) => {
  await page.getByRole("button", { name: "테스트 밥집 저장", exact: true }).click();
  await expect(page.getByRole("button", { name: "테스트 밥집 저장 해제", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^저장한 식당/ }).click();
  await expect(page.locator(".menu-card")).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get("view")).toBe("saved");
  await page.reload();
  await page.getByRole("button", { name: "메뉴 다시 불러오기", exact: true }).click();
  await expect(page.locator(".menu-card")).toHaveCount(1);
  await expect(page.locator(".menu-card h3")).toHaveText("테스트 밥집");
  await page.getByRole("button", { name: "테스트 밥집 저장 해제", exact: true }).click();
  await expect(page.getByRole("heading", { name: "단골 식당을 모아보세요" })).toBeVisible();
});

test("all original images are accessible, zoomable, and keyboard navigable", async ({ page }) => {
  const opener = page.getByRole("button", { name: "테스트 밥집 메뉴 크게 보기", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "테스트 밥집", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".image-pagination")).toContainText("2 / 3");
  await expect(dialog.locator(".dialog-image-canvas img")).toHaveAttribute("src", `${imageBase}/menu-${todayInSeoul()}.png`);
  await dialog.getByRole("button", { name: "다음 메뉴판", exact: true }).click();
  await expect(dialog.locator(".image-pagination")).toContainText("3 / 3");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.locator(".image-pagination")).toContainText("2 / 3");
  await dialog.getByRole("button", { name: "원본 크기", exact: true }).click();
  await expect(dialog.locator(".dialog-image-canvas")).toHaveClass(/is-zoomed/);
  await expect(dialog.getByRole("link", { name: "카페 원문" })).toHaveAttribute("href", /articles\/900001$/);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("date navigation requests the selected date and keeps the selection on reload", async ({ page }) => {
  const yesterday = shiftDate(todayInSeoul(), -1);
  await page.getByRole("button", { name: "이전 날짜 메뉴", exact: true }).click();
  await expect(page.locator('input[name="date"]')).toHaveValue(yesterday);
  await expect(page.locator(".menu-card")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: /^지난 점심 메뉴/ })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("date")).toBe(yesterday);
  await page.reload();
  await expect(page.locator('input[name="date"]')).toHaveValue(yesterday);
  await page.getByRole("button", { name: "오늘로 돌아가기" }).click();
  await expect(page.locator('input[name="date"]')).toHaveValue(todayInSeoul());
});

test("text menus, empty states, and upstream failures are explicit", async ({ page }) => {
  await page.getByRole("button", { name: "텍스트 식당 메뉴 크게 보기", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".dialog-menu-text")).toContainText("김치찌개");
  await page.keyboard.press("Escape");

  await page.unroute("**/api/menus**");
  await page.route("**/api/menus**", (route) => {
    const empty = fixture();
    empty.snapshot.menus = [];
    return route.fulfill({ json: empty });
  });
  await page.getByRole("button", { name: "메뉴 다시 불러오기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "아직 올라온 메뉴가 없어요" })).toBeVisible();

  await page.unroute("**/api/menus**");
  await page.route("**/api/menus**", (route) => route.fulfill({
    status: 502,
    json: { status: "error", date: todayInSeoul(), message: "테스트용 네트워크 오류입니다. 다시 시도해주세요." },
  }));
  await page.getByRole("button", { name: "메뉴 다시 불러오기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "메뉴판이 잠시 길을 잃었어요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 불러오기", exact: true })).toBeVisible();
});

test("expired snapshots are labeled and a failed background refresh preserves visible menus", async ({ page }) => {
  const now = new Date(`${todayInSeoul()}T11:00:00+09:00`);
  await page.clock.install({ time: now });
  const stale = fixture();
  stale.stale = true;
  stale.snapshot.collectedAt = new Date(now.getTime() - 6 * 60_000).toISOString();
  await page.unroute("**/api/menus**");
  await page.route("**/api/menus**", (route) => route.fulfill({ json: stale }));
  await page.getByRole("button", { name: "메뉴 다시 불러오기", exact: true }).click();
  await expect(page.locator(".stale-notice")).toBeVisible();
  await expect(page.locator(".menu-card")).toHaveCount(3);
  await page.unroute("**/api/menus**");
  await page.route("**/api/menus**", (route) => route.fulfill({
    status: 502,
    json: { status: "error", date: todayInSeoul(), message: "백그라운드 갱신 실패. 원문을 확인해주세요." },
  }));
  await page.clock.fastForward(60_001);
  await expect(page.getByRole("alert").filter({ hasText: "백그라운드 갱신 실패" })).toBeVisible();
  await expect(page.locator(".menu-card")).toHaveCount(3);
});
