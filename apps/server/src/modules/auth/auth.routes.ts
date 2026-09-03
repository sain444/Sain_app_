import type { FastifyInstance } from "fastify";
import {
  signupSchema,
  loginSchema,
  requestPasswordResetSchema,
  confirmPasswordResetSchema,
  refreshTokenSchema,
} from "./auth.schema.js";
import {
  signup,
  login,
  refreshAccessToken,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  AuthError,
} from "./auth.service.js";
import { requireAuth } from "../../middleware/auth.js";

function serializeUser(user: { id: string; email: string; displayName: string | null; avatarUrl: string | null }) {
  return { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl };
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/auth/signup",
    { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const body = signupSchema.parse(request.body);
      try {
        const { user, accessToken, refreshToken } = await signup(body);
        return reply.code(201).send({ accessToken, refreshToken, user: serializeUser(user) });
      } catch (err) {
        if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post(
    "/auth/login",
    // Stricter limit than the global default — this endpoint is the
    // brute-force target, so it gets its own tighter cap.
    { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      try {
        const { user, accessToken, refreshToken } = await login(body);
        return reply.send({ accessToken, refreshToken, user: serializeUser(user) });
      } catch (err) {
        if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post(
    "/auth/password-reset/request",
    { config: { rateLimit: { max: 3, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const body = requestPasswordResetSchema.parse(request.body);
      const appResetUrlBase = `${request.protocol}://${request.headers.host}/reset-password`;
      await requestPasswordReset(body.email, appResetUrlBase);
      // Always the same response, whether or not the email exists — see
      // requestPasswordReset's comment on enumeration.
      return reply.send({ message: "If an account exists for that email, a reset code has been sent." });
    }
  );

  app.post(
    "/auth/password-reset/confirm",
    { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const body = confirmPasswordResetSchema.parse(request.body);
      try {
        await confirmPasswordReset(body.email, body.token, body.newPassword);
        return reply.send({ message: "Password updated — please log in again." });
      } catch (err) {
        if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post("/auth/refresh", async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);
    try {
      const { accessToken } = await refreshAccessToken(body.refreshToken);
      return reply.send({ accessToken });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.post("/auth/logout", { preHandler: requireAuth }, async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);
    await logout(request.userId!, body.refreshToken);
    return reply.send({ message: "Logged out" });
  });
}
