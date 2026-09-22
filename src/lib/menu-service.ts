import { unstable_cache } from "next/cache";
import { collectMenus } from "./collector";
import { CACHE_REVALIDATE_SECONDS } from "./config";
import { isSnapshotStale, validateRequestedDate } from "./dates";
import type { MenuSnapshot, MenuState } from "./model";

const pending = new Map<string, Promise<MenuSnapshot>>();

function collectOnce(date: string): Promise<MenuSnapshot> {
  const running = pending.get(date);
  if (running) return running;
  const task = collectMenus(date)
    .catch((error: unknown) => {
      console.error("[panbab:cache-refresh]", { date, error });
      throw error;
    })
    .finally(() => pending.delete(date));
  pending.set(date, task);
  return task;
}

const cachedSnapshot = unstable_cache(collectOnce, ["panbab-morning-menus-v2"], {
  revalidate: CACHE_REVALIDATE_SECONDS,
});

export async function getMenus(date: string, now = new Date()): Promise<MenuState> {
  validateRequestedDate(date, now);
  const snapshot = await cachedSnapshot(date);
  return { status: "ready", snapshot, stale: isSnapshotStale(snapshot.collectedAt, now) };
}

export function menuErrorState(date: string, error: unknown): MenuState {
  console.error("[panbab:menus]", { date, error });
  return {
    status: "error",
    date,
    message: "메뉴를 불러오지 못했어요. 잠시 후 다시 시도하거나 카페 원문을 확인해주세요.",
  };
}
