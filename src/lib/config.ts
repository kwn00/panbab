export const SOURCE = {
  cafeId: 30487307,
  menuId: 26,
  name: "2판교 라이프",
  url: "https://cafe.naver.com/f-e/cafes/30487307/menus/26?viewType=L",
} as const;

/** While today's morning posts can still arrive, before noon KST. */
export const OPEN_WINDOW_REVALIDATE_SECONDS = 60;
/** After the noon cutoff. A later post is not part of that day's menu. */
export const CLOSED_WINDOW_REVALIDATE_SECONDS = 300;
export const HISTORY_DAYS = 14;

const imageHosts = new Set([
  "cafeptthumb-phinf.pstatic.net",
  "cafefiles.pstatic.net",
  "cafephinf.pstatic.net",
  "postfiles.pstatic.net",
]);

export function isMenuImageUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    imageHosts.has(url.hostname) &&
    !url.username &&
    !url.password &&
    !url.port
  );
}

export function articleUrl(id: number): string {
  return `https://cafe.naver.com/f-e/cafes/${SOURCE.cafeId}/articles/${id}`;
}
