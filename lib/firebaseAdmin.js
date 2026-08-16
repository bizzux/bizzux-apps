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

// Figures out which "account" a signed-in uid belongs to.
// - If they own a customers/{uid} doc, they're the account owner
//   (always an Administrator on their own account).
// - Otherwise, look up memberships/{uid} — set when they accepted a team
//   invite — to find which account they joined and what profile they hold.
// Throws { status, message } if neither exists (e.g. /api/claim hasn't run
// yet, or the invite was never accepted).
export async function resolveAccount(uid) {
  const ownerSnap = await adminDb().doc("customers/" + uid).get();
  if (ownerSnap.exists) {
    return { accountId: uid, profile: "Administrator", isOwner: true, customer: ownerSnap.data() };
  }
  const memSnap = await adminDb().doc("memberships/" + uid).get();
  if (!memSnap.exists) throw { status: 404, message: "No Bizzux account found for this sign-in" };
  const m = memSnap.data();
  return { accountId: m.accountId, profile: m.profile || "Standard", isOwner: false, membership: m };
}

export async function requireAccountAdmin(req) {
  const c = await requireUser(req);
  const acct = await resolveAccount(c.uid);
  if (acct.profile !== "Administrator") throw { status: 403, message: "Administrator access required" };
  return { ...c, ...acct };
}

// Sends a real Firebase Auth transactional email (password reset / email
// verification / email-link sign-in) via the public Identity Toolkit REST
// endpoint. The Admin SDK's generate*Link() helpers only *return* a link —
// they never send anything — so this is what actually gets an email into
// someone's inbox without standing up a separate email provider.
export async function sendAuthEmail({ requestType, email, continueUrl }) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType, email, continueUrl, canHandleCodeInApp: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Failed to send invite email");
  return data;
}
