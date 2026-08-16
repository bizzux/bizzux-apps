"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyPasswordResetCode, confirmPasswordReset, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const invite = params.get("invite") || "";
  const oobCode = params.get("oobCode") || "";
  const mode = params.get("mode") || "";

  const [email, setEmail] = useState(null); // null = checking, "" = invalid
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invite || mode !== "resetPassword" || !oobCode) {
      setEmail("");
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((e) => setEmail(e))
      .catch(() => setEmail(""));
  }, [invite, mode, oobCode]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      await signInWithEmailAndPassword(auth, email, password);
      const token = await auth.currentUser.getIdToken();
      const r = await fetch("/api/team/accept", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ invite }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't finish setting up your account");
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "That didn't work. Please try again or ask your admin to resend the invite.");
      setBusy(false);
    }
  }

  if (email === null) {
    return <div className="login-wrap"><p style={{ color: "#fff" }}>Checking your invite…</p></div>;
  }

  if (!email) {
    return (
      <div className="login-wrap">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
          <h1>Invite link invalid</h1>
          <p className="sub">This invite link is invalid or has expired. Ask whoever invited you to resend it.</p>
          <Link href="/login" className="btn-primary" style={{ display: "inline-flex", marginTop: 10 }}>
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <Link href="/" className="logo-text" style={{ display: "block", marginBottom: 22 }}>
          bizzux<span className="dot">.</span>
        </Link>
        <h1>You&apos;re invited!</h1>
        <p className="sub">Set a password for <strong>{email}</strong> to join the team.</p>

        <form onSubmit={submit} noValidate>
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="label">Confirm password</label>
            <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button className="btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={busy}>
            {busy ? "Setting up…" : "Join team"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="login-wrap"><p style={{ color: "#fff" }}>Loading…</p></div>}>
      <AcceptInviteInner />
    </Suspense>
  );
}
