import { NextResponse } from "next/server";
import { requireUser, resolveAccount } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const c = await requireUser(req);
    let accountId = c.uid;
    let isAccountAdmin = true;
    let hasAccount = true;
    try {
      const acct = await resolveAccount(c.uid);
      accountId = acct.accountId;
      isAccountAdmin = acct.profile === "Administrator";
    } catch {
      // /api/claim hasn't run yet for this sign-in (e.g. right after
      // Google sign-in, before the client calls it) — no account yet.
      hasAccount = false;
    }
    return NextResponse.json({ superAdmin: c.isSuper, accountId, isAccountAdmin, hasAccount });
  } catch {
    return NextResponse.json({ superAdmin: false, isAccountAdmin: false, hasAccount: false });
  }
}
