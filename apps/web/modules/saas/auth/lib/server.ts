import "server-only";
import { serverAuth } from "@repo/auth";
import { getInvitationById } from "@repo/database";
import { headers } from "next/headers";
import { cache } from "react";

export const getSession = cache(async () => {
	const result = await serverAuth.getSession();
	
	// Return in the format expected by the app
	if (result.error || !result.data) {
		return { user: null, session: null };
	}
	
	return result.data;
});

// TODO: Migrate organization methods to Supabase or database queries
// These methods currently rely on Better Auth's organization plugin
// which is not available in Supabase provider

export const getActiveOrganization = cache(async (slug: string) => {
	// TODO: Implement organization lookup via direct database query
	// For now, returning null to allow auth flow to work
	console.warn('[Auth] getActiveOrganization not yet implemented for Supabase provider');
	return null;
});

export const getOrganizationList = cache(async () => {
	// TODO: Implement organization list via direct database query
	console.warn('[Auth] getOrganizationList not yet implemented for Supabase provider');
	return [];
});

export const getUserAccounts = cache(async () => {
	// TODO: Implement user accounts via direct database query
	console.warn('[Auth] getUserAccounts not yet implemented for Supabase provider');
	return [];
});

export const getUserPasskeys = cache(async () => {
	// TODO: Passkeys not supported in Supabase provider
	console.warn('[Auth] getUserPasskeys not supported in Supabase provider');
	return [];
});

export const getInvitation = cache(async (id: string) => {
	try {
		return await getInvitationById(id);
	} catch (error) {
		return null;
	}
});
