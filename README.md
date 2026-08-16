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
- **Team invites** — an account owner (or any teammate with the Global Admin
  or Admin profile) can invite others from `/team` (`+ New User`): first
  name, last name, email, a free-text Role, and a Profile. Profile is the
  actual permission tier (see `lib/roles.js`) — Global Admin, Admin,
  Manager, Staff/Shopkeeper, or Viewer/Auditor; only Global Admin and Admin
  can reach `/team` themselves. Note that today any of them can grant
  *anyone else* the Global Admin profile too, including "Internal Bizzux
  team only" access — there's no extra gate on that specific option yet.
  Inviting someone:
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
  - `/accept-invite` handles both ways someone can land there: with
    `mode=resetPassword&oobCode=...` still attached (if the Firebase project's
    email "Action URL" is set to point straight at this page), or with only
    `?invite=...` left (the default — Firebase's own hosted reset-password
    page consumes the oobCode first, and its "Continue" link drops those
    params). In the second case the person already set their password on
    Firebase's page, so the app looks their email up via
    `GET /api/team/accept?invite=...` and shows a plain sign-in form instead
    of treating the link as invalid.
  - The invite email uses Firebase's default "Reset password" template —
    for nicer branding, customize it under Authentication → Templates →
    Password reset in the Firebase console.
  - Inviting an email that already has its own Bizzux account is rejected
    for now (a person can't yet belong to two accounts) — the admin sees a
    clear error explaining why.

## Roles

`lib/roles.js` is the single source of truth for the assignable profiles —
both `/team`'s dropdown and every server-side permission check import from
it, so they can't drift apart:

| Profile | Scope | What they can do |
|---|---|---|
| Global Admin | Entire Bizzux platform | Internal Bizzux team only; manages organisations and permissions, subscriptions and platform configuration |
| Admin | Entire organisation and all branches | Manages users, branches, modules and configuration; cannot transfer ownership or delete the organisation |
| Manager | Assigned branches | Manages sales, POS, inventory, purchases, CRM, expenses, employees and operational reports |
| Staff/Shopkeeper | Assigned function and location | Performs daily transactions without configuration or approval authority |
| Viewer/Auditor | Selected organisation or branch | Read-only reports and records; no data modification |

Two things sit outside that list on purpose:
- **Super Admin** — `SUPER_ADMIN_EMAIL`, not a Firestore profile, never
  shown in any dropdown, invisible everywhere. See "Super admin (hidden)"-style
  handling in `lib/firebaseAdmin.js`.
- **Account Owner** — whoever's `customers/{uid}` doc this is. Always has
  full Admin-equivalent access on their own account, plus the one thing no
  Admin has: the ability to transfer ownership or delete the account.
  `resolveAccount()` reports Owner's `profile` as `"Admin"` for permission
  checks, with `isOwner: true` as the separate flag for that extra power.

`ACCOUNT_ADMIN_PROFILES` (`["Global Admin", "Admin"]`) gates `/team` access
and account-level configuration; Manager/Staff-Shopkeeper/Viewer-Auditor can't
reach either. Branch/location scoping ("assigned branches", "selected
organisation or branch" in the table above) is descriptive only for
now — there's no branches/locations data model or enforcement yet.

## Bizzux Shop single sign-on

Bizzux Shop (`shop.bizzux.com`, repo `bizzux-shop`) is its own separate
Firebase project, so being signed into this portal doesn't automatically
sign you into Shop. Shop also has no login-account or role-management
screen of its own anymore — this app is the single source of truth for
every role, and Shop's roles are entirely derived from it. Clicking the
"Bizzux Shop" tile on `/dashboard` bridges that:

1. `GET /api/shop-sso` mints a short-lived (60s), HMAC-signed token
   containing the caller's email and role, mapped from their status here:

   | Here (bizzux-apps) | Shop role |
   |---|---|
   | Super Admin (`SUPER_ADMIN_EMAIL`) | `super` |
   | Account Owner (owns the account) | `owner` |
   | Invited teammate, Profile = Global Admin or Admin | `owner` |
   | Invited teammate, Profile = Manager | `manager` |
   | Invited teammate, Profile = Viewer/Auditor | `viewer` |
   | Invited teammate, Profile = Staff/Shopkeeper | `shopkeeper` |

   Global Admin currently gets the same Shop access as Admin (full "Owner"
   access to whichever shop they sign into), not Shop's own hidden Super
   Admin tier — see the comment above `PROFILE_TO_SHOP_ROLE` in
   `app/api/shop-sso/route.js` if that needs to change later.

2. The tile opens `https://shop.bizzux.com/sso?token=...` in a new tab.
3. Shop's `/api/sso` route verifies the signature (both apps share
   `SHOP_SSO_SECRET` — this app never touches Shop's Firebase project
   directly), finds-or-creates a matching Firebase Auth user in Shop's
   project, and files that email into whichever of Shop's
   `settings/app.{superEmails,ownerEmails,managerEmails,viewerEmails}`
   matches the role (removing it from the others, so a role change here —
   e.g. demoting an Admin to Staff/Shopkeeper — takes effect in Shop the next
   time they sign in through the tile), then mints a Firebase custom token.
4. Shop's `/sso` page signs in with that custom token and lands on
   `/admin` with the right role already applied — no separate login step,
   and nothing to configure inside Shop itself.

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
