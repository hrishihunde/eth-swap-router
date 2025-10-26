/**
 * AMM (Automated Market Maker) Math Library
 * Implements realistic price impact calculations for DEX swaps
 */

export interface SwapOutput {
  outputAmount: number;
  priceImpact: number;        // Percentage (0.01 = 1%)
  effectiveRate: number;       // Actual rate after slippage
  executionPrice: number;      // Price per unit
}

export interface LiquidityPool {
  reserveBase: number;         // Reserve of input token
  reserveQuote: number;        // Reserve of output token
  liquidityUSD: number;        // Total pool TVL in USD
  feePercent: number;          // Pool fee (0.003 = 0.3%)
  poolType: 'constant_product' | 'stable_swap' | 'concentrated_liquidity';
}

/**
 * Uniswap V2/V3 Constant Product Formula (x * y = k)
 * Given input amount, calculate output with price impact
 * 
 * Formula: Δy = (y * Δx * (1 - fee)) / (x + Δx * (1 - fee))
 * 
 * @param inputAmount - Amount of tokens being swapped in
 * @param reserveIn - Reserve of input token in pool
 * @param reserveOut - Reserve of output token in pool
 * @param feePercent - Pool fee as decimal (0.003 for 0.3%)
 */
export function getOutputAmountConstantProduct(
  inputAmount: number,
  reserveIn: number,
  reserveOut: number,
  feePercent: number = 0.003
): SwapOutput {
  // Validate inputs
  if (inputAmount <= 0) {
    throw new Error('Input amount must be positive');
  }
  if (reserveIn <= 0 || reserveOut <= 0) {
    throw new Error('Reserves must be positive');
  }
  if (inputAmount >= reserveIn * 0.9) {
    throw new Error('Trade too large: exceeds 90% of pool reserves');
  }

  // Calculate input amount after fees
  const inputAmountWithFee = inputAmount * (1 - feePercent);

  // Calculate output using constant product formula
  // outputAmount = (reserveOut * inputAmountWithFee) / (reserveIn + inputAmountWithFee)
  const numerator = reserveOut * inputAmountWithFee;
  const denominator = reserveIn + inputAmountWithFee;
  const outputAmount = numerator / denominator;

  // Calculate theoretical output without slippage (using spot price)
  const spotPrice = reserveOut / reserveIn;
  const theoreticalOutput = inputAmount * spotPrice * (1 - feePercent);

  // Price impact = (theoreticalOutput - actualOutput) / theoreticalOutput
  const priceImpact = (theoreticalOutput - outputAmount) / theoreticalOutput;

  // Effective rate after slippage
  const effectiveRate = outputAmount / inputAmount;

  // Execution price (price per unit input token)
  const executionPrice = outputAmount / inputAmount;

  return {
    outputAmount,
    priceImpact,
    effectiveRate,
    executionPrice
  };
}

/**
 * Curve StableSwap Formula
 * Optimized for stablecoin pairs with minimal slippage
 * 
 * Simplified formula for stable assets:
 * More complex than constant product, uses amplification coefficient
 * 
 * @param inputAmount - Amount being swapped
 * @param reserveIn - Input token reserve
 * @param reserveOut - Output token reserve
 * @param amplificationCoefficient - Curve's A parameter (typically 100-200 for stablecoins)
 * @param feePercent - Pool fee
 */
