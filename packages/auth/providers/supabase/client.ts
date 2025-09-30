"use client";
import { createBrowserClient } from "@supabase/ssr";
import type {
    UnifiedClientAuthApi,
    EmailSignInParams,
    EmailSignUpParams,
    MagicLinkParams,
    SocialSignInParams,
    PasskeySignInParams,
    ClientGetSessionParams,
} from "../../types";
import { toAuthErrorFromSupabase } from "../../lib/errors";
import { mapSupabaseUserToAuthUser } from "./map";

function supa() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}

export const authClient: UnifiedClientAuthApi = {
    signUp: {
        async email({ email, password, name, callbackURL }: EmailSignUpParams) {
            try {
                const { error } = await supa().auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: callbackURL,
                        data: name ? { name } : undefined,
                    },
                });
                if (error) return { data: undefined, error: toAuthErrorFromSupabase(error) };
                return { data: undefined, error: undefined };
            } catch (e) {
                return { data: undefined, error: toAuthErrorFromSupabase(e) };
            }
        },
    },
    signIn: {
        async email({ email, password, callbackURL }: EmailSignInParams) {
            try {
                const { error } = await supa().auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) return { data: undefined, error: toAuthErrorFromSupabase(error) };
                // Redirect is handled by app; callbackURL can be used by caller
                return { data: undefined, error: undefined };
            } catch (e) {
                return { data: undefined, error: toAuthErrorFromSupabase(e) };
            }
        },
        async magicLink({ email, callbackURL }: MagicLinkParams) {
            try {
                const { error } = await supa().auth.signInWithOtp({
                    email,
                    options: { emailRedirectTo: callbackURL },
                });
                if (error) return { data: undefined, error: toAuthErrorFromSupabase(error) };
                return { data: undefined, error: undefined };
            } catch (e) {
                return { data: undefined, error: toAuthErrorFromSupabase(e) };
            }
        },
        async social({ provider, callbackURL }: SocialSignInParams) {
            try {
                console.log('[Supabase OAuth] Starting signin with:', { provider, callbackURL });
                
                const { data, error } = await supa().auth.signInWithOAuth({
                    provider: provider as any,
                    options: {
                        redirectTo: callbackURL,
                    },
                });
                
                console.log('[Supabase OAuth] Response:', { data, error });
                
                if (error) {
                    console.error('[Supabase OAuth] Error:', error);
                    return { data: undefined, error: toAuthErrorFromSupabase(error) };
                }
                
                // Supabase returns the OAuth URL - we need to redirect to it
                if (data?.url) {
                    console.log('[Supabase OAuth] Redirecting to:', data.url);
                    window.location.href = data.url;
                } else {
                    console.error('[Supabase OAuth] No URL in response! Data:', data);
                    return { 
                        data: undefined, 
                        error: {
                            code: 'OAUTH_ERROR' as const,
                            message: 'No OAuth URL returned from Supabase. Check your provider configuration in Supabase dashboard.',
                        }
                    };
                }
                
                return { data: undefined, error: undefined };
            } catch (e) {
                console.error('[Supabase OAuth] Exception:', e);
                return { data: undefined, error: toAuthErrorFromSupabase(e) };
            }
        },
        async passkey(_params?: PasskeySignInParams) {
            // Supabase doesn't natively support passkeys
            // Return not implemented error
            return {
                data: undefined,
                error: {
                    code: "UNKNOWN" as const,
                    message: "Passkey authentication is not supported with Supabase provider",
                },
            };
        },
    },
    async signOut() {
        try {
            const { error } = await supa().auth.signOut();
            if (error) return { data: undefined, error: toAuthErrorFromSupabase(error) };
            return { data: undefined, error: undefined };
        } catch (e) {
            return { data: undefined, error: toAuthErrorFromSupabase(e) };
        }
    },
    async getSession(_params?: ClientGetSessionParams) {
        try {
            const {
                data: { user },
                error,
            } = await supa().auth.getUser();
            if (error) return { data: undefined, error: toAuthErrorFromSupabase(error) };
            if (!user) return { data: null, error: undefined };
            const session = { id: null, expiresAt: null, activeOrganizationId: null };
            return {
                data: {
                    user: mapSupabaseUserToAuthUser(user),
                    session,
                },
                error: undefined,
            };
        } catch (e) {
            return { data: undefined, error: toAuthErrorFromSupabase(e) };
        }
    },
    organization: {
        async acceptInvitation({ invitationId }) {
            try {
                // Call existing app endpoint that handles accept + seat updates
                const res = await fetch(`/api/organization/accept-invitation`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ invitationId }),
                    credentials: "include",
                });
                if (!res.ok) {
                    const text = await res.text();
                    return { data: undefined, error: toAuthErrorFromSupabase(text) };
                }
                return { data: undefined, error: undefined };
            } catch (e) {
                return { data: undefined, error: toAuthErrorFromSupabase(e) };
            }
        },
        async rejectInvitation({ invitationId }) {
            try {
                const res = await fetch(`/api/organization/reject-invitation`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ invitationId }),
                    credentials: "include",
                });
                if (!res.ok) {
                    const text = await res.text();
                    return { data: undefined, error: toAuthErrorFromSupabase(text) };
                }
                return { data: undefined, error: undefined };
            } catch (e) {
                return { data: undefined, error: toAuthErrorFromSupabase(e) };
            }
        },
    },
};


