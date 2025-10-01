import { createServerClient } from "@supabase/ssr";
import type { UnifiedServerAuthApi, AuthResult, AuthUser, AuthSession } from "../../types";
import { toAuthErrorFromSupabase } from "../../lib/errors";
import { mapSupabaseUserToAuthUser } from "./map";
import { createSupabaseServerClient } from "./server";

export const serverAuth: UnifiedServerAuthApi = {
    async getSession() {
        try {
            const supabase = await createSupabaseServerClient();

            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();
            if (error) return { data: undefined, error: toAuthErrorFromSupabase(error) } as AuthResult<null>;
            if (!user) return { data: null, error: undefined } as AuthResult<null>;

            const appUser: AuthUser = mapSupabaseUserToAuthUser(user);

            // Session payload
            const sess: AuthSession = {
                id: null,
                expiresAt: null,
                activeOrganizationId: null,
            };

            return { data: { user: appUser, session: sess }, error: undefined } as AuthResult<{
                user: AuthUser;
                session: AuthSession;
            } | null>;
        } catch (e) {
            return { data: undefined, error: toAuthErrorFromSupabase(e) } as AuthResult<null>;
        }
    },
};

/**
 * Supabase compatibility handler for Better Auth API endpoints.
 * Handles /api/auth/get-session endpoint that UI and middleware depend on.
 * OAuth flows are handled entirely client-side through Supabase SDK.
 */
export const auth = {
    handler: async (req: Request) => {
        const url = new URL(req.url);
        
        // Handle get-session endpoint
        if (url.pathname.includes('/get-session')) {
            try {
                // Extract cookies from request
                const cookieHeader = req.headers.get('cookie') || '';
                const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    if (key) acc[key] = value;
                    return acc;
                }, {} as Record<string, string>);

                const supabase = createServerClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    {
                        cookies: {
                            getAll() {
                                return Object.entries(cookies).map(([name, value]) => ({
                                    name,
                                    value: decodeURIComponent(value)
                                }));
                            },
                            setAll() {
                                // No-op for handler context
                            },
                        },
                    },
                );

                const { data: { user }, error } = await supabase.auth.getUser();
                
                if (error || !user) {
                    return new Response(
                        JSON.stringify({ user: null, session: null }), 
                        { 
                            status: 200,
                            headers: { "Content-Type": "application/json" }
                        }
                    );
                }

                const authUser = mapSupabaseUserToAuthUser(user);
                const session = {
                    id: null,
                    expiresAt: null,
                    activeOrganizationId: null,
                };

                return new Response(
                    JSON.stringify({ user: authUser, session }), 
                    { 
                        status: 200,
                        headers: { "Content-Type": "application/json" }
                    }
                );
            } catch (e) {
                return new Response(
                    JSON.stringify({ user: null, session: null }), 
                    { 
                        status: 200,
                        headers: { "Content-Type": "application/json" }
                    }
                );
            }
        }

        // Other auth endpoints not supported with Supabase
        return new Response(
            JSON.stringify({ 
                error: "Endpoint not supported. Supabase handles OAuth client-side." 
            }), 
            { 
                status: 404,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
};

export * from "./client";
export * from "./middleware";
export * from "./hono";


