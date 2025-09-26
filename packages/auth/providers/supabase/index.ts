import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { UnifiedServerAuthApi, AuthResult, AuthUser, AuthSession } from "../../types";
import { toAuthErrorFromSupabase } from "../../lib/errors";

export const serverAuth: UnifiedServerAuthApi = {
    async getSession() {
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
                {
                    cookies: {
                        getAll() {
                            return cookieStore.getAll();
                        },
                        setAll(cookiesToSet) {
                            try {
                                cookiesToSet.forEach(({ name, value, options }) =>
                                    cookieStore.set(name, value, options),
                                );
                            } catch {
                                // setAll called from a Server Component; middleware should refresh sessions.
                            }
                        },
                    },
                },
            );

            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();
            if (error) return { data: undefined, error: toAuthErrorFromSupabase(error) } as AuthResult<null>;
            if (!user) return { data: null, error: undefined } as AuthResult<null>;

            const appUser: AuthUser = {
                id: user.id,
                email: user.email ?? "",
                name: user.user_metadata?.name ?? null,
                imageUrl: user.user_metadata?.avatar_url ?? null,
                username: user.user_metadata?.username ?? null,
                role: (user.app_metadata?.role as AuthUser["role"]) ?? null,
                onboardingComplete: user.user_metadata?.onboardingComplete ?? undefined,
                locale: user.user_metadata?.locale ?? null,
            };

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


