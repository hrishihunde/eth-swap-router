// client/lib/simulation/test-scenarios.ts

import { TokenKey } from '../core/router';

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  source: TokenKey;
  target: TokenKey;
  amount: number;
  expectedBehavior: {
    minHops: number;
    maxHops: number;
    shouldUseBridge: boolean;
    expectedPriceImpact: 'low' | 'medium' | 'high';
    complexity: 'simple' | 'moderate' | 'complex';
  };
  validationCriteria: {
    maxSlippage: number;
    maxGasUSD: number;
    maxTimeMs: number;
  };
}

/**
 * Comprehensive test scenarios for route finding algorithms
 */
export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'simple-same-chain',
    name: 'Simple Same-Chain Swap',
    description: 'Basic ETH to USDC swap on Ethereum mainnet',
    source: 'ETH.ethereum',
    target: 'USDC.ethereum',
    amount: 1,
    expectedBehavior: {
      minHops: 1,
      maxHops: 1,
      shouldUseBridge: false,
      expectedPriceImpact: 'low',
      complexity: 'simple'
    },
    validationCriteria: {
      maxSlippage: 0.01,      // 1%
      maxGasUSD: 50,
      maxTimeMs: 60000        // 1 minute
    }
  },
  {
    id: 'cross-chain-bridge',
    name: 'Cross-Chain Bridge',
    description: 'USDC from Ethereum to Polygon via bridge',
    source: 'USDC.ethereum',
    target: 'USDC.polygon',
    amount: 1000,
    expectedBehavior: {
      minHops: 1,
      maxHops: 1,
      shouldUseBridge: true,
      expectedPriceImpact: 'low',
      complexity: 'simple'
    },
    validationCriteria: {
      maxSlippage: 0.005,     // 0.5%
      maxGasUSD: 30,
      maxTimeMs: 600000       // 10 minutes (bridge delay)
    }
  },
  {
    id: 'multi-hop-arbitrage',
    name: 'Multi-Hop Cross-Chain Arbitrage',
    description: 'ETH on Ethereum to DAI on Polygon via multiple hops',
    source: 'ETH.ethereum',
    target: 'USDC.polygon',
    amount: 10,
    expectedBehavior: {
      minHops: 2,
      maxHops: 4,
      shouldUseBridge: true,
      expectedPriceImpact: 'medium',
      complexity: 'complex'
    },
    validationCriteria: {
      maxSlippage: 0.03,      // 3%
      maxGasUSD: 100,
      maxTimeMs: 900000       // 15 minutes
    }
  },
  {
    id: 'large-trade-liquidity',
    name: 'Large Trade (Liquidity Test)',
    description: 'Large ETH swap testing price impact and liquidity depth',
    source: 'ETH.ethereum',
    target: 'USDC.ethereum',
    amount: 1000,
    expectedBehavior: {
      minHops: 1,
      maxHops: 3, // May split across pools
      shouldUseBridge: false,
      expectedPriceImpact: 'high',
      complexity: 'moderate'
    },
    validationCriteria: {
      maxSlippage: 0.05,      // 5%
      maxGasUSD: 200,
      maxTimeMs: 120000       // 2 minutes
    }
  },
  {
    id: 'long-tail-token',
    name: 'Long-Tail Token Route',
    description: 'Route between synthetic tokens across chains',
    source: 'SYN123.arbitrum',
    target: 'SYN456.avalanche',
    amount: 100,
    expectedBehavior: {
      minHops: 3,
      maxHops: 6,
      shouldUseBridge: true,
      expectedPriceImpact: 'high',
      complexity: 'complex'
    },
    validationCriteria: {
      maxSlippage: 0.10,      // 10% (long-tail tokens have higher slippage)
      maxGasUSD: 150,
      maxTimeMs: 1200000      // 20 minutes
    }
  },
  {
    id: 'stablecoin-swap',
    name: 'Stablecoin-to-Stablecoin',
    description: 'USDC to USDT swap (should have minimal slippage)',
    source: 'USDC.ethereum',
    target: 'USDT.ethereum',
    amount: 10000,
    expectedBehavior: {
      minHops: 1,
      maxHops: 1,
      shouldUseBridge: false,
      expectedPriceImpact: 'low',
      complexity: 'simple'
    },
    validationCriteria: {
      maxSlippage: 0.001,     // 0.1% (tight spread expected)
      maxGasUSD: 30,
      maxTimeMs: 60000
    }
  },
  {
    id: 'multi-bridge-route',
    name: 'Multiple Bridge Hops',
    description: 'Token route requiring multiple bridge crossings',
    source: 'ETH.ethereum',
    target: 'USDC.avalanche',
    amount: 5,
    expectedBehavior: {
      minHops: 2,
      maxHops: 3,
      shouldUseBridge: true,
      expectedPriceImpact: 'medium',
      complexity: 'complex'
    },
    validationCriteria: {
      maxSlippage: 0.04,      // 4%
      maxGasUSD: 120,
      maxTimeMs: 900000       // 15 minutes (multiple bridges)
    }
  },
  {
    id: 'gas-optimization',
    name: 'Gas-Constrained Route',
    description: 'Small trade where gas cost is significant relative to amount',
    source: 'ETH.ethereum',
    target: 'USDC.ethereum',
    amount: 0.1,
    expectedBehavior: {
      minHops: 1,
      maxHops: 1, // Should minimize hops due to gas concerns
      shouldUseBridge: false,
      expectedPriceImpact: 'low',
      complexity: 'simple'
    },
    validationCriteria: {
      maxSlippage: 0.02,      // 2%
      maxGasUSD: 20,          // Strict gas limit
      maxTimeMs: 60000
    }
  }
];

