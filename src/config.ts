import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  STELLAR_RPC_URL: z.url().default("https://soroban-testnet.stellar.org"),
  STELLAR_NETWORK: z.enum(["testnet"]).default("testnet"),
  CONTRACT_ID: z.string().startsWith("C"),
  ALLOWED_ORIGIN: z.string().default("http://localhost:3000"),
});

export type Config = z.infer<typeof schema>;
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => schema.parse(env);

