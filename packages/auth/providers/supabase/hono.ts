import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { mapSupabaseUser } from "./map";

function getBearerToken(c: Context): string | undefined {
    const auth = c.req.header("authorization");
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
        return auth.slice(7).trim();
    }
    const cookie = c.req.header("cookie") || "";
    const match = cookie
        .split(/;\s*/)
        .map((kv) => kv.split("="))
        .find(([k]) => k === "sb-access-token");
    if (match && match[1]) return decodeURIComponent(match[1]);
    return undefined;
}

export const authMiddleware = createMiddleware<{
    Variables: {
        user: { id: string; email: string; name?: string; image?: string };
    };
}>(async (c, next) => {
    const token = getBearerToken(c);
    if (!token) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        },
    );

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("user", mapSupabaseUser(data.user));
    await next();
});


