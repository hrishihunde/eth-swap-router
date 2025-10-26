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
  process.env.NEXT_PUBLIC_BLOCKSCOUT_BASE || "https://hrishi-eth.cloud.blockscout.com";

if (!BLOCKSCOUT_BASE) {
  throw new Error("BLOCKSCOUT_BASE is not defined in environment variables");
}

/* ---------- 1. Get ERC20 Token Balance ---------- 
  /api/v2/tokens/{tokenAddress}/holders/{address}
*/

// get number of tokens such that number of edges ~ 10^5
export async function getTokenBalance(
  address: string,
  tokenAddress: string,
  network?: string
): Promise<TokenBalance | null> {
  try {
    const url = `${BLOCKSCOUT_BASE}/api/v2/tokens/${tokenAddress}/holders/${address}`;
    const res = await fetch(url);
    
    // Don't throw on 404 - token may not exist on this explorer
    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`Blockscout: Token balance not found (404) for ${tokenAddress} on ${network || 'unknown network'}`);
      } else {
        console.warn(`Blockscout: Token balance fetch returned ${res.status} for ${tokenAddress} on ${network || 'unknown network'}`);
      }
      return null;
    }
    
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
    console.warn(`Blockscout Balance Error for ${tokenAddress} on ${network || 'unknown'}:`, err instanceof Error ? err.message : err);
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

/* ---------- 6. Get Token Transfers ----------
  /api/v2/addresses/{address}/token-transfers
*/
export interface TokenTransfer {
  hash: string;
  from: string;
  to: string;
  value: string;
  token: {
    address: string;
    symbol: string;
    decimals: number;
  };
  timestamp: string;
}

export async function getTokenTransfers(
  address: string,
  limit: number = 50
): Promise<TokenTransfer[]> {
  try {
    const url = `${BLOCKSCOUT_BASE}/api/v2/addresses/${address}/token-transfers?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Token transfers fetch returned ${res.status}`);
      return [];
    }
    
    const json = await res.json();
    return json.items || [];
  } catch (err) {
    console.error('Token Transfers Error:', err);
    return [];
  }
}

/* ---------- 7. Get Top Tokens by Market Cap ----------
  /api/v2/tokens?type=ERC-20&sort=market_cap
  Used for synthetic benchmark generation
*/
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  holders: number;
  marketCap?: number;
  volume24h?: number;
}

export async function getTopTokens(
  limit: number = 100,
  network?: string
): Promise<TokenInfo[]> {
  try {
    const url = `${BLOCKSCOUT_BASE}/api/v2/tokens?type=ERC-20&sort=market_cap&order=desc&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Top tokens fetch returned ${res.status} for ${network || 'unknown network'}`);
      return [];
    }
    
    const json = await res.json();
    const items = json.items || [];
    
    return items.map((item: any) => ({
      address: item.address,
      symbol: item.symbol || 'UNKNOWN',
      name: item.name || 'Unknown Token',
      decimals: parseInt(item.decimals) || 18,
      holders: parseInt(item.holders) || 0,
      marketCap: item.market_cap ? parseFloat(item.market_cap) : undefined,
      volume24h: item.volume_24h ? parseFloat(item.volume_24h) : undefined
    }));
  } catch (err) {
    console.error(`Top Tokens Error for ${network || 'unknown'}:`, err);
    return [];
  }
}

/* ---------- 8. Get Recent Blocks (for gas history) ----------
  /api/v2/blocks?limit={days * 100}
  Used to derive historical gas prices
*/
export interface BlockInfo {
  number: number;
  timestamp: string;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas?: string;
}

export async function getRecentBlocks(
  limit: number = 100,
  network?: string
): Promise<BlockInfo[]> {
  try {
    const url = `${BLOCKSCOUT_BASE}/api/v2/blocks?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Recent blocks fetch returned ${res.status} for ${network || 'unknown network'}`);
      return [];
    }
    
    const json = await res.json();
    const items = json.items || [];
    
    return items.map((item: any) => ({
      number: parseInt(item.height),
      timestamp: item.timestamp,
      gasUsed: item.gas_used || '0',
      gasLimit: item.gas_limit || '0',
      baseFeePerGas: item.base_fee_per_gas
    }));
  } catch (err) {
    console.error(`Recent Blocks Error for ${network || 'unknown'}:`, err);
    return [];
  }
}

