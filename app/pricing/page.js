"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import Link from "next/link";
import Nav from "@/components/Nav";

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState(null); // null = loading
  const [user, setUser] = useState(null);
  const [pickingId, setPickingId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "plans"), orderBy("sortOrder", "asc")));
        setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.active !== false));
      } catch {
        setPlans([]);
      }
    })();
  }, []);

  async function choosePlan(planId) {
    if (!user) {
      router.push("/login?mode=signup");
      return;
    }
    setPickingId(planId);
    try {
      const token = await user.getIdToken();
      await fetch("/api/select-plan", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      router.push("/dashboard");
    } catch {
      setPickingId(null);
    }
  }

  return (
    <>
      <Nav />

      <div style={{ background: "var(--navy)", padding: "56px 24px 40px", textAlign: "center", color: "#fff" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 10 }}>Simple, transparent pricing</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>Start free. Upgrade whenever you're ready.</p>
      </div>

      <section className="section">
        {plans === null && <p className="muted" style={{ textAlign: "center" }}>Loading plans…</p>}
        {plans && plans.length === 0 && (
          <p className="muted" style={{ textAlign: "center" }}>We're putting the finishing touches on pricing. Check back soon!</p>
        )}
        {plans && plans.length > 0 && (
          <div className="pricing-grid">
            {plans.map((p) => (
              <div key={p.id} className={"plan-card" + (p.popular ? " popular" : "")}>
                {p.popular && <span className="plan-badge">Most popular</span>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-price">
                  ₹{p.price}
                  {p.billingPeriod && <span> / {p.billingPeriod}</span>}
                </div>
                {p.description && <p className="plan-desc">{p.description}</p>}
                {Array.isArray(p.features) && p.features.length > 0 && (
                  <ul className="plan-features">
                    {p.features.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
                <button
                  className="btn-primary" style={{ width: "100%" }}
                  onClick={() => choosePlan(p.id)}
                  disabled={pickingId === p.id}
                >
                  {pickingId === p.id ? "Selecting…" : user ? "Choose this plan" : "Start free trial"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
