# SplitEase

A full-stack expense-splitting web app (Splitwise clone) for friend groups. Track shared expenses, split bills with flexible methods, and settle up effortlessly.

## Features

- **Auth** — Sign up / log in with email + password via Supabase Auth
- **Friends** — Search users, send/accept friend requests, view per-friend balances
- **Groups** — Create groups, add friends, track group expenses
- **Expenses** — Add expenses with 4 split methods: Equal, Exact Amounts, Percentages, or Shares
- **Balances** — Real-time balance tracking across all friends and groups
- **Settle Up** — Record payments between friends to zero out balances
- **Responsive** — Sidebar nav on desktop, bottom tab bar on mobile

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Radix UI (shadcn/ui components)
- **Database**: PostgreSQL via Supabase + Prisma ORM
- **Auth**: Supabase Auth
- **State**: TanStack Query + React Context
- **Validation**: Zod
- **Notifications**: Sonner

---

## Running Locally

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/splitease.git
cd splitease
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish setting up (~1 minute)
3. Go to **Project Settings → Database → Connection string**
4. Copy the **Transaction pooler** connection string (port `6543`)

### 4. Set up environment variables

Create a `.env.local` file for Next.js:

```bash
cp .env.example .env.local
```

Create a `.env` file for Prisma CLI (it reads `.env`, not `.env.local`):

```bash
cp .env.example .env
```

Fill in **both** files with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Use the Transaction pooler URL (port 6543) for both
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

Where to find each value in the Supabase dashboard:

| Variable | Location |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public key |
| `DATABASE_URL` / `DIRECT_URL` | Project Settings → Database → Transaction pooler connection string |

> **Important**: When Supabase shows the connection string with `[YOUR-PASSWORD]`, the brackets are just UI formatting — do **not** include them. Use only the password itself.

> **Why two files?** Next.js loads `.env.local` at runtime. Prisma CLI only reads `.env`. Both need the database URLs.

### 5. Push the database schema

```bash
npm run db:push
```

This creates all 7 tables in your Supabase database (User, Friendship, Group, GroupMember, Expense, ExpenseSplit, Settlement).

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

### 1. Add a `.gitignore`

Make sure `.env` and `.env.local` are in your `.gitignore` so credentials are never committed:

```
.env
.env.local
.env*.local
```

### 2. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 3. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Add these **Environment Variables** in the Vercel dashboard before deploying:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `DATABASE_URL` | Transaction pooler connection string (port 6543) |
| `DIRECT_URL` | Transaction pooler connection string (port 6543) |

4. Click **Deploy**

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server at localhost:3000 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push Prisma schema to database (no migration history) |
| `npm run db:migrate` | Create and run a named migration |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:generate` | Regenerate Prisma client after schema changes |

---

## Database Schema

| Model | Description |
|---|---|
| `User` | App users (linked to Supabase Auth) |
| `Friendship` | Friend relationships — PENDING / ACCEPTED / DECLINED |
| `Group` | Expense groups with members |
| `GroupMember` | Many-to-many: Group ↔ User |
| `Expense` | Individual expenses with split method |
| `ExpenseSplit` | Per-user owed amounts for each expense |
| `Settlement` | Recorded payments between users |

## Split Methods

| Method | How it works |
|---|---|
| **Equal** | Total divided evenly; remainder cents go to first participants |
| **Exact Amounts** | Each person's amount entered directly (must sum to total) |
| **Percentages** | Each person's percentage entered (must sum to 100%) |
| **Shares** | Each person gets a share count; amounts are proportional |

## Project Structure

```
splitease/
├── prisma/schema.prisma        # Database schema
├── middleware.ts               # Protects all /(protected) routes
├── src/
│   ├── app/
│   │   ├── (auth)/             # /login, /signup
│   │   ├── (protected)/        # Dashboard, friends, groups, expenses, settle, profile
│   │   └── api/                # 19 REST API route handlers
│   ├── components/
│   │   ├── ui/                 # Radix UI / shadcn base components
│   │   ├── expense-form/       # 4-step expense wizard
│   │   ├── Navbar.tsx
│   │   ├── BalanceSummary.tsx
│   │   └── FriendSearch.tsx
│   ├── lib/
│   │   ├── balances.ts         # calculateBalances() + distributeAmount()
│   │   ├── validations.ts      # Zod schemas for all API inputs
│   │   ├── prisma.ts           # Prisma client singleton
│   │   └── supabase/           # Browser + server Supabase clients
│   └── hooks/
│       ├── useAuth.ts
│       └── useBalances.ts
```