/* ---------- 9. Derive Historical Gas Prices ----------
  Calculates gas price distribution from recent blocks
*/
export interface GasPriceHistory {
  timestamp: string;
  gasPrice: number; // in gwei
  utilization: number; // 0-1
}

export async function getHistoricalGasPrices(
  network: string,
  days: number = 7
): Promise<GasPriceHistory[]> {
  try {
    const blocksPerDay = 100; // ~10 min intervals
    const limit = days * blocksPerDay;
    
    const blocks = await getRecentBlocks(limit, network);
    
    return blocks.map(block => {
      const gasUsed = parseFloat(block.gasUsed);
      const gasLimit = parseFloat(block.gasLimit);
      const utilization = gasLimit > 0 ? gasUsed / gasLimit : 0;
      
      // Estimate gas price from utilization (higher util = higher gas)
      // Base: 1 gwei, scales up to 50 gwei at 100% utilization
      const estimatedGasPrice = 1 + (utilization * 49);
      
      return {
        timestamp: block.timestamp,
        gasPrice: estimatedGasPrice,
        utilization
      };
    });
  } catch (err) {
    console.error(`Gas History Error for ${network}:`, err);
    return [];
  }
}

/* ---------- 10. Get Token Liquidity Distribution ----------
  Extracts TVL patterns from top tokens for synthetic generation
*/
export interface LiquidityDistribution {
  tvl: number;
  count: number;
  tokenSymbol?: string;
}

export async function getTokenLiquidityDistribution(
  network: string
): Promise<LiquidityDistribution[]> {
  try {
    const tokens = await getTopTokens(100, network);
    
    const distribution: LiquidityDistribution[] = tokens
      .filter(t => t.marketCap && t.marketCap > 0)
      .map(t => ({
        tvl: t.marketCap!,
        count: 1,
        tokenSymbol: t.symbol
      }));
    
    console.log(`📊 Fetched ${distribution.length} token liquidity data points from ${network}`);
    return distribution;
  } catch (err) {
    console.error(`Liquidity Distribution Error for ${network}:`, err);
    return [];
  }
}

/* ---------- 11. Get Uniswap-like Pool Data ----------
  Attempts to identify DEX pools from token transfers
  This is a heuristic approach for MVP
*/
export interface PoolData {
  address: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  liquidityUSD?: number;
  volume24h?: number;
}

export async function getTopUniswapPools(
  network: string,
  limit: number = 50
): Promise<PoolData[]> {
  try {
    console.log(`🔍 Fetching top pools from ${network} via Blockscout...`);
    
    // Strategy: Get top tokens and infer pools from transfers
    // This is a simplified heuristic for MVP
    const tokens = await getTopTokens(20, network);
    const pools: PoolData[] = [];
    
    // Create synthetic pool pairs from top tokens
    for (let i = 0; i < tokens.length && pools.length < limit; i++) {
      for (let j = i + 1; j < tokens.length && pools.length < limit; j++) {
        const token0 = tokens[i];
        const token1 = tokens[j];
        
        // Heuristic: Popular token pairs likely have pools
        const avgMarketCap = ((token0.marketCap || 0) + (token1.marketCap || 0)) / 2;
        const avgVolume = ((token0.volume24h || 0) + (token1.volume24h || 0)) / 2;
        
        pools.push({
          address: `0x${token0.symbol}${token1.symbol}Pool`, // Synthetic address
          token0: token0.address,
          token1: token1.address,
          token0Symbol: token0.symbol,
          token1Symbol: token1.symbol,
          liquidityUSD: avgMarketCap * 0.1, // Estimate 10% of market cap in pools
          volume24h: avgVolume
        });
      }
    }
    
    console.log(`📦 Generated ${pools.length} pool data points for ${network}`);
    return pools.slice(0, limit);
  } catch (err) {
    console.error(`Pool Data Error for ${network}:`, err);
    return [];
  }
}
 
