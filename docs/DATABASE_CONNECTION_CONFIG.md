# Database Connection Configuration

## TL;DR

**For Local Development (.env.local):**
```env
# Fast session pooler for local dev server
DATABASE_URL="postgresql://postgres.qcacwkquchyridjfysbp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.qcacwkquchyridjfysbp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
```

**For Vercel Production (Environment Variables in Vercel Dashboard):**
```env
# Transaction pooler for serverless functions
DATABASE_URL="postgresql://postgres.qcacwkquchyridjfysbp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.qcacwkquchyridjfysbp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
```

## Understanding Supabase Connection Modes

### 1. Session Pooler (Port 5432)
- **Use for**: Next.js, persistent Node.js servers, long-running processes
- **How it works**: Maintains persistent connections that are reused across requests
- **Performance**: Fast (connection reuse, ~10-50ms per query)
- **Best for**: Traditional web applications, development servers

### 2. Transaction Pooler (Port 6543)
- **Use for**: Serverless functions, Edge Runtime, auto-scaling functions
- **How it works**: Creates a new transaction context for each request
- **Performance**: Slower (transaction overhead, ~200-500ms per query)
- **Best for**: AWS Lambda, Vercel Edge Functions, Cloudflare Workers

### 3. Direct Connection (db.[project].supabase.co:5432)
- **Use for**: Prisma migrations, database admin tasks
- **How it works**: Bypasses pooler, connects directly to Postgres
- **Performance**: Medium (no pooler overhead, but limited connections)
- **Best for**: Migrations, one-off scripts, development

## Why Transaction Pooler is Slow for Next.js

Next.js is a **persistent server** that stays running:
- In development: The dev server runs continuously
- In production: Node.js process handles multiple requests

Transaction pooler is optimized for **ephemeral serverless functions** that:
- Spin up for a single request
- Execute quickly
- Shut down immediately

Using transaction pooler with Next.js means:
1. Each Prisma query starts a new transaction context
2. Additional network round-trips for transaction negotiation
3. 200-500ms overhead **per query**
4. Multiple queries per request = 1-2 second total latency

## Recommended Configuration

### For Vercel Deployment (Recommended)

**Local Development (.env.local):**
```env
# Session pooler for fast local development
DATABASE_URL="postgresql://postgres.qcacwkquchyridjfysbp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.qcacwkquchyridjfysbp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://qcacwkquchyridjfysbp.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="[YOUR_ANON_KEY]"
```

**Vercel Environment Variables (Production/Preview):**
```env
# Transaction pooler for serverless
DATABASE_URL="postgresql://postgres.qcacwkquchyridjfysbp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Session pooler for migrations (DIRECT_URL)
DIRECT_URL="postgresql://postgres.qcacwkquchyridjfysbp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# Supabase Auth (same as local)
NEXT_PUBLIC_SUPABASE_URL="https://qcacwkquchyridjfysbp.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="[YOUR_ANON_KEY]"
```

**Why Different URLs?**
- **Local**: Session pooler (port 5432) because Next.js dev server is persistent
- **Vercel**: Transaction pooler (port 6543) because Vercel runs serverless functions
- **DIRECT_URL**: Always session pooler for Prisma migrations

## Performance Comparison

| Configuration | Query Time | Request Time | Use Case |
|--------------|------------|--------------|----------|
| Session Pooler (5432) | 10-50ms | 50-200ms | Next.js, persistent servers |
| Transaction Pooler (6543) | 200-500ms | 1-2s | Serverless functions only |
| Direct Connection | 50-100ms | 100-300ms | Migrations, admin tasks |

## Migration Guide

### Step 1: Update .env.local

Change port from `6543` to `5432` and remove `?pgbouncer=true`:

```diff
- DATABASE_URL="postgresql://postgres.qcacwkquchyridjfysbp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
+ DATABASE_URL="postgresql://postgres.qcacwkquchyridjfysbp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
```

### Step 2: Restart Dev Server

```bash
# Kill current server
# Then restart:
pnpm dev
```

### Step 3: Verify Performance

Check API request times - should drop from 1-2s to 50-200ms.

## Troubleshooting

### "Too many connections" error

**Cause**: Hitting Supabase connection limits

**Solution**: 
1. Ensure you're using session pooler (port 5432)
2. Check Prisma client is singleton (already configured in `packages/database/prisma/client.ts`)
3. Upgrade Supabase plan if needed

### Still slow after switching to port 5432

**Check**:
1. Are indexes in place? (Run: `docs/PERFORMANCE_FIX.md` verification)
2. Is Prisma client a singleton? (Should be from `packages/database/prisma/client.ts`)
3. Network latency to AWS region (test with `ping aws-0-us-west-1.pooler.supabase.com`)

## References

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Supabase Performance Guide](https://supabase.com/docs/guides/platform/performance)
