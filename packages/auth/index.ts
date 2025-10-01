/**
 * Auth Provider Selection
 * 
 * This package supports multiple auth providers that implement a unified API.
 * To switch providers, comment out the current one and uncomment the one you want.
 * 
 * Both providers export:
 * - `authClient` (UnifiedClientAuthApi) - Client-side auth methods
 * - `serverAuth` (UnifiedServerAuthApi) - Server-side auth methods
 * - `auth` - Provider-specific instance (for advanced features)
 * 
 * The app code uses `authClient` and `serverAuth` which work the same regardless
 * of which provider is active.
 * 
 * Provider-specific features (like Better Auth organizations) are accessed via
 * the `auth` export and have runtime feature detection in the app code.
 */

// Option 1: Better Auth (includes organization, passkeys, 2FA plugins)
// export * from "./providers/better-auth";

// Option 2: Supabase Auth (includes OAuth, magic link, email/password)
export * from "./providers/supabase";