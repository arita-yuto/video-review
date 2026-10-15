import "server-only";
import type { LoginResponse } from "@/lib/auth-types";
import { jiraOAuth } from "@/server/lib/login/oauth/jira-oauth";

// One authorization-code sign-in; the routes are shared and only this part differs per provider.
export interface OAuthProvider {
    isConfigured(): Promise<boolean>;
    authorizeUrl(params: { redirectUri: string; state: string }): Promise<string>;
    login(params: { code: string; redirectUri: string }): Promise<LoginResponse>;
}

const providers = { jira: jiraOAuth } satisfies Record<string, OAuthProvider>;

export type OAuthProviderName = keyof typeof providers;

export const oauthProviderNames = Object.keys(providers) as [OAuthProviderName, ...OAuthProviderName[]];

// The names the login screen may offer a button for.
export async function configuredOAuthProviders(): Promise<OAuthProviderName[]> {
    const configured = await Promise.all(oauthProviderNames.map(name => providers[name].isConfigured()));
    return oauthProviderNames.filter((_, i) => configured[i]);
}

export function startOAuthLogin(name: OAuthProviderName, params: { redirectUri: string; state: string }) {
    return providers[name].authorizeUrl(params);
}

export function finishOAuthLogin(name: OAuthProviderName, params: { code: string; redirectUri: string }) {
    return providers[name].login(params);
}
