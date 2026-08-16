import Link from "next/link";
import Nav from "@/components/Nav";

export default function LandingPage() {
  return (
    <>
      <Nav />

      <header className="hero">
        <h1>
          Run your whole business, <span>all in one place.</span>
        </h1>
        <p>
          One free account gets you started. Try any Bizzux app free, then keep
          the ones that work for you, no extra logins, no hassle.
        </p>
        <div className="hero-ctas">
          <Link href="/login?mode=signup" className="btn-primary">Start free trial</Link>
          <Link href="/pricing" className="btn-outline">View pricing</Link>
        </div>
      </header>

      <div className="apps-panel-wrap">
        <div className="apps-panel">
          <div className="apps-panel-header">
            <span className="apps-panel-label">Featured apps</span>
            <Link href="/apps" className="apps-panel-link">Explore all apps →</Link>
          </div>
          <div className="apps-panel-grid">
            <div className="apps-panel-item">
              <div className="apps-panel-icon">🏪</div>
              <div>
                <h4>Bizzux Shop</h4>
                <p>POS and shop management built for food &amp; retail businesses.</p>
              </div>
            </div>
            <div className="apps-panel-item">
              <div className="apps-panel-icon locked">🧾</div>
              <div>
                <h4>Bizzux POS <span className="apps-panel-soon">Soon</span></h4>
                <p>Fast, simple point-of-sale for counters and checkout.</p>
              </div>
            </div>
            <div className="apps-panel-item">
              <div className="apps-panel-icon locked">📒</div>
              <div>
                <h4>Bizzux Books <span className="apps-panel-soon">Soon</span></h4>
                <p>Accounting and invoicing for growing businesses.</p>
              </div>
            </div>
            <div className="apps-panel-item">
              <div className="apps-panel-icon locked">📦</div>
              <div>
                <h4>Bizzux Inventory <span className="apps-panel-soon">Soon</span></h4>
                <p>Stock, materials, and supply tracking in real time.</p>
              </div>
            </div>
            <div className="apps-panel-item">
              <div className="apps-panel-icon locked">👥</div>
              <div>
                <h4>Bizzux CRM <span className="apps-panel-soon">Soon</span></h4>
                <p>Track customers and keep every relationship organized.</p>
              </div>
            </div>
            <div className="apps-panel-item">
              <div className="apps-panel-icon locked">🌐</div>
              <div>
                <h4>Bizzux Sites <span className="apps-panel-soon">Soon</span></h4>
                <p>A simple website builder for your business, no code needed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">Built for growing businesses</h2>
        <p className="section-sub">
          One login for every Bizzux app, with simple plans that grow with you.
        </p>
        <div className="feature-grid container">
          <div className="feature-card">
            <div className="feature-icon">✓</div>
            <h3>One sign-in</h3>
            <p>Sign up once with Google or email, then use it across every Bizzux app.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">$</div>
            <h3>Simple pricing</h3>
            <p>Clear packages with no surprises. Start on a free trial, upgrade any time.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚙</div>
            <h3>Built for retail &amp; food businesses</h3>
            <p>Point-of-sale, inventory, and shop management apps, purpose-built.</p>
          </div>
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: "32px 24px", color: "var(--muted)", fontSize: 13 }}>
        © {new Date().getFullYear()} Bizzux
      </footer>
    </>
  );
}
