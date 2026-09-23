// The default baked into docker-compose.yml for zero-config local spins -
// safe there since NODE_ENV isn't 'production' outside the built image, but
// must never be accepted as a real secret once it is.
const INSECURE_JWT_SECRETS = new Set(['dev-only-change-me']);

export default () => {
  const jwtSecret = process.env.JWT_SECRET;

  if (
    process.env.NODE_ENV === 'production' &&
    (!jwtSecret || INSECURE_JWT_SECRETS.has(jwtSecret))
  ) {
    throw new Error(
      'JWT_SECRET must be set to a strong, unique value in production - refusing to start with an unset or known-insecure secret.',
    );
  }

  return {
    port: parseInt(process.env.PORT ?? '3000', 10),

    database: {
      url: process.env.DATABASE_URL,
    },

    auth: {
      jwtSecret,
    },
  };
};