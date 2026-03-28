# Deploying SplitEase

This guide covers publishing to GitHub (to share as a project) and deploying to Vercel (so you and your friends can use it online for free).

---

## Part 1 — Push to GitHub

### 1. Create a `.gitignore`

Before committing anything, make sure your secrets are excluded. Create a `.gitignore` in the project root:

```
# Dependencies
node_modules/

# Environment files (NEVER commit these)
.env
.env.local
.env.*.local

# Next.js build output
.next/
out/

# Prisma
prisma/migrations/

# Misc
.DS_Store
*.pem
npm-debug.log*
```

### 2. Initialize git and make your first commit

```bash
cd g:/Projects/Random/splitease
git init
git add .
git commit -m "Initial commit: SplitEase expense splitting app"
```

### 3. Create a GitHub repository

1. Go to [github.com](https://github.com) → click **New repository**
2. Name it `splitease` (or anything you like)
3. Set it to **Public** (so others can clone and run it) or **Private**
4. Do **not** initialize with a README (you already have one)
5. Click **Create repository**

### 4. Push your code

GitHub will show you commands — they'll look like this:

```bash
git remote add origin https://github.com/YOUR_USERNAME/splitease.git
git branch -M main
git push -u origin main
```

Your code is now on GitHub. Anyone can clone it and follow the README to run their own instance.

---

## Part 2 — Host on Vercel (Free)

Vercel is the easiest way to host a Next.js app. The free tier is more than enough for personal use with friends.

### 1. Sign up for Vercel

Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.

### 2. Import your repository

1. Click **Add New → Project**
2. Find your `splitease` repo and click **Import**

### 3. Add environment variables

Before clicking Deploy, scroll down to **Environment Variables** and add all four:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nxvtcepdimltukscouun.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `DATABASE_URL` | Your Transaction pooler URL (port 6543) |
| `DIRECT_URL` | Your Session pooler URL (port 5432, same pooler host) |

Copy the exact values from your local `.env` file.

### 4. Deploy

Click **Deploy**. Vercel will build and deploy in ~2 minutes.

You'll get a free URL like `https://splitease-abc123.vercel.app` — share this with your friends.

### 5. (Optional) Add a custom domain

If you own a domain (e.g. `splitease.yourdomain.com`):
1. In Vercel → your project → **Settings → Domains**
2. Add your domain and follow the DNS instructions

---

## Part 3 — Invite Your Friends

Once deployed, your friends can:

1. Open the Vercel URL
2. Click **Sign Up** with their email
3. Verify their email (Supabase sends a confirmation link)
4. Start adding expenses

> **Note:** Supabase free tier allows up to **50,000 monthly active users** — plenty for a friend group.

### Enable email confirmations (recommended)

By default Supabase requires email confirmation. You can turn this off for easier onboarding:

1. Go to your [Supabase dashboard](https://supabase.com) → your project
2. **Authentication → Providers → Email**
3. Toggle off **Confirm email** if you want instant access without email verification

---

## Keeping it updated

When you make changes to the code:

```bash
git add .
git commit -m "describe your change"
git push
```

Vercel automatically redeploys on every push to `main`.

If you change the database schema (`prisma/schema.prisma`):

```bash
npm run db:push
```

Run this locally — it updates the live Supabase database directly.

---

## Cost summary

| Service | Free tier limits | Cost |
|---|---|---|
| Vercel | Unlimited personal projects | Free |
| Supabase | 500MB DB, 50k users, 5GB bandwidth | Free |
| Custom domain | — | ~$10–15/year (optional) |

For a friend group, you will almost certainly never hit these limits.
