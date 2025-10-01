import "server-only";
import { serverAuth, auth } from "@repo/auth";
import { getInvitationById } from "@repo/database";
import { headers } from "next/headers";
import { cache } from "react";

/**
 * Get current session using unified API
 * Works with both Better Auth and Supabase providers
 */
export const getSession = cache(async () => {
	const result = await serverAuth.getSession();
	
	// Return in the format expected by the app
	if (result.error || !result.data) {
		return { user: null, session: null };
	}
	
	return result.data;
});

/**
 * Get active organization by slug
 * Uses Better Auth's organization plugin when available,
 * falls back to direct database query for Supabase
 */
export const getActiveOrganization = cache(async (slug: string) => {
	try {
		// Better Auth provider has auth.api with organization methods
		if (typeof auth === 'object' && auth !== null && 'api' in auth && auth.api && typeof auth.api === 'object') {
			const api = auth.api as any;
			if ('getFullOrganization' in api && typeof api.getFullOrganization === 'function') {
				const activeOrganization = await api.getFullOrganization({
					query: {
						organizationSlug: slug,
					},
					headers: await headers(),
				});
				return activeOrganization;
			}
		}

		// TODO: For Supabase, implement organization lookup via direct database query
		console.warn('[Auth] getActiveOrganization: Better Auth plugin not available, needs database query implementation');
		return null;
	} catch (error) {
		return null;
	}
});

/**
 * Get list of organizations for current user
 * Uses Better Auth's organization plugin when available,
 * falls back to direct database query for Supabase
 */
export const getOrganizationList = cache(async () => {
	try {
		if (typeof auth === 'object' && auth !== null && 'api' in auth && auth.api && typeof auth.api === 'object') {
			const api = auth.api as any;
			if ('listOrganizations' in api && typeof api.listOrganizations === 'function') {
				const organizationList = await api.listOrganizations({
					headers: await headers(),
				});
				return organizationList;
			}
		}

		// TODO: For Supabase, implement via direct database query
		console.warn('[Auth] getOrganizationList: Better Auth plugin not available, needs database query implementation');
		return [];
	} catch (error) {
		return [];
	}
});

/**
 * Get user accounts (linked auth providers)
 * Uses Better Auth API when available
 */
export const getUserAccounts = cache(async () => {
	try {
		if (typeof auth === 'object' && auth !== null && 'api' in auth && auth.api && typeof auth.api === 'object') {
			const api = auth.api as any;
			if ('listUserAccounts' in api && typeof api.listUserAccounts === 'function') {
				const userAccounts = await api.listUserAccounts({
					headers: await headers(),
				});
				return userAccounts;
			}
		}

		// TODO: For Supabase, implement via direct database query
		console.warn('[Auth] getUserAccounts: Better Auth API not available, needs database query implementation');
		return [];
	} catch (error) {
		return [];
	}
});

/**
 * Get user passkeys
 * Uses Better Auth passkey plugin when available
 */
export const getUserPasskeys = cache(async () => {
	try {
		if (typeof auth === 'object' && auth !== null && 'api' in auth && auth.api && typeof auth.api === 'object') {
			const api = auth.api as any;
			if ('listPasskeys' in api && typeof api.listPasskeys === 'function') {
				const userPasskeys = await api.listPasskeys({
					headers: await headers(),
				});
				return userPasskeys;
			}
		}

		// Passkeys not supported in Supabase provider
		return [];
	} catch (error) {
		return [];
	}
});

export const getInvitation = cache(async (id: string) => {
	try {
		return await getInvitationById(id);
	} catch (error) {
		return null;
	}
});
