import type { NextRequest } from "next/server";
import { GET as baseGET } from "@/app/api/clock/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;
export const preferredRegion = "home";

export async function GET(request: NextRequest) {
  return baseGET(request);
}

// TODO(update): Diverge this route from /api/clock when the /update experience
// needs different generation logic, prompt behavior, or response metadata.
