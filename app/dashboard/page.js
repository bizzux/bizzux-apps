"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";

const APPS = [
  { key: "juicechatjunction", name: "Bizzux Shop", icon: "🏪", desc: "POS & shop management", live: true },
  { key: "pos", name: "Bizzux POS", icon: "🧾", desc: "Coming soon", live: false },
];

function daysLeft(trialEndDate) {
  if (!trialEndDate) return null;
  const end = trialEndDate.toDate ? trialEndDate.toDate() : new Date(trialEndDate);
  const ms = end.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null); // null = loading

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "customers", user.uid));
        setCustomer(snap.exists() ? snap.data() : {});
      } catch {
        setCustomer({});
      }
    })();
  }, [user]);

  if (!user || customer === null) {
    return <div className="login-wrap"><p style={{ color: "#fff" }}>Loading…</p></div>;
  }

  const remaining = daysLeft(customer.trialEndDate);
  const status = customer.status || "trial";
  const expired = status === "trial" && remaining !== null && remaining <= 0;

  return (
    <div>
      <div className="dash-topbar">
        <Link href="/" className="logo-text">bizzux<span className="dot">.</span></Link>
        <div className="right">
          <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.75)" }}>{user.email}</span>
          <button className="signout-link" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

      {status === "trial" && !expired && remaining !== null && (
        <div className="trial-banner">Free trial — {remaining} day{remaining === 1 ? "" : "s"} left</div>
      )}
      {expired && (
        <div className="trial-banner expired">Your trial has ended — choose a plan to keep going</div>
      )}

      <div className="dash-body">
        <h1 className="dash-heading">Your apps</h1>
        <p className="dash-sub">
          <span className={"status-pill " + status}>{status === "trial" ? "Trial" : status === "active" ? "Active" : "Expired"}</span>
          {"  "}
          {customer.planName ? <>· Plan: {customer.planName}</> : (
            <>· <Link href="/pricing" style={{ color: "var(--blue)", fontWeight: 700 }}>Choose a plan</Link></>
          )}
        </p>

        <div className="app-grid">
          {APPS.map((a) => (
            <div key={a.key} className={"app-tile" + (a.live ? "" : " locked")}>
              <div className="app-tile-icon">{a.icon}</div>
              <div className="app-tile-name">{a.name}</div>
              <div className={"app-tile-status" + (a.live ? " live" : "")}>
                {a.live ? "Request access →" : a.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
