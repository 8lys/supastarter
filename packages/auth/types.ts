/**
 * Minimal Auth API Types
 * 
 * Based on actual app usage - no over-engineering!
 * Both Better Auth and Supabase implement this same interface.
 */

// ============================================================================
// Core Types - What the app actually consumes
// ============================================================================

export interface User {
	id: string;
	email: string;
	name: string | null;
	imageUrl?: string | null;
	username?: string | null;
	role?: string | null;
	onboardingComplete?: boolean;
	locale?: string | null;
	// Add other fields as needed
}

export interface Session {
	id?: string | null;
	expiresAt?: string | null;
	activeOrganizationId?: string | null;
}

export interface AuthError {
	code: string;
	message: string;
	cause?: unknown;
}

export type AuthResult<T> =
	| { data: T; error: undefined }
	| { data: undefined; error: AuthError };

// ============================================================================
// Client API - What components actually call
// ============================================================================

export interface AuthClient {
	signIn: {
		email(params: { email: string; password: string }): Promise<AuthResult<any>>;
		magicLink(params: { email: string; callbackURL: string }): Promise<AuthResult<void>>;
		social(params: { provider: string; callbackURL: string }): Promise<AuthResult<void>>;
		passkey(): Promise<AuthResult<void>>;
	};
	signUp: {
		email(params: {
			email: string;
			password: string;
			name: string;
			callbackURL: string;
		}): Promise<AuthResult<void>>;
	};
	getSession(params?: {
		query?: { disableCookieCache?: boolean };
	}): Promise<AuthResult<{ user: User; session: Session } | null>>;
	organization: {
		acceptInvitation(params: {
			invitationId: string | null | undefined;
		}): Promise<AuthResult<void>>;
		rejectInvitation(params: {
			invitationId: string | null | undefined;
		}): Promise<AuthResult<void>>;
	};
	updateUser(params: {
		name?: string;
		imageUrl?: string;
		locale?: string;
		onboardingComplete?: boolean;
	}): Promise<AuthResult<void>>;
	changePassword(params: {
		currentPassword: string;
		newPassword: string;
		revokeOtherSessions?: boolean;
	}): Promise<AuthResult<void>>;
	deleteUser(params: Record<string, never>): Promise<AuthResult<void>>;
	signOut(): Promise<AuthResult<void>>;
}

// ============================================================================
// Server API - What server components actually call
// ============================================================================

export interface ServerAuth {
	getSession(): Promise<AuthResult<{ user: User; session: Session } | null>>;
}

