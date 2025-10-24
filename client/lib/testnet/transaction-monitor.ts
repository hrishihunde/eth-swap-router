// Transaction monitoring service aligned with new partners modules
// Note: Blockscout partner module throws if env is missing; import dynamically at call time.
type BlockscoutMod = typeof import('../partners/blockscout');
import { fetchSymbolPrice } from '../partners/pyth';
import { getTestnetConfig } from './testnet-config';

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  avgGasPriceGwei?: number;
}

export class TransactionMonitor {
  private chainId: number;

  constructor(chainId: number) {
    this.chainId = chainId;
  }

  // Monitor a transaction with periodic polling
  async monitorTransaction(
    txHash: string,
    onUpdate: (status: TransactionStatus) => void,
    onComplete: (status: TransactionStatus) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const interval = setInterval(async () => {
        try {
          const status = await this.getTransactionStatus(txHash);
          onUpdate(status);

          if (status.status === 'confirmed' || status.status === 'failed') {
            clearInterval(interval);
            onComplete(status);
          }
        } catch (error) {
          clearInterval(interval);
          onError(error as Error);
        }
      }, 2000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(interval);
        onError(new Error('Transaction monitoring timeout'));
      }, 300000);
    } catch (error) {
      onError(error as Error);
    }
  }

  // Minimal transaction status via Blockscout REST
  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    const { getTxStatus, getGasPrice: getBlockscoutGasPrice } = await this.getBlockscout();
    const tx = await getTxStatus(txHash);
    if (!tx) throw new Error('Transaction not found');
    const gas = await getBlockscoutGasPrice().catch(() => null);
    return {
      hash: tx.hash,
      status: tx.status,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed,
      avgGasPriceGwei: gas?.average,
    };
  }

  // Get account balance with optional USD conversion via Pyth
  async getAccountBalance(
    address: string,
    tokenAddress?: string
  ): Promise<{
    balance: number; // human-readable units
    balanceUSD: number | null; // null when price unavailable
    token: {
      symbol: string;
      decimals: number;
    };
  } | null> {
    try {
      const bs = await this.getBlockscout();
      if (tokenAddress) {
        const tb: BlockscoutMod['getTokenBalance'] extends (...args: any) => any ? Awaited<ReturnType<BlockscoutMod['getTokenBalance']>> : never = await bs.getTokenBalance(address, tokenAddress);
        if (!tb) return null;

        const price = await this.getUsdPriceForSymbol(tb.symbol || 'USDC');
        return {
          balance: tb.balance,
          balanceUSD: price ? tb.balance * price : null,
          token: { symbol: tb.symbol || 'TKN', decimals: tb.decimals || 18 },
        };
      }

      const native = await bs.getNativeBalance(address);
      if (native == null) return null;

      const nativeSymbol = getTestnetConfig(this.chainId)?.nativeCurrency.symbol || 'ETH';
      const price = await this.getUsdPriceForSymbol(nativeSymbol);
      return {
        balance: native,
        balanceUSD: price ? native * price : null,
        token: { symbol: nativeSymbol, decimals: 18 },
      };
    } catch (error) {
      throw new Error(`Failed to get account balance: ${error}`);
    }
  }

  // Gas price via Blockscout oracle (average in gwei) with USD estimation per unit gas
  async getGasPrice(): Promise<{
    averageGwei: number;
    fastGwei: number;
    slowGwei: number;
    ethUsd: number | null;
  }> {
    try {
      const { getGasPrice: getBlockscoutGasPrice } = await this.getBlockscout();
      const gas = await getBlockscoutGasPrice();
      const ethUsd = await this.getUsdPriceForSymbol('ETH');
      return { averageGwei: gas.average, fastGwei: gas.fast, slowGwei: gas.slow, ethUsd };
    } catch (error) {
      throw new Error(`Failed to get gas price: ${error}`);
    }
  }

  // Estimate transaction cost using RPC eth_estimateGas and Blockscout gas oracle
  async estimateTransactionCost(transaction: {
    from: string;
    to: string;
    value?: string;
    data?: string;
  }): Promise<{
    gasLimit: number;
    gasPriceGwei: number;
    totalCostEth: number;
    totalCostUSD: number | null;
  }> {
    try {
      const rpc = getTestnetConfig(this.chainId)?.rpcUrl;
      if (!rpc) throw new Error('Missing RPC URL for chain');

      const estimateRes = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_estimateGas',
          params: [transaction],
          id: 1,
        }),
      });
      const estimateJson = await estimateRes.json();
      const gasLimit = parseInt(estimateJson.result, 16);

  const { getGasPrice: getBlockscoutGasPrice } = await this.getBlockscout();
  const gas = await getBlockscoutGasPrice();
      const gasPriceGwei = gas.average;
      const totalCostEth = (gasLimit * gasPriceGwei) / 1e9; // gas * gwei -> ETH
      const ethUsd = await this.getUsdPriceForSymbol('ETH');

      return {
        gasLimit,
        gasPriceGwei,
        totalCostEth,
        totalCostUSD: ethUsd ? totalCostEth * ethUsd : null,
      };
    } catch (error) {
      throw new Error(`Failed to estimate transaction cost: ${error}`);
    }
  }

  // Currently not supported via partners REST; return empty list
  async getTransactionHistory(_address: string, _limit = 50): Promise<TransactionStatus[]> {
    return [];
  }

  private async getUsdPriceForSymbol(symbol: string): Promise<number | null> {
    // Default to known Pyth ETH/USD price ID when symbol is ETH
    const ETH_USD_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';
    try {
      const price = await fetchSymbolPrice(symbol === 'ETH' ? 'ETH/USD' : `${symbol}/USD`);
      return price?.price ?? null;
    } catch {
      return null;
    }
  }
  private async getBlockscout(): Promise<BlockscoutMod> {
    return await import('../partners/blockscout');
  }
}

// Create transaction monitor instance
export function createTransactionMonitor(chainId: number): TransactionMonitor {
  return new TransactionMonitor(chainId);
}
