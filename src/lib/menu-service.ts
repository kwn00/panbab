import { unstable_cache } from "next/cache";
import { collectMenus } from "./collector";
import { freshnessBucket, isSnapshotStale, revalidateSecondsFor, validateRequestedDate } from "./dates";
import type { MenuSnapshot, MenuState } from "./model";

const pending = new Map<string, Promise<MenuSnapshot>>();
const latest = new Map<string, MenuSnapshot>();

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

function remember(snapshot: MenuSnapshot) {
  const current = latest.get(snapshot.date);
  if (!current || current.collectedAt <= snapshot.collectedAt) {
    latest.set(snapshot.date, snapshot);
  }
}

// Time-based revalidate serves the previous snapshot and refreshes in the
// background. On a dynamic route that stale snapshot is what the visitor sees,
// so a collection taken before the morning posts existed stays on screen.
// revalidate: false keeps an entry fresh, and the bucket argument makes the
// next interval a cache miss that waits for a new collection.
const cachedSnapshot = unstable_cache(
  async (date: string, bucket: string) => {
    if (!/^\d+:\d+$/.test(bucket)) {
      throw new Error("캐시 구간이 올바르지 않습니다.");
    }
    return collectOnce(date);
  },
  ["panbab-morning-menus-v3"],
  { revalidate: false },
);

export async function getMenus(
  date: string,
  now = new Date(),
  options?: { fresh?: boolean },
): Promise<MenuState> {
  validateRequestedDate(date, now);
  const ttl = revalidateSecondsFor(date, now);
  const remembered = latest.get(date);
  if (!options?.fresh && remembered && !isSnapshotStale(remembered.collectedAt, now, ttl)) {
    return { status: "ready", snapshot: remembered, stale: false };
  }

  try {
    const snapshot = options?.fresh
      ? await collectOnce(date)
      : await cachedSnapshot(date, freshnessBucket(date, now));
    if (!options?.fresh && isSnapshotStale(snapshot.collectedAt, now, ttl)) {
      const freshSnapshot = await collectOnce(date);
      remember(freshSnapshot);
      return { status: "ready", snapshot: freshSnapshot, stale: false };
    }
    remember(snapshot);
    return { status: "ready", snapshot, stale: false };
  } catch (error) {
    if (remembered) {
      return { status: "ready", snapshot: remembered, stale: true };
    }
    throw error;
  }
}

export function menuErrorState(date: string, error: unknown): MenuState {
  console.error("[panbab:menus]", { date, error });
  return {
    status: "error",
    date,
    message: "메뉴를 불러오지 못했어요. 잠시 후 다시 시도하거나 카페 원문을 확인해주세요.",
  };
}