export function getOutputAmountStableSwap(
  inputAmount: number,
  reserveIn: number,
  reserveOut: number,
  amplificationCoefficient: number = 100,
  feePercent: number = 0.0004 // 0.04% typical for Curve
): SwapOutput {
  // Validate inputs
  if (inputAmount <= 0 || reserveIn <= 0 || reserveOut <= 0) {
    throw new Error('All amounts must be positive');
  }

  // For stablecoins, use simplified stable swap approximation
  // At perfect balance (x = y), behaves like constant sum (x + y = k)
  // Away from balance, adds constant product characteristics
  
  const inputAmountWithFee = inputAmount * (1 - feePercent);
  
  // Calculate balance ratio
  const balanceRatio = Math.min(reserveIn, reserveOut) / Math.max(reserveIn, reserveOut);
  
  // Interpolate between constant sum and constant product based on balance
  // High A value = more stable (closer to constant sum)
  const weight = Math.min(1, amplificationCoefficient / 200);
  
  // Constant sum component
  const constantSumOutput = inputAmountWithFee;
  
  // Constant product component
  const constantProductOutput = getOutputAmountConstantProduct(
    inputAmount,
    reserveIn,
    reserveOut,
    feePercent
  ).outputAmount;
  
  // Weighted average based on amplification and balance
  const outputAmount = (
    constantSumOutput * weight * balanceRatio +
    constantProductOutput * (1 - weight * balanceRatio)
  );

  // Calculate price impact
  const spotPrice = reserveOut / reserveIn;
  const theoreticalOutput = inputAmount * spotPrice * (1 - feePercent);
  const priceImpact = Math.abs(theoreticalOutput - outputAmount) / theoreticalOutput;

  return {
    outputAmount,
    priceImpact,
    effectiveRate: outputAmount / inputAmount,
    executionPrice: outputAmount / inputAmount
  };
}

/**
 * Calculate output for concentrated liquidity pools (Uniswap V3 style)
 * Simplified model: treats as constant product within active tick range
 * 
 * @param inputAmount - Input amount
 * @param pool - Liquidity pool data
 * @param activeRangeLiquidity - Liquidity in active price range (typically 10-50% of total)
 */
export function getOutputAmountConcentratedLiquidity(
  inputAmount: number,
  pool: LiquidityPool,
  activeRangeLiquidity: number = 0.3 // 30% of liquidity in active range
): SwapOutput {
  // Use only active range liquidity for calculation
  const effectiveReserveIn = pool.reserveBase * activeRangeLiquidity;
  const effectiveReserveOut = pool.reserveQuote * activeRangeLiquidity;

  // Apply constant product to active range
  return getOutputAmountConstantProduct(
    inputAmount,
    effectiveReserveIn,
    effectiveReserveOut,
    pool.feePercent
  );
}

/**
 * Calculate multi-hop slippage accumulation
 * Chains multiple swaps and compounds the price impact
 * 
 * @param pools - Array of liquidity pools in the path
 * @param inputAmount - Initial input amount
 */
export function calculatePathSlippage(
  pools: Array<{
    reserveIn: number;
    reserveOut: number;
    feePercent: number;
    poolType: LiquidityPool['poolType'];
  }>,
  inputAmount: number
): {
  finalOutput: number;
  totalSlippage: number;
  priceImpactPerHop: number[];
  effectiveRate: number;
} {
  let currentAmount = inputAmount;
  const priceImpactPerHop: number[] = [];
  
  // Calculate theoretical output with no slippage (just fees)
  let theoreticalAmount = inputAmount;
  
  for (const pool of pools) {
    // Calculate output for this hop
    let swapResult: SwapOutput;
    
    if (pool.poolType === 'stable_swap') {
      swapResult = getOutputAmountStableSwap(
        currentAmount,
        pool.reserveIn,
        pool.reserveOut,
        100, // Default A coefficient
        pool.feePercent
      );
    } else {
      swapResult = getOutputAmountConstantProduct(
        currentAmount,
        pool.reserveIn,
        pool.reserveOut,
        pool.feePercent
      );
    }
    
    currentAmount = swapResult.outputAmount;
    priceImpactPerHop.push(swapResult.priceImpact);
    
    // Theoretical amount (spot price minus fees, no slippage)
    const spotPrice = pool.reserveOut / pool.reserveIn;
    theoreticalAmount *= spotPrice * (1 - pool.feePercent);
  }

  // Total slippage is difference between theoretical and actual
  const totalSlippage = (theoreticalAmount - currentAmount) / theoreticalAmount;

  return {
    finalOutput: currentAmount,
    totalSlippage: Math.max(0, totalSlippage), // Clamp to 0 minimum
    priceImpactPerHop,
    effectiveRate: currentAmount / inputAmount
  };
}

