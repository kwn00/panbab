import { LunchApp } from "@/components/lunch-app";
import { InvalidDateError, isDateKey, todayInSeoul } from "@/lib/dates";
import { getMenus, menuErrorState } from "@/lib/menu-service";
import type { MenuState } from "@/lib/model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const today = todayInSeoul();
  const query = await searchParams;
  const requestedDate = typeof query.date === "string" ? query.date : today;
  const date = isDateKey(requestedDate) ? requestedDate : today;
  const initialState = await getMenus(requestedDate).catch((error: unknown): MenuState => {
    if (error instanceof InvalidDateError) {
      return { status: "error", date, message: error.message };
    }
    return menuErrorState(date, error);
  });
  const category = query.category === "한식뷔페" || query.category === "구내식당"
    ? query.category
    : "전체";
  const initialQuery = typeof query.q === "string" ? query.q : "";
  const savedOnly = query.view === "saved";
  return (
    <LunchApp
      key={JSON.stringify([date, category, initialQuery, savedOnly])}
      today={today}
      initialDate={date}
      initialState={initialState}
      initialCategory={category}
      initialQuery={initialQuery}
      initialSavedOnly={savedOnly}
    />
  );
}
