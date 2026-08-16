import { NextResponse } from "next/server";
import { requireUser, adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { DEFAULT_PROFILE } from "@/lib/roles";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called from /accept-invite once the invited person has finished setting
// their password and signed in. Finalizes their membership: marks the team
// roster row active, records the reverse-lookup membership doc, and burns
// the one-time invite token.
export async function POST(req) {
  try {
    const c = await requireUser(req);
    const { invite } = await req.json();
    const token = String(invite || "");
    if (!token) throw { status: 400, message: "Missing invite" };

    const inviteRef = adminDb().doc("invites/" + token);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
      throw { status: 404, message: "This invite link is invalid or has already been used." };
    }
    const inv = inviteSnap.data();

    if (inv.used) throw { status: 410, message: "This invite has already been used." };
    if (inv.expiresAt && inv.expiresAt.toMillis() < Date.now()) {
      throw { status: 410, message: "This invite link has expired. Ask an admin to resend it." };
    }
    if ((inv.email || "").toLowerCase() !== c.email.toLowerCase()) {
      throw { status: 403, message: "This invite was sent to a different email address." };
    }

    // Setting a password via the reset-password flow proves inbox
    // ownership, same as clicking a verification link.
    await adminAuth().updateUser(c.uid, { emailVerified: true });

    await adminDb()
      .doc(`customers/${inv.accountId}/team/${inv.teamMemberId}`)
      .set({ status: "active", uid: c.uid, joinedAt: FieldValue.serverTimestamp() }, { merge: true });

    await adminDb()
      .doc("memberships/" + c.uid)
      .set({
        accountId: inv.accountId,
        profile: inv.profile || DEFAULT_PROFILE,
        role: inv.role || "",
        email: c.email,
        joinedAt: FieldValue.serverTimestamp(),
      });

    await inviteRef.set({ used: true }, { merge: true });

    return NextResponse.json({ ok: true, accountId: inv.accountId });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: e.status || 500 });
  }
}
