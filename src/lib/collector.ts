import { articleUrl } from "./config";
import { collectionWindow, isMorningPost } from "./dates";
import type { LunchMenu, MenuSnapshot } from "./model";
import { NaverClient, PrivateArticleError, SourceError, type ArticleSummary } from "./naver";
import { identifyRestaurant } from "./restaurants";

export function isMenuTitle(title: string): boolean {
  return (
    /메뉴|매뉴|식단|점심|차림/.test(title) &&
    !/못.{0,8}올|업로드.{0,8}불가|이용\s*안내|식당\s*안내|휴무|휴업|휴관|공지/.test(title)
  );
}

export function titleMatchesDate(title: string, date: string): boolean {
  const monthDay = Number(date.slice(5, 7)) * 100 + Number(date.slice(8, 10));
  const matches = Array.from(
    title.matchAll(/(\d{1,2})\s*(?:월\s*|\/)(\d{1,2})\s*일?/g),
    (match) => Number(match[1]) * 100 + Number(match[2]),
  );
  if (matches.length === 0) return true;
  if (matches.length >= 2 && /[~～\-–]/.test(title)) {
    const [start, end] = matches;
    return start <= end
      ? monthDay >= start && monthDay <= end
      : monthDay >= start || monthDay <= end;
  }
  return matches.includes(monthDay);
}

export interface MenuSource {
  listPage(page: number): Promise<ArticleSummary[]>;
  article(id: number): ReturnType<NaverClient["article"]>;
}

export async function collectMenus(
  date: string,
  source: MenuSource = new NaverClient(fetch, AbortSignal.timeout(45_000)),
  now = new Date(),
): Promise<MenuSnapshot> {
  const { start, end } = collectionWindow(date);
  if (now < start) throw new SourceError("아직 오지 않은 날짜의 메뉴는 수집할 수 없습니다.");
  const candidates = new Map<number, ArticleSummary>();
  let complete = false;

  for (let page = 1; page <= 10; page += 1) {
    const articles = await source.listPage(page);
    for (const article of articles) {
      if (
        article.openArticle &&
        !article.blindArticle &&
        !article.restrictMenu &&
        article.writeDateTimestamp <= now.getTime() &&
        isMorningPost(article.writeDateTimestamp, date) &&
        isMenuTitle(article.subject) &&
        titleMatchesDate(article.subject, date)
      ) {
        candidates.set(article.articleId, article);
      }
    }
    if (
      articles.length < 50 ||
      (articles.at(-1)?.writeDateTimestamp ?? 0) < start.getTime()
    ) {
      complete = true;
      break;
    }
  }
  if (!complete) {
    throw new SourceError("조회 범위를 초과해 해당 날짜의 메뉴 전체를 확인하지 못했습니다.");
  }

  const menus: LunchMenu[] = [];
  const warnings: string[] = [];
  const articles = [...candidates.values()];
  for (let offset = 0; offset < articles.length; offset += 3) {
    const results = await Promise.all(
      articles.slice(offset, offset + 3).map(async (summary) => {
        try {
          const article = await source.article(summary.articleId);
          if (
            article.writeDate > now.getTime() ||
            !isMorningPost(article.writeDate, date) ||
            !isMenuTitle(article.subject) ||
            !titleMatchesDate(article.subject, date)
          ) {
            warnings.push(`게시글 ${summary.articleId}의 날짜 또는 내용이 변경되어 제외했습니다.`);
            return null;
          }
          warnings.push(...article.warnings.map((warning) => `${article.id}: ${warning}`));
          if (!article.images.length && !article.text) {
            warnings.push(`게시글 ${article.id}에 표시할 이미지나 텍스트가 없습니다.`);
            return null;
          }
          return {
            id: article.id,
            title: article.subject,
            publishedAt: new Date(article.writeDate).toISOString(),
            sourceUrl: articleUrl(article.id),
            restaurant: identifyRestaurant(article.subject, article.id),
            images: article.images,
            text: article.text,
          } satisfies LunchMenu;
        } catch (error) {
          if (!(error instanceof PrivateArticleError)) throw error;
          warnings.push(error.message);
          return null;
        }
      }),
    );
    menus.push(...results.filter((menu) => menu !== null));
  }
  if (warnings.length) console.warn("[panbab:collector]", { date, warnings });

  return {
    version: 1,
    date,
    cutoffAt: end.toISOString(),
    collectedAt: now.toISOString(),
    menus: menus.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.id - a.id),
    warnings,
  };
}
