"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

const TABS = [
  { id: "trial", label: "Trial settings" },
  { id: "plans", label: "Plans" },
  { id: "customers", label: "Customers" },
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isSuper, setIsSuper] = useState(null); // null = checking
  const [tab, setTab] = useState("trial");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const t = await user.getIdToken();
        const r = await fetch("/api/me", { headers: { Authorization: "Bearer " + t } });
        const d = await r.json();
        setIsSuper(d.superAdmin === true);
      } catch {
        setIsSuper(false);
      }
    })();
  }, [user]);

  if (!user || isSuper === null) {
    return <div className="admin-shell"><p className="muted">Loading…</p></div>;
  }
  if (!isSuper) {
    return (
      <div className="admin-shell">
        <p>You don't have access to this page.</p>
        <Link href="/dashboard" style={{ color: "var(--blue)", fontWeight: 700 }}>Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="dash-topbar">
        <Link href="/" className="logo-text">bizzux<span className="dot">.</span></Link>
        <div className="right">
          <Link href="/dashboard" className="signout-link">Dashboard</Link>
          <button className="signout-link" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

      <div className="admin-shell">
        <h1 className="dash-heading">Super Admin</h1>
        <p className="dash-sub">Trial length, packages, and all customer signups.</p>

        <div className="admin-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id} role="tab" aria-selected={tab === t.id}
              className={"admin-tab" + (tab === t.id ? " active" : "")}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "trial" && <TrialSettings />}
        {tab === "plans" && <PlansManager />}
        {tab === "customers" && <CustomersList />}
      </div>
    </div>
  );
}

async function api(path, method, body) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function TrialSettings() {
  const [trialDays, setTrialDays] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d = await api("/api/admin/settings", "GET");
        setTrialDays(String(d.trialDays ?? 14));
      } catch {
        setTrialDays("14");
      }
      setLoaded(true);
    })();
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await api("/api/admin/settings", "POST", { trialDays: Number(trialDays) });
      setMsg("Saved. Applies to new signups from now on.");
    } catch (err) {
      setMsg(err.message);
    }
    setSaving(false);
  }

  if (!loaded) return <p className="muted">Loading…</p>;

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <form onSubmit={save}>
        <label className="label">Trial length (days)</label>
        <input
          className="input" type="number" min="1" value={trialDays}
          onChange={(e) => setTrialDays(e.target.value)}
          style={{ marginBottom: 14 }}
          required
        />
        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        {msg && <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>{msg}</p>}
      </form>
    </div>
  );
}

const emptyPlan = { name: "", price: "", billingPeriod: "month", description: "", features: "", popular: false, active: true, sortOrder: 0 };

function PlansManager() {
  const [plans, setPlans] = useState(null);
  const [form, setForm] = useState(emptyPlan);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const d = await api("/api/admin/plans", "GET");
      setPlans(d.plans || []);
    } catch {
      setPlans([]);
    }
  }
  useEffect(() => { load(); }, []);

  function edit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name || "", price: p.price ?? "", billingPeriod: p.billingPeriod || "month",
      description: p.description || "", features: (p.features || []).join(", "),
      popular: !!p.popular, active: p.active !== false, sortOrder: p.sortOrder ?? 0,
    });
  }
  function resetForm() { setEditingId(null); setForm(emptyPlan); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const payload = {
        name: form.name, price: Number(form.price), billingPeriod: form.billingPeriod,
        description: form.description, popular: !!form.popular, active: !!form.active,
        sortOrder: Number(form.sortOrder) || 0,
        features: form.features.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (editingId) {
        await api("/api/admin/plans", "POST", { action: "update", id: editingId, ...payload });
      } else {
        await api("/api/admin/plans", "POST", { action: "create", ...payload });
      }
      resetForm();
      await load();
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  }

  async function remove(id) {
    if (!confirm("Delete this plan?")) return;
    try {
      await api("/api/admin/plans", "POST", { action: "delete", id });
      await load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  if (plans === null) return <p className="muted">Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1.1fr 1fr" }}>
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>{editingId ? "Edit plan" : "Add a plan"}</h3>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="row" style={{ marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Price (₹)</label>
              <input className="input" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Billing period</label>
              <input className="input" value={form.billingPeriod} onChange={(e) => setForm({ ...form, billingPeriod: e.target.value })} placeholder="month" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Features (comma-separated)</label>
            <input className="input" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Up to 3 users, Email support" />
          </div>
          <div className="row" style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
              <input type="checkbox" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} /> Mark as popular
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active (visible on pricing page)
            </label>
          </div>
          <div className="row">
            <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add plan"}</button>
            {editingId && <button type="button" className="btn-outline-dark" onClick={resetForm}>Cancel</button>}
          </div>
          {err && <p className="error">{err}</p>}
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Existing plans</h3>
        {plans.length === 0 && <p className="muted">No plans yet.</p>}
        {plans.map((p) => (
          <div key={p.id} style={{ borderBottom: "1px solid var(--line)", padding: "12px 0" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{p.name} — ₹{p.price}/{p.billingPeriod}</strong>
              {p.active === false && <span className="muted" style={{ fontSize: 12 }}>hidden</span>}
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <button className="link-btn" onClick={() => edit(p)}>Edit</button>
              <button className="link-btn danger" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomersList() {
  const [customers, setCustomers] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await api("/api/admin/customers", "GET");
        setCustomers(d.customers || []);
      } catch {
        setCustomers([]);
      }
    })();
  }, []);

  if (customers === null) return <p className="muted">Loading…</p>;

  return (
    <div className="card">
      {customers.length === 0 && <p className="muted">No signups yet.</p>}
      {customers.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Email</th><th>Signed up</th><th>Status</th><th>Plan</th><th>Trial ends</th></tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.email}</td>
                <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                <td><span className={"status-pill " + (c.status || "trial")}>{c.status || "trial"}</span></td>
                <td>{c.planName || "—"}</td>
                <td>{c.trialEndDate ? new Date(c.trialEndDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
