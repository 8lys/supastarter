// Re-export current Better Auth implementation to preserve behavior
export * from "../../auth";
export * from "./middleware";
export * from "./hono";

// Re-export client (already matches AuthClient interface)
export * from "./client";

// Server auth - Better Auth's auth.api already works
import { auth } from "../../auth";
import type { ServerAuth, User, Session } from "../../types";

export const serverAuth: ServerAuth = {
	async getSession() {
		try {
			const result = await auth.api.getSession({
				headers: new Headers(),
			});

			if (!result?.user) {
				return { data: null, error: undefined };
			}

			// Better Auth already returns compatible format
			return {
				data: {
					user: result.user as any as User,
					session: result.session as any as Session,
				},
				error: undefined,
			};
		} catch (error) {
			return {
				data: undefined,
				error: {
					code: "UNKNOWN",
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
};


