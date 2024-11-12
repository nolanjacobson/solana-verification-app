import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import crypto from "crypto";
import fs from "fs";
import { deserialize } from "borsh";
const anchor = require("@project-serum/anchor");
import { Newkycproject } from "../target/types/newkycproject";
import { Program } from "@coral-xyz/anchor";
const BufferLayout = require("buffer-layout");
import { Idl } from "@coral-xyz/anchor";
import { Coder, BorshCoder } from "@coral-xyz/anchor/dist/cjs/coder";
import idl from "../target/idl/newkycproject.json"; // Import your program's IDL
import * as borsh from "@coral-xyz/borsh";
const coder = new BorshCoder(idl as Idl);

const borshAccountSchema = borsh.struct([
  borsh.publicKey("user"),
  borsh.u8("is_verified"),
  borsh.array(borsh.u8(), 32, "mtid"),
  borsh.u8("bump"),
]);


async function readPDA(connection: Connection, pda: PublicKey) {
  const accountInfo = await connection.getAccountInfo(pda);
  if (!accountInfo) {
    throw new Error("Account not found");
  }

  // Decode the account data using the coder
  const decodedData = coder.accounts.decode('UserInfo', accountInfo.data);
  return decodedData;
}

// Configure the client to use the Devnet.
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const payer = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync(
        "/Users/nolanjacobson/.config/solana/anothernewacct1.json",
        "utf8"
      )
    )
  )
);

// Program ID from your deployed program
const programId = new PublicKey("EFCNdFXKnbcoHZJEQpmKrePsCYYPeMhPoAuAtaoPNy92");

// Function to get the 8-byte instruction identifier
function getInstructionIdentifier(name: string): Buffer {
  return crypto.createHash("sha256").update(name).digest().slice(0, 8);
}

async function main() {
  const userPubkey = payer.publicKey;
  const [stateAccount, stateBump] = await PublicKey.findProgramAddress(
    [userPubkey.toBuffer()],
    programId
  );

  // Derive the PDA for the user_intro account
  //   const [userIntroPDA, bump] = await PublicKey.findProgramAddress(
  //     [Buffer.from("user_intro"), payer.publicKey.toBuffer()],
  //     programId
  //   );

  console.log("State Account:", stateAccount.toBase58());

  // Add state
  const isVerified = 1;
  const mtid = new Uint8Array(32); // Initialize with 32 bytes

  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  // const wallet = anchor.Wallet.local(); // Use the local wallet
  // const provider = new anchor.AnchorProvider(
  //   connection,
  //   wallet,
  //   anchor.AnchorProvider.defaultOptions()
  // );
  // anchor.setProvider(provider);

  // // console.log(provider, anchor.workspace);
  // // const program: Program<Newkycproject> = anchor.workspace.Newkycproject;

  // // // Define the user details
  // // const userPublicKey = provider.wallet.publicKey;

  // // const account = await program.account.userInfo.fetch(stateAccount);

  // // console.log("Account:", account);
  //   const addStateIx = new TransactionInstruction({
  //     keys: [
  //       { pubkey: stateAccount, isSigner: false, isWritable: true },
  //       { pubkey: userPubkey, isSigner: true, isWritable: true },
  //       { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  //     ],
  //     programId: programId,
  //     data: Buffer.concat([
  //       getInstructionIdentifier("global:add_state"), // 8-byte identifier
  //       Buffer.from([1]), // Serialize boolean as a single byte
  //       Buffer.from(mtid), // Serialize mtid as a string
  //     ]),
  //   });

  //   const addStateTx = new Transaction().add(addStateIx);
  //   const addStateSignature = await connection.sendTransaction(addStateTx, [
  //     payer,
  //   ]);
  //   await connection.confirmTransaction(addStateSignature, "confirmed");
  //   console.log("State added:", addStateSignature);

    try {
      const isVerified = await readPDA(connection, stateAccount);
      console.log("Verified status:", isVerified);
    } catch (error) {
      console.error("Error reading PDA:", error);
    }

  // // Update state
  // const updateStateIx = new TransactionInstruction({
  //   keys: [
  //     { pubkey: stateAccount, isSigner: false, isWritable: true },
  //     { pubkey: userPubkey, isSigner: false, isWritable: true },
  //     { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // Add this if required
  //     { pubkey: payer.publicKey, isSigner: false, isWritable: false }, // Add the program owner key
  //   ],
  //   programId: programId,
  //   data: Buffer.concat([
  //     getInstructionIdentifier("global:update_state"), // 8-byte identifier
  //     Buffer.from([1]), // Serialize boolean as a single byte
  //     Buffer.from(mtid), // Serialize mtid as a string
  //   ]),
  // });

  // const updateStateTx = new Transaction().add(updateStateIx);
  // const updateStateSignature = await connection.sendTransaction(updateStateTx, [
  //   payer,
  // ]);
  // await connection.confirmTransaction(updateStateSignature, "confirmed");
  // console.log("State updated:", updateStateSignature);

}

main().catch((err) => {
  console.error(err);
});
