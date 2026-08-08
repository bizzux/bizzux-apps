import { NextResponse } from "next/server";
import { requireSuperAdmin, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await requireSuperAdmin(req);
    const snap = await adminDb().collection("plans").orderBy("sortOrder", "asc").get();
    const plans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ plans });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    await requireSuperAdmin(req);
    const body = await req.json();
    const { action, id } = body;

    if (action === "create") {
      const { name, price, billingPeriod, description, features, popular, active, sortOrder } = body;
      if (!name || price === undefined) throw { status: 400, message: "Name and price are required" };
      const ref = await adminDb().collection("plans").add({
        name, price: Number(price), billingPeriod: billingPeriod || "month",
        description: description || "", features: Array.isArray(features) ? features : [],
        popular: !!popular, active: active !== false, sortOrder: Number(sortOrder) || 0,
        createdAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ ok: true, id: ref.id });
    }

    if (action === "update") {
      if (!id) throw { status: 400, message: "Plan id required" };
      const { name, price, billingPeriod, description, features, popular, active, sortOrder } = body;
      await adminDb().doc("plans/" + id).set({
        name, price: Number(price), billingPeriod: billingPeriod || "month",
        description: description || "", features: Array.isArray(features) ? features : [],
        popular: !!popular, active: active !== false, sortOrder: Number(sortOrder) || 0,
      }, { merge: true });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      if (!id) throw { status: 400, message: "Plan id required" };
      await adminDb().doc("plans/" + id).delete();
      return NextResponse.json({ ok: true });
    }

    throw { status: 400, message: "Unknown action" };
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: e.status || 500 });
  }
}
