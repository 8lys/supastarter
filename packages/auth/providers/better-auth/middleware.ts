import { NextResponse, type NextRequest } from "next/server";

// No cookie refresh needed; return a pass-through response
export async function withAuthSession(request: NextRequest) {
    return { response: NextResponse.next({ request }) };
}


