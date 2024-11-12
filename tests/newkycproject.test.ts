import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Newkycproject } from "../target/types/newkycproject";
import { PublicKey } from "@solana/web3.js";
describe("newkycproject", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Newkycproject as Program<Newkycproject>;

  it("Is initialized!", async () => {
    console.log("program", program);

    // Define the user details
    const userPublicKey = new PublicKey(
      "EqQGRgWpJJRKWNcgCoh1WYCs99q6cNpCwQAqCZKMfExk"
    );

    const account = await program.account.userInfo.fetch(userPublicKey);
    console.log("account", account);
  });
});
