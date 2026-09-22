import assert from "node:assert/strict";
import test from "node:test";
import { collectMenus, isMenuTitle, titleMatchesDate, type MenuSource } from "./collector";
import { articleUrl, CACHE_REVALIDATE_SECONDS, isMenuImageUrl, SOURCE } from "./config";
import {
  collectionWindow, InvalidDateError, isDateKey, isMorningPost,
  isSnapshotStale, shiftDate, todayInSeoul, validateRequestedDate,
} from "./dates";
import { NaverClient, parseArticleHtml, PrivateArticleError, type ArticleSummary } from "./naver";
import { identifyRestaurant } from "./restaurants";
import { preferredImageIndex } from "./menu-images";

const date = "2026-09-22";
const now = new Date("2026-09-22T01:40:00.000Z");
const imageUrl = "https://cafeptthumb-phinf.pstatic.net/menu.jpg";

function summary(id: number, overrides: Partial<ArticleSummary> = {}): ArticleSummary {
  return {
    articleId: id,
    cafeId: SOURCE.cafeId,
    menuId: SOURCE.menuId,
    subject: "9월22일 해담가 오늘 메뉴",
    writeDateTimestamp: Date.parse("2026-09-22T01:00:00Z"),
    openArticle: true,
    blindArticle: false,
    restrictMenu: false,
    ...overrides,
  };
}

function detail(item: ArticleSummary) {
  return {
    id: item.articleId,
    subject: item.subject,
    contentHtml: "",
    writeDate: item.writeDateTimestamp,
    isReadable: true,
    isOpen: true,
    isBlind: false,
    menu: { id: SOURCE.menuId },
    images: [{ url: imageUrl, originalUrl: imageUrl, width: 1200, height: 1600 }],
    text: "",
    warnings: [],
  };
}

function sourceFor(items: ArticleSummary[]): MenuSource {
  return {
    async listPage() { return items; },
    async article(id) {
      const item = items.find((entry) => entry.articleId === id);
      assert.ok(item);
      return detail(item);
    },
  };
}

test("KST date changes at 15:00 UTC, independently of the server time zone", () => {
  assert.equal(todayInSeoul(new Date("2026-09-21T14:59:59Z")), "2026-09-21");
  assert.equal(todayInSeoul(new Date("2026-09-21T15:00:00Z")), date);
  assert.equal(todayInSeoul(new Date("2026-12-31T15:00:00Z")), "2027-01-01");
});

test("collection includes midnight through 11:59:59.999 KST, but excludes noon", () => {
  const { start, end } = collectionWindow(date);
  assert.equal(start.toISOString(), "2026-09-21T15:00:00.000Z");
  assert.equal(end.toISOString(), "2026-09-22T03:00:00.000Z");
  assert.equal(isMorningPost(start.getTime() - 1, date), false);
  assert.equal(isMorningPost(start.getTime(), date), true);
  assert.equal(isMorningPost(end.getTime() - 1, date), true);
  assert.equal(isMorningPost(end.getTime(), date), false);
  assert.equal(isMorningPost(end.getTime() + 1, date), false);
  assert.equal(isMorningPost(Date.parse("2026-09-22T02:00:00Z"), date), true);
});

test("dates reject malformed, impossible, future, out-of-range, and traversal values", () => {
  assert.equal(isDateKey("2026-02-30"), false);
  assert.equal(isDateKey("2024-02-29"), true);
  assert.equal(isDateKey("../../etc/passwd"), false);
  assert.equal(shiftDate("2027-01-01", -1), "2026-12-31");
  assert.doesNotThrow(() => validateRequestedDate("2026-09-09", now));
  for (const invalid of ["2026-09-08", "2026-09-23", "2026-02-30", "x"]) {
    assert.throws(() => validateRequestedDate(invalid, now), InvalidDateError);
  }
});

test("daily menu recognition excludes operation guides and missing-menu announcements", () => {
  assert.equal(isMenuTitle("9월 22일 송원식당 점심메뉴입니다"), true);
  assert.equal(isMenuTitle("9/21~9/23 기업지원허브 구내식당 오늘 메뉴"), true);
  assert.equal(isMenuTitle("오늘 풍경매뉴 못올릴것 같아요"), false);
  assert.equal(isMenuTitle("구내식당 이용 안내"), false);
  assert.equal(isMenuTitle("오늘 휴무입니다"), false);
  assert.equal(titleMatchesDate("9월21일 오늘 메뉴", date), false);
  assert.equal(titleMatchesDate("9월 22일 오늘 메뉴", date), true);
  assert.equal(titleMatchesDate("9/21~9/23 구내식당 메뉴", date), true);
  assert.equal(titleMatchesDate("12/30~1/3 메뉴", "2027-01-02"), true);
  assert.equal(titleMatchesDate("오늘 점심 메뉴", date), true);
});

