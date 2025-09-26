# supastarter for Next.js

supastarter is the ultimate starter kit for production-ready, scalable SaaS applications.

## Helpful links

- [📘 Documentation](https://supastarter.dev/docs/nextjs)
- [🚀 Demo](https://demo.supastarter.dev)

## Auth provider switching

This repo supports multiple auth providers behind a unified API.

- Manual switch (mirrors database pattern):
  - `packages/auth/index.ts` → re-export from one provider
  - `packages/auth/client.ts` → re-export client from the same provider

Example:

```ts
// Better Auth (default)
export * from "./providers/better-auth";
```

```ts
// Supabase
export * from "./providers/supabase";
```

And client:

```ts
// Better Auth (default)
export * from "./providers/better-auth/client";
```

```ts
// Supabase
export * from "./providers/supabase/client";
```

### Supabase environment variables

Add to your environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
# Optional (server only when needed):
SUPABASE_SERVICE_ROLE_KEY=...
```

The Next.js middleware uses `@supabase/ssr` and requires only cookies.getAll/setAll patterns. No `@supabase/auth-helpers-nextjs` is used.