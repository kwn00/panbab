import { todayInSeoul } from "./dates";
import type { LunchMenu } from "./model";

export function preferredImageIndex(menu: LunchMenu): number {
  const date = todayInSeoul(new Date(menu.publishedAt));
  const index = menu.images.findIndex((image) => {
    const filename = new URL(image.originalUrl).pathname.split("/").at(-1) ?? "";
    return filename.includes(date) || filename.includes(date.replaceAll("-", ""));
  });
  return Math.max(0, index);
}
