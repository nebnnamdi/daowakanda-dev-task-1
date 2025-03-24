import algosdk, {
  makeAssetTransferTxnWithSuggestedParamsFromObject,
} from "algosdk";
import * as algokit from "@algorandfoundation/algokit-utils";
import { ApplicationClient } from "@algorandfoundation/algokit-utils/types/app-client";
import { SMART_CONTRACT_ARC_32 } from "./client";
import { MNEMONIC_KEY } from "./constant";

// The app ID to interact with.
const appId = 736014374;

// Account address
// UTYC4R5BFCW2SYLRXKLFH4TZ6YEDK7SJE2RKEFXOODEN3CYRU5QPROMJAY

async function loadClient() {
  const client = algokit.AlgorandClient.fromConfig({
    algodConfig: {
      server: "https://testnet-api.algonode.cloud",
    },
    indexerConfig: {
      server: "https://testnet-idx.algonode.cloud",
    },
  });

  return client;
}

const main = async () => {
  const client = await loadClient();
  const acct = algosdk.mnemonicToSecretKey(MNEMONIC_KEY);
  console.log("Account addr: ", acct.addr);

  const appClient = new ApplicationClient(
    {
      resolveBy: "id",
      id: appId,
      sender: acct,
      app: JSON.stringify(SMART_CONTRACT_ARC_32),
    },
    client.client.algod
  );

  const suggestedParams = await client.client.algod.getTransactionParams().do();

  const atc = new algosdk.AtomicTransactionComposer();

  const globalState = await appClient.getGlobalState();
  const assetId = globalState.asset.value;

  // Opting in to asset
  const optInTxn = makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: acct.addr,
    to: acct.addr,
    amount: 0,
    suggestedParams,
    assetIndex: Number(assetId),
  });

  atc.addTransaction({
    txn: optInTxn,
    signer: algosdk.makeBasicAccountTransactionSigner(acct),
  });

  atc.addMethodCall({
    method: appClient.getABIMethod("claimAsset")!,
    suggestedParams: {
      ...suggestedParams,
      fee: 6_000,
    },
    sender: acct.addr,
    signer: algosdk.makeBasicAccountTransactionSigner(acct),
    appID: appId,
    appForeignAssets: [Number(assetId)],
  });

  await atc.execute(client.client.algod, 8);
  console.log("Asset claimed successfully.");
};

main().catch(console.error);
