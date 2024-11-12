// api/fetchAccount.js

import { Connection, PublicKey } from '@solana/web3.js';

export default async function handler(req: any, res: any) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const publicKey = new PublicKey(address);
    const accountInfo = await connection.getAccountInfo(publicKey);

    if (!accountInfo) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Here you can decode the account data if needed
    // const decodedData = decodeAccountData(accountInfo.data);

    res.status(200).json({ accountData: accountInfo.data.toString('base64') });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}