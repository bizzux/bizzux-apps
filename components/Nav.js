import Link from "next/link";

// Single shared nav for the public pages (landing, apps, pricing, login) so
// the tab set can't drift between pages — every page shows the same four
// links instead of each page hand-rolling its own (partial) copy.
export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/"><img src="/logo.png" alt="Bizzux" className="logo-img" /></Link>
        <div className="nav-links">
          <Link href="/apps">All apps</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/login?mode=signup" className="btn-primary" style={{ padding: "9px 20px", fontSize: 13.5 }}>
            Start free trial
          </Link>
        </div>
      </div>
    </nav>
  );
}
