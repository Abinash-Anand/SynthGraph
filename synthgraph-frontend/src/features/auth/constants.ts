/**
 * Plain constant, no "server-only" guard — proxy.ts needs just the cookie
 * name (not a secret) without pulling in the rest of the auth feature's
 * server-only module graph.
 */
export const SESSION_COOKIE_NAME = "sg_session";
