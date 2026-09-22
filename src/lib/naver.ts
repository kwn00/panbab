import { load } from "cheerio";
import { z } from "zod";
import { SOURCE, isMenuImageUrl } from "./config";
import type { MenuImage } from "./model";

export class SourceError extends Error {}
export class PrivateArticleError extends SourceError {}

const listItemSchema = z.object({
  articleId: z.number().int().positive(),
  cafeId: z.number().int(),
  menuId: z.number().int(),
  subject: z.string(),
  writeDateTimestamp: z.number(),
  openArticle: z.boolean(),
  blindArticle: z.boolean(),
  restrictMenu: z.boolean(),
});

const listSchema = z.object({
  result: z.object({
    articleList: z.array(z.object({ type: z.string(), item: z.unknown().optional() })),
  }),
});

const articleSchema = z.object({
  result: z.object({
    article: z.object({
      id: z.number().int().positive(),
      subject: z.string(),
      contentHtml: z.string(),
      writeDate: z.number(),
      isReadable: z.boolean(),
      isOpen: z.boolean(),
      isBlind: z.boolean(),
      menu: z.object({ id: z.number().int() }),
    }),
  }),
});

const imageDataSchema = z.object({
  src: z.string().optional(),
  originalWidth: z.coerce.number().positive().optional(),
  originalHeight: z.coerce.number().positive().optional(),
});

export type ArticleSummary = z.infer<typeof listItemSchema>;

export function parseArticleHtml(html: string) {
  const $ = load(html);
  $("script, style, iframe, object, embed").remove();
  const root = $(".se-main-container").length ? $(".se-main-container").first() : $("body");
  const images: MenuImage[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  root.find("img").each((_, element) => {
    const image = $(element);
    const src = image.attr("src") || image.attr("data-src") || "";
    let metadata: z.infer<typeof imageDataSchema> | undefined;
    const raw = image.closest("a[data-linkdata]").attr("data-linkdata");
    if (raw) {
      try {
        const decoded: unknown = JSON.parse(raw);
        const parsed = imageDataSchema.safeParse(decoded);
        if (parsed.success) metadata = parsed.data;
        else warnings.push("이미지 부가정보를 읽지 못해 게시글의 이미지 주소를 사용했습니다.");
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        warnings.push("이미지 부가정보가 올바른 JSON이 아닙니다.");
      }
    }
    const original = metadata?.src || src;
    if (!isMenuImageUrl(original) || (src && !isMenuImageUrl(src))) {
      warnings.push("지원하지 않는 이미지 주소가 있어 원문 확인이 필요합니다.");
      return;
    }
    const key = new URL(original);
    key.searchParams.delete("type");
    if (seen.has(key.href)) return;
    seen.add(key.href);
    images.push({
      url: src || original,
      originalUrl: original,
      width: metadata?.originalWidth ?? null,
      height: metadata?.originalHeight ?? null,
    });
  });

  root.find("br").replaceWith("\n");
  root.find("p, li, div, tr, h1, h2, h3, h4").append("\n");
  root.find("td, th").append(" ");
  const text = root.text()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { images, text, warnings };
}

export class NaverClient {
  constructor(
    private readonly request: typeof fetch = fetch,
    private readonly signal?: AbortSignal,
  ) {}

  private async json(url: string): Promise<unknown> {
    const timeout = AbortSignal.timeout(8_000);
    const response = await this.request(url, {
      cache: "no-store",
      headers: { Accept: "application/json", Referer: SOURCE.url },
      signal: this.signal ? AbortSignal.any([this.signal, timeout]) : timeout,
    });
    if (!response.ok) {
      throw new SourceError(`네이버 카페 응답 오류 (${response.status})`);
    }
    return response.json();
  }

  async listPage(page: number): Promise<ArticleSummary[]> {
    const url = new URL(
      `https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/${SOURCE.cafeId}/menus/${SOURCE.menuId}/articles`,
    );
    url.search = new URLSearchParams({
      page: String(page),
      pageSize: "50",
      sortBy: "TIME",
      viewType: "L",
    }).toString();
    const parsed = listSchema.safeParse(await this.json(url.href));
    if (!parsed.success) throw new SourceError("네이버 게시글 목록 형식이 변경되었습니다.");
    return parsed.data.result.articleList
      .filter((entry) => entry.type === "ARTICLE")
      .map((entry) => {
        const item = listItemSchema.safeParse(entry.item);
        if (!item.success) throw new SourceError("네이버 게시글 정보를 읽을 수 없습니다.");
        if (item.data.cafeId !== SOURCE.cafeId || item.data.menuId !== SOURCE.menuId) {
          throw new SourceError("요청한 게시판과 다른 게시글이 반환되었습니다.");
        }
        return item.data;
      });
  }

  async article(id: number) {
    const url = new URL(
      `https://article.cafe.naver.com/gw/v4/cafes/${SOURCE.cafeId}/articles/${id}`,
    );
    url.search = new URLSearchParams({
      menuId: String(SOURCE.menuId),
      boardType: "L",
      useCafeId: "true",
      requestFrom: "A",
    }).toString();
    const parsed = articleSchema.safeParse(await this.json(url.href));
    if (!parsed.success) throw new SourceError(`게시글 ${id}의 본문을 읽을 수 없습니다.`);
    const article = parsed.data.result.article;
    if (!article.isReadable || !article.isOpen || article.isBlind) {
      throw new PrivateArticleError(`게시글 ${id}은 현재 전체 공개 상태가 아닙니다.`);
    }
    if (article.id !== id || article.menu.id !== SOURCE.menuId) {
      throw new SourceError("요청한 글과 다른 본문이 반환되었습니다.");
    }
    return { ...article, ...parseArticleHtml(article.contentHtml) };
  }
}
