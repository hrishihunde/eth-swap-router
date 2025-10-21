// client/types/route.ts
// temporary type list - will write detailed comments on usage, and decision
export type Chain = 'ethereum' | 'polygon' | 'avail' | string;

export interface Node {
  token: string; 
  chain: Chain;
}

export interface RouteHop {
  from: Node;
  to: Node;
  type: 'swap' | 'bridge';
  expectedOut: number;
  feesUSD: number;
  liquidityDepth: number;
  confidence: number; // 0..1
  meta?: Record<string, any>;
}

export interface Route {
  id: string;
  input: { token: string; chain: Chain; amount: number };
  outputToken: { token: string; chain: Chain };
  hops: RouteHop[];
  totalExpectedOut: number;
  totalGasUSD: number;
  worstCaseOut: number;
  computedAt: string;
}
