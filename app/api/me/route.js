import { NextResponse } from "next/server";
import { requireUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const c = await requireUser(req);
    return NextResponse.json({ superAdmin: c.isSuper });
  } catch {
    return NextResponse.json({ superAdmin: false });
  }
}
