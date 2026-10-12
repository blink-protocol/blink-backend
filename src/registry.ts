import {
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import type { Config } from "./config.js";

const SIMULATION_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export type LinkRecord = {
  owner: string;
  destination: string;
  active: boolean;
  created_at: bigint;
  updated_at: bigint;
};

export function passphraseForNetwork(network: Config["STELLAR_NETWORK"]): string {
  switch (network) {
    case "testnet":
      return Networks.TESTNET;
    case "public":
      return Networks.PUBLIC;
    default: {
      const _exhaustive: never = network;
      throw new Error(`Unsupported STELLAR_NETWORK: ${String(_exhaustive)}`);
    }
  }
}

export class LinkRegistry {
  private readonly server: rpc.Server;
  private readonly networkPassphrase: string;

  constructor(
    rpcUrl: string,
    private readonly contractId: string,
    network: Config["STELLAR_NETWORK"] = "testnet",
  ) {
    this.server = new rpc.Server(rpcUrl);
    this.networkPassphrase = passphraseForNetwork(network);
  }

  async resolve(alias: string): Promise<LinkRecord | null> {
    const account = await this.server.getAccount(SIMULATION_SOURCE);
    const contract = new Contract(this.contractId);
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call("resolve", nativeToScVal(alias, { type: "string" })))
      .setTimeout(30)
      .build();

    const simulation = await this.server.simulateTransaction(transaction);
    if (rpc.Api.isSimulationError(simulation)) throw new Error(simulation.error);
    if (!simulation.result?.retval) return null;
    return scValToNative(simulation.result.retval) as LinkRecord | null;
  }
}
