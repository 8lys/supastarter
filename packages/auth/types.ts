/**
 * Unified auth API types used across providers (Better Auth, Supabase).
 * These types are provider-agnostic and define the surface consumed by apps.
 */

export type AuthUserRole = "admin" | "user";

export interface AuthUser {
    id: string; // UUID when using Supabase; string for compatibility across providers
    email: string;
    name: string | null;
    imageUrl?: string | null;
    username?: string | null;
    role?: AuthUserRole | null;
    banned?: boolean | null;
    banReason?: string | null;
    banExpiresAt?: string | null; // ISO timestamp when present
    onboardingComplete?: boolean;
    locale?: string | null;
}

export interface AuthSession {
    /**
     * Provider session identifier or token reference. Do not assume stability.
     */
    id?: string | null;
    /**
     * ISO timestamp for expiration if available.
     */
    expiresAt?: string | null;
    /**
     * Active organization id chosen by the user within the app context.
     */
    activeOrganizationId?: string | null;
}

export type AuthErrorCode =
    | "INVALID_CREDENTIALS"
    | "EMAIL_NOT_VERIFIED"
    | "USER_NOT_FOUND"
    | "USER_BANNED"
    | "WEAK_PASSWORD"
    | "DUPLICATE_EMAIL"
    | "DUPLICATE_USERNAME"
    | "INVALID_MAGIC_LINK"
    | "OAUTH_ERROR"
    | "SESSION_EXPIRED"
    | "UNKNOWN";

export interface AuthError {
    code: AuthErrorCode;
    message: string;
    cause?: unknown;
}

export type AuthResult<T> =
    | { data: T; error: undefined }
    | { data: undefined; error: AuthError };

export interface GetSessionQuery {
    disableCookieCache?: boolean;
}

export interface ServerGetSessionParams {
    headers?: Headers | Record<string, string>;
    query?: GetSessionQuery;
}

export interface ClientGetSessionParams {
    query?: GetSessionQuery;
}

export interface EmailSignUpParams {
    email: string;
    password: string;
    name?: string;
    callbackURL?: string;
}

export interface EmailSignInParams {
    email: string;
    password: string;
    callbackURL?: string;
}

export interface MagicLinkParams {
    email: string;
    callbackURL?: string;
}

export interface SocialSignInParams {
    provider: "google" | "github" | string;
    callbackURL?: string;
}

export interface PasskeySignInParams {
    // Passkey signin typically doesn't need params - handled by browser
}

export interface AcceptInvitationParams {
    invitationId: string | null | undefined;
}
export interface RejectInvitationParams {
    invitationId: string | null | undefined;
}

export interface UnifiedServerAuthApi {
    /**
     * Resolve current user and session on the server with request headers.
     */
    getSession(params?: ServerGetSessionParams): Promise<
        AuthResult<{ user: AuthUser; session: AuthSession } | null>
    >;
}

export interface UnifiedClientAuthApi {
    signUp: {
        email(params: EmailSignUpParams): Promise<AuthResult<void>>;
    };
    signIn: {
        email(params: EmailSignInParams): Promise<AuthResult<void>>;
        magicLink(params: MagicLinkParams): Promise<AuthResult<void>>;
        social(params: SocialSignInParams): Promise<AuthResult<void>>;
        passkey(params?: PasskeySignInParams): Promise<AuthResult<void>>;
    };
    signOut(): Promise<AuthResult<void>>;
    getSession(params?: ClientGetSessionParams): Promise<
        AuthResult<{ user: AuthUser; session: AuthSession } | null>
    >;
    organization: {
        acceptInvitation(params: AcceptInvitationParams): Promise<
            AuthResult<void>
        >;
        rejectInvitation(params: RejectInvitationParams): Promise<
            AuthResult<void>
        >;
    };
}


