"use client";

import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
import { Button } from "@ui/components/button";
import { useQueryState } from "nuqs";
import { parseAsString } from "nuqs";
import { useState } from "react";
import { oAuthProviders } from "../constants/oauth-providers";

export function SocialSigninButton({
	provider,
	className,
}: {
	provider: keyof typeof oAuthProviders;
	className?: string;
}) {
	const [invitationId] = useQueryState("invitationId", parseAsString);
	const [isLoading, setIsLoading] = useState(false);
	const providerData = oAuthProviders[provider];

	const redirectPath = invitationId
		? `/app/organization-invitation/${invitationId}`
		: config.auth.redirectAfterSignIn;

	const onSignin = async () => {
		try {
			setIsLoading(true);
			const callbackURL = new URL(redirectPath, window.location.origin);
			const { error } = await authClient.signIn.social({
				provider,
				callbackURL: callbackURL.toString(),
			});
			
			if (error) {
				console.error("Social signin error:", error);
				alert(`Sign in error: ${error.message}`);
				setIsLoading(false);
			}
			// If successful, browser will redirect to OAuth provider
		} catch (err) {
			console.error("Social signin exception:", err);
			alert(`Sign in failed: ${err instanceof Error ? err.message : String(err)}`);
			setIsLoading(false);
		}
	};

	return (
		<Button
			onClick={() => onSignin()}
			variant="light"
			type="button"
			className={className}
			loading={isLoading}
		>
			{providerData.icon && (
				<i className="mr-2 text-primary">
					<providerData.icon className="size-4" />
				</i>
			)}
			{providerData.name}
		</Button>
	);
}
