// api/fetchAccount.js

import { Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder } from "@coral-xyz/anchor/dist/cjs/coder";
import idl from "../target/idl/newkycproject.json"; // Import your program's IDL
import { Idl } from "@coral-xyz/anchor";
import { VercelRequest, VercelResponse } from "@vercel/node";

const programId = new PublicKey("EFCNdFXKnbcoHZJEQpmKrePsCYYPeMhPoAuAtaoPNy92");
const coder = new BorshCoder(idl as Idl);

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const connection = new Connection(
      "https://api.devnet.solana.com",
      "confirmed"
    );

    const accountInfo = await connection.getAccountInfo(stateAccount);
    if (!accountInfo) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Decode the account data using the coder
    const decodedData = coder.accounts.decode("UserInfo", accountInfo.data);

    res.status(200).json({ accountData: decodedData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
