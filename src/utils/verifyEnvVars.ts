export function verifyEnvVars() {
  if (!process.env.ENVIRONMENT) {
    throw new Error("ENVIRONMENT is not set");
  }
  if (!process.env.NODE_ENV) {
    throw new Error("NODE_ENV is not set");
  }
  if (!process.env.PORT) {
    throw new Error("PORT is not set");
  }
  if (!process.env.POSTGRES_HOST) {
    throw new Error("POSTGRES_HOST is not set");
  }
  if (!process.env.POSTGRES_PORT) {
    throw new Error("POSTGRES_PORT is not set");
  }
  if (!process.env.POSTGRES_USER) {
    throw new Error("POSTGRES_USER is not set");
  }
  if (!process.env.POSTGRES_PASSWORD) {
    throw new Error("POSTGRES_PASSWORD is not set");
  }
  if (!process.env.POSTGRES_DB) {
    throw new Error("POSTGRES_DB is not set");
  }
  if (!process.env.REDIS_HOST) {
    throw new Error("REDIS_HOST is not set");
  }
  if (!process.env.REDIS_PORT) {
    throw new Error("REDIS_PORT is not set");
  }
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set");
  }
  if (!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL is not set");
  }
}
