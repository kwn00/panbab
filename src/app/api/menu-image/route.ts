import { menuImageResponse } from "@/lib/menu-image-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export function GET(request: Request): Promise<Response> {
  return menuImageResponse(request);
}
