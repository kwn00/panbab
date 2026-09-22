import { InvalidDateError, todayInSeoul } from "@/lib/dates";
import { getMenus, menuErrorState } from "@/lib/menu-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? todayInSeoul();
  try {
    return Response.json(await getMenus(date), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof InvalidDateError) {
      return Response.json(
        { status: "error", date, message: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(menuErrorState(date, error), {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
