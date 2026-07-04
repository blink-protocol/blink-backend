import {
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";

const SIMULATION_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export type LinkRecord = {
  owner: string;
  destination: string;
  active: boolean;
  created_at: bigint;
  updated_at: bigint;
};

export class LinkRegistry {
  private readonly server: rpc.Server;

  constructor(rpcUrl: string, private readonly contractId: string) {
    this.server = new rpc.Server(rpcUrl);
  }

  async resolve(alias: string): Promise<LinkRecord | null> {
    const account = await this.server.getAccount(SIMULATION_SOURCE);
    const contract = new Contract(this.contractId);
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
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