test("restaurant branches stay distinct and unknown restaurants are not invented", () => {
  assert.equal(identifyRestaurant("9월22일 판교트라이타워 정겨운맛풍경", 1).id, "jeonggyeoun-try");
  assert.equal(identifyRestaurant("9월22일 경기기업성장센터 정겨운맛풍경", 2).id, "jeonggyeoun-growth");
  assert.equal(identifyRestaurant("9월22일 정겨운맛풍경 2호점", 3).id, "jeonggyeoun-try");
  assert.equal(identifyRestaurant("오늘 메뉴", 4).id, "article-4");
  assert.equal(identifyRestaurant('오늘 "새로운 식당" 메뉴', 5).name, "새로운 식당");
});

test("image parser preserves original URLs, all images, dimensions, and text without executing HTML", () => {
  const result = parseArticleHtml(`
    <div class="se-main-container">
      <a data-linkdata='{"src":"${imageUrl}","originalWidth":"1200","originalHeight":"1600"}'>
        <img src="${imageUrl}?type=w1600">
      </a>
      <img src="${imageUrl}?type=w800">
      <img src="https://cafefiles.pstatic.net/second.png">
      <div>정식 메뉴</div><p>제육볶음<br>된장국</p><p>​</p>
      <script>DO_NOT_EXECUTE</script><iframe src="https://example.com"></iframe>
    </div>`);
  assert.equal(result.images.length, 2);
  assert.equal(result.images[0].originalUrl, imageUrl);
  assert.equal(result.images[0].url, `${imageUrl}?type=w1600`);
  assert.equal(result.images[0].width, 1200);
  assert.equal(result.images[0].height, 1600);
  assert.match(result.text, /정식 메뉴/);
  assert.match(result.text, /제육볶음\n된장국/);
  assert.doesNotMatch(result.text, /DO_NOT_EXECUTE|\u200B/);
  assert.deepEqual(result.warnings, []);
});

test("legacy and text-only posts retain their text rather than disappearing", () => {
  const result = parseArticleHtml("점심 메뉴<br><b>김치찌개</b><p>11:00부터</p>");
  assert.match(result.text, /점심 메뉴\n김치찌개/);
  assert.match(result.text, /11:00부터/);
  assert.deepEqual(result.images, []);
});

test("untrusted image hosts and malformed metadata produce explicit warnings", () => {
  assert.equal(isMenuImageUrl(imageUrl), true);
  for (const url of [
    "http://cafeptthumb-phinf.pstatic.net/a.jpg",
    "https://cafeptthumb-phinf.pstatic.net.evil.test/a.jpg",
    "https://example.com/a.jpg",
    "https://name:pass@cafefiles.pstatic.net/a.jpg",
    "javascript:alert(1)",
    "data:image/svg+xml,hello",
  ]) assert.equal(isMenuImageUrl(url), false);
  const result = parseArticleHtml(`<a data-linkdata='not json'><img src="${imageUrl}"></a><img src="https://example.com/a.jpg">`);
  assert.equal(result.images.length, 1);
  assert.equal(result.warnings.length, 2);
});

test("collector includes late morning menus but excludes previous-day, noon, private and future posts", async () => {
  const items = [
    summary(1),
    summary(2, { writeDateTimestamp: Date.parse("2026-09-22T02:59:59Z") }),
    summary(3, { writeDateTimestamp: Date.parse("2026-09-22T03:00:00Z") }),
    summary(4, { writeDateTimestamp: Date.parse("2026-09-21T14:59:59Z") }),
    summary(5, { openArticle: false }),
    summary(6, { restrictMenu: true }),
    summary(7, { blindArticle: true }),
    summary(8, { subject: "9월21일 해담가 오늘 메뉴" }),
    summary(9, { subject: "오늘 풍경매뉴 못올릴것 같아요" }),
  ];
  const result = await collectMenus(date, sourceFor(items), new Date("2026-09-22T04:00:00Z"));
  assert.deepEqual(result.menus.map((menu) => menu.id), [2, 1]);
  assert.equal(result.cutoffAt, "2026-09-22T03:00:00.000Z");
  assert.equal(result.menus[0].sourceUrl, articleUrl(2));
  const earlyVisit = await collectMenus(date, sourceFor(items), now);
  assert.deepEqual(earlyVisit.menus.map((menu) => menu.id), [1]);
});