/**
 * Estimate gas cost for a swap in USD
 * 
 * @param gasUnits - Gas units required (typical: 150k for simple swap, 300k+ for complex)
 * @param gasPrice - Gas price in gwei
 * @param ethPrice - ETH price in USD
 */
export function estimateGasCostUSD(
  gasUnits: number,
  gasPrice: number, // in gwei
  ethPrice: number   // in USD
): number {
  const gasCostETH = (gasUnits * gasPrice) / 1e9;
  return gasCostETH * ethPrice;
}

/**
 * Calculate price impact tolerance
 * Returns maximum acceptable slippage based on trade size
 * 
 * @param tradeSizeUSD - Trade size in USD
 */
export function getAcceptableSlippage(tradeSizeUSD: number): number {
  // Small trades (<$1k): 1% acceptable
  if (tradeSizeUSD < 1000) return 0.01;
  
  // Medium trades ($1k-$10k): 0.5% acceptable
  if (tradeSizeUSD < 10000) return 0.005;
  
  // Large trades ($10k-$100k): 0.3% acceptable
  if (tradeSizeUSD < 100000) return 0.003;
  
  // Very large trades (>$100k): 0.1% acceptable
  return 0.001;
}

/**
 * Check if a pool has sufficient liquidity for a trade
 * 
 * @param inputAmount - Amount to trade
 * @param reserveIn - Pool reserve of input token
 * @param maxUtilization - Maximum % of pool to use (default 30%)
 */
export function hasSufficientLiquidity(
  inputAmount: number,
  reserveIn: number,
  maxUtilization: number = 0.3
): boolean {
  return inputAmount <= reserveIn * maxUtilization;
}

/**
 * Calculate optimal route split for large trades
 * Splits trade across multiple paths to minimize slippage
 * 
 * @param totalAmount - Total amount to trade
 * @param paths - Available paths with their liquidity
 */
export function calculateOptimalSplit(
  totalAmount: number,
  paths: Array<{
    pathId: string;
    reserveIn: number;
    reserveOut: number;
    feePercent: number;
  }>
): Array<{ pathId: string; amount: number; expectedOutput: number }> {
  // Simple heuristic: split proportional to liquidity
  const totalLiquidity = paths.reduce((sum, p) => sum + p.reserveIn, 0);
  
  return paths.map(path => {
    const proportion = path.reserveIn / totalLiquidity;
    const amount = totalAmount * proportion;
    
    const { outputAmount } = getOutputAmountConstantProduct(
      amount,
      path.reserveIn,
      path.reserveOut,
      path.feePercent
    );
    
    return {
      pathId: path.pathId,
      amount,
      expectedOutput: outputAmount
    };
  });
}

/**
 * Compare two routes and determine which is better
 * 
 * @param route1 - First route data
 * @param route2 - Second route data
 */
export function compareRoutes(
  route1: { output: number; gasUSD: number; slippage: number },
  route2: { output: number; gasUSD: number; slippage: number }
): {
  winner: 'route1' | 'route2' | 'tie';
  outputDifference: number;
  netDifference: number; // After gas costs
  reason: string;
} {
  const net1 = route1.output - route1.gasUSD;
  const net2 = route2.output - route2.gasUSD;
  
  const netDifference = net1 - net2;
  const outputDifference = route1.output - route2.output;
  
  // Consider routes equal if difference is less than 0.1%
  if (Math.abs(netDifference) < Math.min(net1, net2) * 0.001) {
    return {
      winner: 'tie',
      outputDifference,
      netDifference,
      reason: 'Routes provide virtually identical outputs'
    };
  }
  
  if (net1 > net2) {
    return {
      winner: 'route1',
      outputDifference,
      netDifference,
      reason: `Route 1 provides ${((netDifference / net2) * 100).toFixed(2)}% better net output`
    };
  }
  
  return {
    winner: 'route2',
    outputDifference,
    netDifference,
    reason: `Route 2 provides ${((Math.abs(netDifference) / net1) * 100).toFixed(2)}% better net output`
  };
}
