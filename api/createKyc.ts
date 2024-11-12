// api/fetchAccount.js
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  Transaction,
  Keypair,
} from "@solana/web3.js";
import { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import fs from "fs";

const programId = new PublicKey("EFCNdFXKnbcoHZJEQpmKrePsCYYPeMhPoAuAtaoPNy92");

// Function to get the 8-byte instruction identifier
function getInstructionIdentifier(name: string): Buffer {
  return crypto.createHash("sha256").update(name).digest().slice(0, 8);
}

function stringToUint8Array32(str: string): Uint8Array {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);

  // Create a Uint8Array of 32 bytes
  const uint8Array32 = new Uint8Array(32);

  // Copy the encoded string into the Uint8Array, truncating if necessary
  uint8Array32.set(encoded.slice(0, 32));

  return uint8Array32;
}

const payer = Keypair.fromSecretKey(
  Uint8Array.from([
    149, 141, 172, 154, 21, 39, 234, 181, 113, 236, 49, 254, 208, 158, 161, 208,
    156, 203, 223, 72, 22, 181, 106, 112, 172, 91, 139, 231, 116, 162, 2, 231,
    215, 76, 74, 33, 8, 183, 4, 129, 181, 59, 54, 120, 12, 85, 244, 44, 12, 56,
    101, 216, 149, 218, 119, 121, 69, 77, 157, 224, 216, 68, 56, 26,
  ])
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { address, mtid } = req.query;

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

    const mtidBytes = stringToUint8Array32(mtid as string);

    try {
      // Attempt to add state
      const addStateIx = new TransactionInstruction({
        keys: [
          { pubkey: stateAccount, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: false, isWritable: false }, // user account
          { pubkey: payer.publicKey, isSigner: true, isWritable: true }, // program_owner
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: programId,
        data: Buffer.concat([
          getInstructionIdentifier("global:add_state"), // 8-byte identifier
          Buffer.from([1]), // Serialize is_verified as a single byte
          Buffer.from(mtidBytes), // Serialize mtid as a 32-byte array
        ]),
      });

      const addStateTx = new Transaction().add(addStateIx);
      const addStateSignature = await connection.sendTransaction(addStateTx, [
        payer,
      ]);
      await connection.confirmTransaction(addStateSignature, "confirmed");

      console.log("State added:", addStateSignature);
      res.status(200).json({ signature: addStateSignature });
    } catch (error: any) {
      if (error.message.includes("already in use")) {
        try {
          // Fallback to update state
          const updateStateIx = new TransactionInstruction({
            keys: [
              { pubkey: stateAccount, isSigner: false, isWritable: true },
              { pubkey: publicKey, isSigner: false, isWritable: true }, // user account
              { pubkey: payer.publicKey, isSigner: false, isWritable: false }, // program owner key
              {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
              },
            ],
            programId: programId,
            data: Buffer.concat([
              getInstructionIdentifier("global:update_state"), // 8-byte identifier
              Buffer.from([1]), // Serialize boolean as a single byte
              Buffer.from(mtidBytes), // Serialize mtid as a 32-byte array
            ]),
          });

          const updateStateTx = new Transaction().add(updateStateIx);
          const updateStateSignature = await connection.sendTransaction(
            updateStateTx,
            [payer]
          );
          await connection.confirmTransaction(
            updateStateSignature,
            "confirmed"
          );

          console.log("State updated:", updateStateSignature);
          res.status(200).json({ signature: updateStateSignature });
        } catch (updateError: any) {
          res.status(500).json({ error: updateError.message });
        }
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
