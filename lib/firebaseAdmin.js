// SERVER ONLY — used by API routes. Never imported in client components.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
  const creds = JSON.parse(raw);
  if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  return initializeApp({ credential: cert(creds) });
}

export function adminAuth() {
  return getAuth(getAdminApp());
}
export function adminDb() {
  return getFirestore(getAdminApp());
}

export function superEmails() {
  return (process.env.SUPER_ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
}

// Verifies the bearer token on a request and returns { uid, email, isSuper }.
// Throws { status, message } on failure — callers should catch and respond.
export async function requireUser(req) {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) throw { status: 401, message: "Not signed in" };
  const decoded = await adminAuth().verifyIdToken(token);
  const email = (decoded.email || "").toLowerCase();
  const isSuper = superEmails().includes(email);
  return { uid: decoded.uid, email, isSuper };
}

export async function requireSuperAdmin(req) {
  const c = await requireUser(req);
  if (!c.isSuper) throw { status: 403, message: "Super admin access required" };
  return c;
}
