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

## What's NOT included (by design, for this phase)

- No automatic provisioning of a customer's actual working app — Super Admin
  sees new signups on `/admin` and sets those up manually, same as today.
- No real payment collection — the pricing page records which plan someone
  picked, nothing more.
