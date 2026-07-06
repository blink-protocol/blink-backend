import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { Config } from "./config.js";
import type { LinkRecord } from "./registry.js";

type Resolver = { resolve(alias: string): Promise<LinkRecord | null> };

export function createApp(config: Config, registry: Resolver) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.ALLOWED_ORIGIN }));

  app.get("/health", (_request, response) => response.json({ status: "ok" }));
  app.get("/v1/links/:alias", async (request, response, next) => {
    try {
      const alias = request.params.alias.toLowerCase();
      if (!/^[a-z0-9-]{3,32}$/.test(alias)) {
        return response.status(400).json({ error: "invalid_alias" });
      }
      const link = await registry.resolve(alias);
      if (!link?.active) return response.status(404).json({ error: "link_not_found" });
      return response.json({
        alias,
        owner: link.owner,
        destination: link.destination,
        active: link.active,
        createdAt: link.created_at.toString(),
        updatedAt: link.updated_at.toString(),
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error(error);
    response.status(502).json({ error: "stellar_rpc_error" });
  });
  return app;
}

