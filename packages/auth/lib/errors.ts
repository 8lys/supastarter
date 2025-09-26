import type { AuthError, AuthErrorCode } from "../types";

function normalizeMessage(input: unknown): string {
    if (!input) return "Unknown error";
    if (typeof input === "string") return input;
    if (input && typeof input === "object") {
        // Common error object shapes
        // @ts-ignore
        if (typeof input.message === "string") return input.message as string;
        // @ts-ignore
        if (typeof input.error === "string") return input.error as string;
    }
    try {
        return JSON.stringify(input);
    } catch {
        return String(input);
    }
}

function toCodeFromString(message: string): AuthErrorCode {
    const msg = message.toLowerCase();
    if (msg.includes("invalid credentials") || msg.includes("wrong password"))
        return "INVALID_CREDENTIALS";
    if (msg.includes("not verified") || msg.includes("verify email"))
        return "EMAIL_NOT_VERIFIED";
    if (msg.includes("not found") || msg.includes("no user"))
        return "USER_NOT_FOUND";
    if (msg.includes("banned") || msg.includes("suspended")) return "USER_BANNED";
    if (msg.includes("weak password")) return "WEAK_PASSWORD";
    if (msg.includes("already exists") && msg.includes("email"))
        return "DUPLICATE_EMAIL";
    if (msg.includes("already exists") && msg.includes("username"))
        return "DUPLICATE_USERNAME";
    if (msg.includes("magic link") || msg.includes("otp"))
        return "INVALID_MAGIC_LINK";
    if (msg.includes("oauth")) return "OAUTH_ERROR";
    if (msg.includes("expired") || msg.includes("session")) return "SESSION_EXPIRED";
    return "UNKNOWN";
}

export function toAuthError(error: unknown): AuthError {
    const message = normalizeMessage(error);
    const code = toCodeFromString(message);
    return { code, message, cause: error };
}

// Better Auth specific mapper (optional specialized fields)
export function toAuthErrorFromBetterAuth(error: unknown): AuthError {
    // @ts-ignore
    const codeStr: unknown = error && typeof error === "object" ? error.code : undefined;
    const message = normalizeMessage(error);
    const fallback = toCodeFromString(message);
    const code = typeof codeStr === "string" ? (codeStr as AuthErrorCode) : fallback;
    return { code, message, cause: error };
}

// Supabase specific mapper (optional specialized fields)
export function toAuthErrorFromSupabase(error: unknown): AuthError {
    // Supabase errors often have { message, status } or { error_description }
    let msg = normalizeMessage(error);
    // @ts-ignore
    if (error && typeof error === "object" && typeof error.error_description === "string") {
        // @ts-ignore
        msg = String(error.error_description);
    }
    const code = toCodeFromString(msg);
    return { code, message: msg, cause: error };
}


