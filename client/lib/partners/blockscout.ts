/*
  API Docs:
  - https://docs.blockscout.com/devs/apis/rest
*/

export interface TokenBalance {
  address: string;
  tokenAddress: string;
  balance: number;
  symbol?: string;
  decimals?: number;
}

export interface TxStatus {
  hash: string;
  status: "pending" | "confirmed" | "failed";
  blockNumber?: number;
  gasUsed?: string;
}

export interface GasPrice {
  average: number;
  fast: number;
  slow: number;
  unit: string;
}

const BLOCKSCOUT_BASE =
  process.env.NEXT_PUBLIC_BLOCKSCOUT_BASE;

if (!BLOCKSCOUT_BASE) {
  throw new Error("BLOCKSCOUT_BASE is not defined in environment variables");
}

/* ---------- 1. Get ERC20 Token Balance ---------- 
  /api/v2/tokens/{tokenAddress}/holders/{address}
*/

// get number of tokens such that number of edges ~ 10^5
export async function getTokenBalance(
  address: string,
  tokenAddress: string
): Promise<TokenBalance | null> {
  try {
    const url = `${BLOCKSCOUT_BASE}/api/v2/tokens/${tokenAddress}/holders/${address}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const json = await res.json();

    if (!json.balance)
      return { address, tokenAddress, balance: 0 };

    const decimals = json.token?.decimals ? parseInt(json.token.decimals) : 18;
    const balance = parseFloat(json.balance) / 10 ** decimals;

    return {
      address,
      tokenAddress,
      balance,
      symbol: json.token?.symbol,
      decimals,
    };
  } catch (err) {
    console.error("Blockscout Balance Error:", err);
    return null;
  }
}

/* ---------- 2. Get Transaction Status ---------- 
   /api/v2/transactions/{txHash}
*/
export async function getTxStatus(txHash: string): Promise<TxStatus | null> {
  try {
    const url = `${BLOCKSCOUT_BASE}/api/v2/transactions/${txHash}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const json = await res.json();

    if (!json.hash)
      return { hash: txHash, status: "pending" };

    return {
      hash: txHash,
      status:
        json.status === "ok" || json.confirmations > 0
          ? "confirmed"
          : json.status === "error"
          ? "failed"
          : "pending",
      blockNumber: json.block_number,
      gasUsed: json.gas_used?.toString(),
    };
  } catch (err) {
    console.error("Blockscout Tx Error:", err);
    return null;
  }
}

/* ---------- 3. Get Gas Prices ----------
  /api/v1/gas-price-oracle
   Returns { average: 2.0, fast: 3.0, slow: 1.5 }
*/
export async function getGasPrice(): Promise<GasPrice> {
  try {
    const res = await fetch(`${BLOCKSCOUT_BASE}/api/v1/gas-price-oracle`);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const json = await res.json();

    return {
      average: json.average,
      fast: json.fast,
      slow: json.slow,
      unit: "gwei",
    };
  } catch (err) {
    console.error("Gas Oracle Error:", err);
    return { average: 0, fast: 0, slow: 0, unit: "gwei" };
  }
}

/* ---------- 4. Verify Contract Status ----------
  /api/v2/smart-contracts/{address}
*/
export async function verifyContract(contractAddress: string): Promise<boolean> {
  try {
    const url = `${BLOCKSCOUT_BASE}/api/v2/smart-contracts/${contractAddress}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const json = await res.json();

    return !!(json.address && json.is_verified);
  } catch (err) {
    console.error("Contract Verification Error:", err);
    return false;
  }
}

/* ---------- 5. Get Account Balance ----------
  /api/v2/smart-contracts/{address}
*/
export async function getNativeBalance(address: string): Promise<number | null> {
  try {
    const res = await fetch(`${BLOCKSCOUT_BASE}/api?module=account&action=balance&address=${address}`);
    const json = await res.json();
    if (json.status !== "1") return null;

    // ETH has 18 decimals
    const balance = parseFloat(json.result) / 1e18;
    return balance;
  } catch (err) {
    console.error("Native ETH Balance Error:", err);
    return null;
  }
}
 
