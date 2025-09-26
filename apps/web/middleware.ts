import { routing } from "@i18n/routing";
import { config as appConfig } from "@repo/config";
import { createPurchasesHelper } from "@repo/payments/lib/helper";
import {
	getOrganizationsForSession,
	getPurchasesForSession,
	getSession,
} from "@shared/lib/middleware-helpers";
import { withSupabaseSession } from "@repo/auth/providers/supabase/middleware";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { withQuery } from "ufo";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
	const { pathname, origin } = req.nextUrl;

    // Initialize base response and refresh Supabase session cookies when configured
    let baseResponse: NextResponse | undefined;
    if (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
        const { response: supaRes } = await withSupabaseSession(req);
        baseResponse = supaRes;
    }
    const getBaseResponse = () => baseResponse ?? NextResponse.next({ request: req });
    const copyCookies = (from: NextResponse, to: NextResponse) => {
        try {
            // @ts-ignore - NextResponse cookies.getAll is available at runtime
            from.cookies.getAll().forEach(({ name, value, ...rest }) =>
                // @ts-ignore
                to.cookies.set(name, value, rest as any),
            );
        } catch {
            // ignore if not available
        }
        return to;
    };

    if (pathname.startsWith("/app")) {
        const response = getBaseResponse();

		if (!appConfig.ui.saas.enabled) {
			return NextResponse.redirect(new URL("/", origin));
		}

		const session = await getSession(req);
		let locale = req.cookies.get(appConfig.i18n.localeCookieName)?.value;

		if (!session) {
            return copyCookies(
                response,
                NextResponse.redirect(
                    new URL(
                        withQuery("/auth/login", {
                            redirectTo: pathname,
                        }),
                        origin,
                    ),
                ),
            );
		}

		if (
			appConfig.users.enableOnboarding &&
			!session.user.onboardingComplete &&
			pathname !== "/app/onboarding"
		) {
            return copyCookies(
                response,
                NextResponse.redirect(
                    new URL(
                        withQuery("/app/onboarding", {
                            redirectTo: pathname,
                        }),
                        origin,
                    ),
                ),
            );
		}

		if (
			!locale ||
			(session.user.locale && locale !== session.user.locale)
		) {
			locale = session.user.locale ?? appConfig.i18n.defaultLocale;
			response.cookies.set(appConfig.i18n.localeCookieName, locale);
		}

		if (
			appConfig.organizations.enable &&
			appConfig.organizations.requireOrganization &&
			pathname === "/app"
		) {
			const organizations = await getOrganizationsForSession(req);
			const organization =
				organizations.find(
					(org) => org.id === session?.session.activeOrganizationId,
				) || organizations[0];

            return copyCookies(
                response,
                NextResponse.redirect(
                    new URL(
                        organization
                            ? `/app/${organization.slug}`
                            : "/app/new-organization",
                        origin,
                    ),
                ),
            );
		}

		const hasFreePlan = Object.values(appConfig.payments.plans).some(
			(plan) => "isFree" in plan,
		);
		if (
			((appConfig.organizations.enable &&
				appConfig.organizations.enableBilling) ||
				appConfig.users.enableBilling) &&
			!hasFreePlan
		) {
			const organizationId = appConfig.organizations.enable
				? session?.session.activeOrganizationId ||
					(await getOrganizationsForSession(req))?.at(0)?.id
				: undefined;

			const purchases = await getPurchasesForSession(req, organizationId);
			const { activePlan } = createPurchasesHelper(purchases);

			const validPathsWithoutPlan = [
				"/app/choose-plan",
				"/app/onboarding",
				"/app/new-organization",
				"/app/organization-invitation/",
			];
			if (
				!activePlan &&
				!validPathsWithoutPlan.some((path) => pathname.startsWith(path))
			) {
                return copyCookies(
                    response,
                    NextResponse.redirect(new URL("/app/choose-plan", origin)),
                );
			}
		}

        return response;
	}

	if (pathname.startsWith("/auth")) {
		if (!appConfig.ui.saas.enabled) {
			return NextResponse.redirect(new URL("/", origin));
		}

        const response = getBaseResponse();
        const session = await getSession(req);

		if (session && pathname !== "/auth/reset-password") {
            return copyCookies(
                response,
                NextResponse.redirect(new URL("/app", origin)),
            );
		}

        return response;
	}

	if (!appConfig.ui.marketing.enabled) {
		return NextResponse.redirect(new URL("/app", origin));
	}

    return intlMiddleware(req);
}

export const config = {
	matcher: [
		"/((?!api|image-proxy|images|fonts|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
	],
};
