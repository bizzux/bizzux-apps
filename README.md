# bizzux-apps portal

Signup / trial / pricing front door for apps.bizzux.com. Built on the
`bizzux-apps` Firebase project — completely separate from `bizzux-proj` and
every customer's individual shop project.

## Environment variables (set these in Vercel)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
SUPER_ADMIN_EMAIL=info.bizzux@gmail.com
FIREBASE_SERVICE_ACCOUNT=  # full JSON from Project settings -> Service accounts
SHOP_SSO_SECRET=           # same value as SHOP_SSO_SECRET in the bizzux-shop project — see below
```

Use the web app config values from the `bizzux-apps` Firebase project (Project
settings -> Your apps).

## Firebase console setup

1. Authentication -> Sign-in method -> enable Email/Password and Google
   (support email: info.bizzux@gmail.com)
2. Authentication -> Settings -> Authorized domains -> add `apps.bizzux.com`
   and the `*.vercel.app` preview domain once you have it
3. Firestore -> publish `firestore.rules` (already in this repo) via the
   Rules tab
4. Trial length defaults to 14 days automatically if you don't set one — set
   a different value any time from the Super Admin panel (`/admin`) after
   signing in as `info.bizzux@gmail.com`.
5. Add at least one plan from the Super Admin panel's "Plans" tab so the
   `/pricing` page has something to show.

## Account onboarding & team invites

Modeled on Zoho's "Getting Started" wizard and Setup → Users → Add New User.

- **Onboarding wizard** — the first time an account owner reaches
  `/dashboard` with `customers/{uid}.onboarded !== true`, they see a modal
  asking for company name, employee count, time zone, and currency
  (`components/OnboardingModal.js` → `POST /api/onboarding`). They can also
  skip it.
- **Team invites** — an account owner (or any teammate with the
  Administrator profile) can invite others from `/team` (`+ New User`):
  first name, last name, email, a free-text Role, and a Profile
  (`Administrator` or `Standard`). This:
  1. Creates a disabled-password Firebase Auth user for that email
     (`adminAuth().createUser`).
  2. Adds a row to `customers/{accountId}/team/{memberId}` with
     `status: "invited"`.
  3. Emails them a "reset your password" link via Firebase's own transactional
     email (no new email service needed — reuses `NEXT_PUBLIC_FIREBASE_API_KEY`
     against the Identity Toolkit REST API) pointing at `/accept-invite`.
  4. They set a password, sign in, and `POST /api/team/accept` finalizes
     things: the team row flips to `active`, and a `memberships/{uid}` doc
     records which account they belong to and with what profile.
  - No new env vars or Firebase console setup are required beyond what's
    already listed above (Email/Password sign-in already covers this).
  - The invite email uses Firebase's default "Reset password" template —
    for nicer branding, customize it under Authentication → Templates →
    Password reset in the Firebase console.
  - Inviting an email that already has its own Bizzux account is rejected
    for now (a person can't yet belong to two accounts) — the admin sees a
    clear error explaining why.

## Bizzux Shop single sign-on

Bizzux Shop (`shop.bizzux.com`, repo `bizzux-shop`) is its own separate
Firebase project, so being signed into this portal doesn't automatically
sign you into Shop. Clicking the "Bizzux Shop" tile on `/dashboard` bridges
that:

1. `GET /api/shop-sso` mints a short-lived (60s), HMAC-signed token
   containing the caller's email and role (`Administrator` profile →
   Shop `owner`, `Standard` → Shop `shopkeeper`).
2. The tile opens `https://shop.bizzux.com/sso?token=...` in a new tab.
3. Shop's `/api/sso` route verifies the signature (both apps share
   `SHOP_SSO_SECRET` — this app never touches Shop's Firebase project
   directly), finds-or-creates a matching Firebase Auth user in Shop's
   project, adds them to `settings/app.ownerEmails` there if their role is
   `owner`, and mints a Firebase custom token.
4. Shop's `/sso` page signs in with that custom token and lands on
   `/admin` — no separate login step.

**Setup:** generate one random secret and set it as `SHOP_SSO_SECRET` in
both this project's and `bizzux-shop`'s environment (`.env.local` and
Vercel), e.g.:
```
openssl rand -hex 32
```
Today this only wires up the one hardcoded Shop instance
(`shop.bizzux.com`); if/when each customer gets their own Shop deployment,
`SHOP_URL` in `app/api/shop-sso/route.js` (and the matching secret) will
need to become per-customer.

## What's NOT included (by design, for this phase)

- No automatic provisioning of a customer's actual working app — Super Admin
  sees new signups on `/admin` and sets those up manually, same as today.
- No real payment collection — the pricing page records which plan someone
  picked, nothing more.
