import type { AuthUser } from "../../types";

// Map Supabase user to unified AuthUser shape
export function mapSupabaseUserToAuthUser(user: any): AuthUser {
    return {
        id: user.id,
        email: user.email ?? "",
        name: user.user_metadata?.name ?? null,
        imageUrl: user.user_metadata?.avatar_url ?? null,
        username: user.user_metadata?.username ?? null,
        role: (user.app_metadata?.role as AuthUser["role"]) ?? null,
        onboardingComplete: user.user_metadata?.onboardingComplete ?? undefined,
        locale: user.user_metadata?.locale ?? null,
    };
}


