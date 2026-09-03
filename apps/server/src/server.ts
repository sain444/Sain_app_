import { buildApp } from "./app.js";
import { initRealtimeGateway } from "./realtime/gateway.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    // Fastify exposes its underlying Node HTTP server as `app.server`,
    // which Socket.IO attaches to directly — REST and realtime share one port.
    await initRealtimeGateway(app.server);
    logger.info(`🚀 Sainn server (REST + realtime) listening on http://localhost:${env.PORT}`);
  } catch (err) {
    logger.error(err, "Failed to start server");
    process.exit(1);
  }
}

main();