/**
 * Get scenario by ID
 */
export function getScenario(id: string): TestScenario | undefined {
  return TEST_SCENARIOS.find(s => s.id === id);
}

/**
 * Get scenarios by complexity
 */
export function getScenariosByComplexity(
  complexity: 'simple' | 'moderate' | 'complex'
): TestScenario[] {
  return TEST_SCENARIOS.filter(s => s.expectedBehavior.complexity === complexity);
}

/**
 * Get scenarios that require bridges
 */
export function getCrossChainScenarios(): TestScenario[] {
  return TEST_SCENARIOS.filter(s => s.expectedBehavior.shouldUseBridge);
}

/**
 * Validate scenario result against expected behavior
 */
export function validateScenarioResult(
  scenario: TestScenario,
  result: {
    hopCount: number;
    hasBridge: boolean;
    priceImpact: number;
    gasUSD: number;
    timeMs: number;
  }
): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check hop count
  if (result.hopCount < scenario.expectedBehavior.minHops) {
    issues.push(`Too few hops: ${result.hopCount} < ${scenario.expectedBehavior.minHops}`);
  }
  if (result.hopCount > scenario.expectedBehavior.maxHops) {
    issues.push(`Too many hops: ${result.hopCount} > ${scenario.expectedBehavior.maxHops}`);
  }

  // Check bridge usage
  if (scenario.expectedBehavior.shouldUseBridge && !result.hasBridge) {
    issues.push('Expected bridge but none used');
  }

  // Check validation criteria
  if (result.priceImpact > scenario.validationCriteria.maxSlippage) {
    issues.push(`Slippage too high: ${(result.priceImpact * 100).toFixed(2)}% > ${(scenario.validationCriteria.maxSlippage * 100).toFixed(2)}%`);
  }

  if (result.gasUSD > scenario.validationCriteria.maxGasUSD) {
    issues.push(`Gas too expensive: $${result.gasUSD.toFixed(2)} > $${scenario.validationCriteria.maxGasUSD}`);
  }

  if (result.timeMs > scenario.validationCriteria.maxTimeMs) {
    issues.push(`Execution too slow: ${(result.timeMs / 60000).toFixed(1)}min > ${(scenario.validationCriteria.maxTimeMs / 60000).toFixed(1)}min`);
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Generate report for scenario test run
 */
export function generateScenarioReport(
  scenario: TestScenario,
  classicResult: any,
  psbResult: any
): {
  scenarioName: string;
  classicPassed: boolean;
  psbPassed: boolean;
  winner: 'classic' | 'psb' | 'tie';
  summary: string;
} {
  const classicValidation = validateScenarioResult(scenario, classicResult);
  const psbValidation = validateScenarioResult(scenario, psbResult);

  let winner: 'classic' | 'psb' | 'tie' = 'tie';
  if (classicResult.outputAmount > psbResult.outputAmount * 1.01) {
    winner = 'classic';
  } else if (psbResult.outputAmount > classicResult.outputAmount * 1.01) {
    winner = 'psb';
  }

  const summary = `
${scenario.name}:
- Classic: ${classicValidation.passed ? '✅ PASS' : '❌ FAIL'} (${classicValidation.issues.length} issues)
- PSB: ${psbValidation.passed ? '✅ PASS' : '❌ FAIL'} (${psbValidation.issues.length} issues)
- Winner: ${winner.toUpperCase()}
- Output Difference: ${Math.abs(classicResult.outputAmount - psbResult.outputAmount).toFixed(4)}
  `.trim();

  return {
    scenarioName: scenario.name,
    classicPassed: classicValidation.passed,
    psbPassed: psbValidation.passed,
    winner,
    summary
  };
}
