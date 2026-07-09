import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { LinkRegistry } from "./registry.js";

const config = loadConfig();
const registry = new LinkRegistry(config.STELLAR_RPC_URL, config.CONTRACT_ID);
const app = createApp(config, registry);

if (!process.env.VERCEL) {
  app.listen(config.PORT, () => {
    console.log(`Blink API listening on :${config.PORT}`);
  });
}

export default app;
