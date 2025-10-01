/**
 * Better Auth Server API - Unified Interface
 * 
 * Wraps Better Auth's server API to match the UnifiedServerAuthApi interface
 * so it can be used interchangeably with the Supabase provider.
 */

import type { UnifiedServerAuthApi, AuthResult } from "../../types";
import { auth } from "../../auth";

/**
 * Server-side authentication API for Better Auth
 * Implements the unified API interface for consistency with other providers
 */
export const serverAuth: UnifiedServerAuthApi = {
	async getSession(params?: { headers?: Headers }) {
		try {
			const session = await auth.api.getSession({
				headers: params?.headers || new Headers(),
			});

			if (!session?.user) {
				return { data: null, error: undefined };
			}

			return {
				data: {
					user: session.user,
					session: session.session,
				},
				error: undefined,
			};
		} catch (error) {
			return {
				data: undefined,
				error: {
					code: "UNKNOWN" as const,
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
} as const;

// Also export the original auth instance for Better Auth-specific features
export { auth };

