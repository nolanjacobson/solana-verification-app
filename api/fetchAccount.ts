// api/fetchAccount.js

import { Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder } from "@coral-xyz/anchor/dist/cjs/coder";
import idl from "../target/idl/newkycproject.json"; // Import your program's IDL
import { Idl } from "@coral-xyz/anchor";
import { VercelRequest, VercelResponse } from "@vercel/node";

const programId = new PublicKey("EFCNdFXKnbcoHZJEQpmKrePsCYYPeMhPoAuAtaoPNy92");
const coder = new BorshCoder(idl as Idl);

async function fetchWithRetry(
  connection: Connection,
  callback: () => Promise<any>,
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callback();
    } catch (error: any) {
      if (error.toString().includes("429 Too Many Requests")) {
        // Parse retry delay from headers or use exponential backoff
        const retryAfter = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
        console.log(`Rate limited. Retrying after ${retryAfter}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // Preflight request
    res.status(200).end();
    return;
  }

  const { address } = req.query;

  if (!address || Array.isArray(address)) {
    return res.status(400).json({ error: "A single address is required" });
  }

  try {
    const publicKey = new PublicKey(address);
    const [stateAccount, stateBump] = await PublicKey.findProgramAddress(
      [publicKey.toBuffer()],
      programId
    );

    console.log("stateAccount", stateAccount);

    const connection = new Connection(
      "https://solana-devnet.g.alchemy.com/v2/Y-JkQM9MLdf23LmVvyblJwpOXAK6XkUu",
      "confirmed"
    );

    // Wrap getAccountInfo in retry logic
    const accountInfo = await fetchWithRetry(connection, () =>
      connection.getAccountInfo(stateAccount)
    );

    if (!accountInfo) {
      return res.status(404).json({ error: "Account not found" });
    }

    const decodedData = coder.accounts.decode("UserInfo", accountInfo.data);

    // Get transaction history for the PDA
    const signatures = await connection.getSignaturesForAddress(stateAccount);

    // Get the transaction details for each signature
    const txDetails = await Promise.all(
      signatures
        .filter((sig) => sig.err === null) // Only successful transactions
        .map(async (sig) => {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          return {
            signature: sig.signature,
            blockTime: sig.blockTime,
            logs: tx?.meta?.logMessages,
          };
        })
    );

    // Find the most recent UpdateState, if it exists
    const updateStateTx = txDetails.find((tx) =>
      tx.logs?.some((log) => log?.includes("Instruction: UpdateState"))
    );

    // If no UpdateState, find the AddState
    const addStateTx = txDetails.find((tx) =>
      tx.logs?.some((log) => log?.includes("Instruction: AddState"))
    );

    // Prioritize UpdateState over AddState
    const relevantTx = updateStateTx || addStateTx;

    res.status(200).json({
      accountData: decodedData,
      certificate_hash_string: Buffer.from(
        decodedData.certicate_hash
      ).toString(),
      relevantTransaction: relevantTx,
      transactionType: updateStateTx ? "UpdateState" : "AddState",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
