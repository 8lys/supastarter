import { createMiddleware } from "hono/factory";
import { auth } from "../../auth";

export const authMiddleware = createMiddleware(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    c.set("user", session.user);
    return next();
});
