/**
 * Supabase OAuth Callback Handler
 * 
 * Handles the OAuth callback from providers (GitHub, Google, etc.) by:
 * 1. Extracting the authorization code from URL params
 * 2. Exchanging the code for a session (sets auth cookies)
 * 3. Redirecting to the final destination
 * 
 * This follows the official Supabase SSR pattern:
 * https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow-for-ssr
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get('code');
	const next = searchParams.get('next') ?? '/app';

	if (code) {
		const cookieStore = await cookies();
		
		// Create server client with proper cookie handling (getAll/setAll pattern)
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
					setAll(cookiesToSet) {
						try {
							cookiesToSet.forEach(({ name, value, options }) =>
								cookieStore.set(name, value, options)
							);
						} catch {
							// The `setAll` method was called from a Server Component.
							// This can be ignored if you have middleware refreshing
							// user sessions.
						}
					},
				},
			}
		);

		// Exchange the code for a session
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);

		if (error) {
			console.error('[OAuth Callback] Error exchanging code for session:', error);
			return NextResponse.redirect(`${origin}/auth/login?error=oauth_exchange_failed`);
		}

		if (data?.session) {
			// Successful authentication - redirect to destination
			const forwardedHost = request.headers.get('x-forwarded-host');
			const isLocalEnv = process.env.NODE_ENV === 'development';
			
			if (isLocalEnv) {
				return NextResponse.redirect(`${origin}${next}`);
			}
			
			if (forwardedHost) {
				return NextResponse.redirect(`https://${forwardedHost}${next}`);
			}
			
			return NextResponse.redirect(`${origin}${next}`);
		}

		// Edge case: no error but no session either
		console.error('[OAuth Callback] No session created despite no error');
		return NextResponse.redirect(`${origin}/auth/login?error=oauth_no_session`);
	}

	// Return the user to an error page with instructions or redirect to login
	return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
}