test("collector follows pagination and deduplicates repeated article IDs", async () => {
  const late = Array.from({ length: 50 }, (_, index) =>
    summary(index + 100, { writeDateTimestamp: Date.parse("2026-09-22T03:00:00Z") }),
  );
  const pages: number[] = [];
  const source: MenuSource = {
    async listPage(page) {
      pages.push(page);
      return page === 1 ? late : [summary(1), summary(1), summary(2)];
    },
    async article(id) { return detail(summary(id)); },
  };
  const result = await collectMenus(date, source, now);
  assert.deepEqual(pages, [1, 2]);
  assert.deepEqual(result.menus.map((menu) => menu.id), [2, 1]);
});

test("failed upstream requests never become a successful empty snapshot", async () => {
  const source = sourceFor([summary(1)]);
  source.article = async () => { throw new Error("upstream unavailable"); };
  await assert.rejects(collectMenus(date, source, now), /upstream unavailable/);
  await assert.rejects(
    collectMenus(date, source, new Date("2026-09-21T14:59:59Z")),
    /아직 오지 않은 날짜/,
  );
});

test("incomplete pagination fails rather than silently dropping menu posts", async () => {
  const source = sourceFor(Array.from({ length: 50 }, (_, index) => summary(index + 1)));
  await assert.rejects(collectMenus(date, source, now), /조회 범위/);
});

test("a newly private article is skipped with a visible warning, never bypassed", async (context) => {
  context.mock.method(console, "warn", () => {});
  const source = sourceFor([summary(1), summary(2)]);
  source.article = async (id) => {
    if (id === 1) throw new PrivateArticleError("게시글 1은 비공개입니다.");
    return detail(summary(id));
  };
  const result = await collectMenus(date, source, now);
  assert.deepEqual(result.menus.map((menu) => menu.id), [2]);
  assert.deepEqual(result.warnings, ["게시글 1은 비공개입니다."]);
});

test("public client sends no credentials, validates source identity, and surfaces HTTP failures", async () => {
  const request: typeof fetch = async (_url, options) => {
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("authorization"), null);
    assert.equal(headers.get("cookie"), null);
    assert.equal(options?.cache, "no-store");
    return Response.json({ result: { articleList: [{ type: "ARTICLE", item: summary(1) }] } });
  };
  assert.equal((await new NaverClient(request).listPage(1))[0].articleId, 1);
  const wrongBoard: typeof fetch = async () => Response.json({
    result: { articleList: [{ type: "ARTICLE", item: summary(1, { menuId: 99 }) }] },
  });
  await assert.rejects(new NaverClient(wrongBoard).listPage(1), /다른 게시글/);
  const failing: typeof fetch = async () => new Response("", { status: 503 });
  await assert.rejects(new NaverClient(failing).listPage(1), /503/);
});

test("private article responses are rejected before content can be used", async () => {
  const request: typeof fetch = async () => Response.json({
    result: { article: { ...detail(summary(1)), isReadable: false } },
  });
  await assert.rejects(new NaverClient(request).article(1), PrivateArticleError);
});

test("cache freshness turns stale at exactly five minutes", () => {
  assert.equal(CACHE_REVALIDATE_SECONDS, 300);
  const collectedAt = "2026-09-22T01:00:00.000Z";
  assert.equal(isSnapshotStale(collectedAt, new Date("2026-09-22T01:04:59.999Z")), false);
  assert.equal(isSnapshotStale(collectedAt, new Date("2026-09-22T01:05:00.000Z")), true);
  assert.equal(isSnapshotStale(collectedAt, new Date("2026-09-22T01:30:00.000Z")), true);
});

test("an early visitor gets menus already posted, without waiting until 10:30", async () => {
  const item = summary(1, { writeDateTimestamp: Date.parse("2026-09-21T22:00:00Z") });
  const result = await collectMenus(date, sourceFor([item]), new Date("2026-09-21T23:00:00Z"));
  assert.equal(result.menus.length, 1);
});

test("preview prefers a dated filename without discarding or reordering other images", async () => {
  const snapshot = await collectMenus(date, sourceFor([summary(1)]), now);
  const menu = snapshot.menus[0];
  const image = menu.images[0];
  menu.images = [
    { ...image, originalUrl: "https://cafefiles.pstatic.net/2026-09-22/promotion.png" },
    { ...image, originalUrl: "https://cafefiles.pstatic.net/screenshot_2026-09-22.png" },
    { ...image, originalUrl: "https://cafefiles.pstatic.net/map.png" },
  ];
  assert.equal(preferredImageIndex(menu), 1);
  assert.equal(menu.images.length, 3);
  assert.match(menu.images[0].originalUrl, /promotion/);
  menu.images = [image];
  assert.equal(preferredImageIndex(menu), 0);
});
