import { NextResponse } from "next/server";
import { requireUser, resolveAccount } from "@/lib/firebaseAdmin";
import { createHmac } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bizzux Shop is its own, separate Firebase project (potentially one per
// customer down the line) — this app has no Admin SDK access to it, so
// sign-on can't be done with a Firebase custom token minted here. Instead
// this mints a short-lived, HMAC-signed hand-off token that Shop's own
// /api/sso route verifies (both sides share SHOP_SSO_SECRET) and uses to
// create/sign in the matching account in ITS project.
//
// SHOP_URL lets this point at a local Shop dev server for testing (e.g.
// SHOP_URL=http://localhost:3000 in .env.local) — leave it unset in
// production/Vercel and it falls back to the real deployed Shop.
const SHOP_URL = process.env.SHOP_URL || "https://shop.bizzux.com";

export async function GET(req) {
  try {
    const c = await requireUser(req);
    const acct = await resolveAccount(c.uid);
    const secret = process.env.SHOP_SSO_SECRET;
    if (!secret) throw { status: 500, message: "SHOP_SSO_SECRET is not configured" };

    const payload = {
      email: c.email,
      role: acct.profile === "Administrator" ? "owner" : "shopkeeper",
      iat: Date.now(),
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", secret).update(payloadB64).digest("hex");
    const token = payloadB64 + "." + sig;

    return NextResponse.json({ url: `${SHOP_URL}/sso?token=${token}` });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: e.status || 500 });
  }
}
