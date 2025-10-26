# System Architecture

This document provides a comprehensive overview of the ETH Swap Router's architecture, including component design, data flow, and integration patterns.

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [System Components](#system-components)
3. [Data Flow](#data-flow)
4. [Graph Construction](#graph-construction)
5. [Routing Engine](#routing-engine)
6. [Frontend Architecture](#frontend-architecture)
7. [API Design](#api-design)
8. [State Management](#state-management)
9. [Deployment Architecture](#deployment-architecture)

## High-Level Overview

The ETH Swap Router is a **full-stack TypeScript application** built on Next.js 15 that enables optimal cross-chain token swaps through advanced graph-based routing algorithms.

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │ Swap UI    │  │ Route Viz  │  │ Benchmark Dashboard  │   │
│  │ (React)    │  │ (Charts)   │  │ (Performance)        │   │ 
│  └────────────┘  └────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js)                     │
│  /api/route/estimate  •  /api/route/compare                 │
│  /api/benchmark/generate  •  /api/graph/validate            │
└─────────────────────────────────────────────────────────────┘
                           ↕ Function Calls
┌─────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Graph Builder  →  Router  →  Route Validator        │   │
│  │  (lib/core)        (SSSP)      (lib/core)            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Algorithm Layer                                     │   │
│  │  • Classic Dijkstra  • PSB-Dijkstra  • AMM Math      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕ API Calls
┌─────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER                         │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────┐    │ 
│  │  Pyth    │    │  Blockscout  │    │  Avail Network  │    │
│  │  Oracle  │    │  Explorer    │    │  Bridge DA      │    │
│  └──────────┘    └──────────────┘    └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↕ RPC/REST
┌─────────────────────────────────────────────────────────────┐
│                   BLOCKCHAIN LAYER                          │
│  Ethereum • Polygon • Arbitrum • Optimism • Avalanche       │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**: Clear boundaries between routing logic, data fetching, and presentation
2. **Modularity**: Independent, testable components with well-defined interfaces
3. **Performance First**: Optimized algorithms and efficient data structures
4. **Extensibility**: Easy to add new chains, DEXs, or routing algorithms
5. **Type Safety**: Comprehensive TypeScript types throughout

## System Components

### 1. Graph Builder (`lib/core/graph-generator.ts`)

**Responsibility**: Construct the multi-chain token graph from various data sources.

**Key Functions**:
```typescript
interface TokenVertex {
  key: string;           // Unique identifier: "SYMBOL.chain"
  symbol: string;        // Token symbol
  chain: string;         // Blockchain name
  address?: string;      // Contract address
  decimals?: number;     // Token decimals
  priceUSD?: number;     // Current USD price
}

interface GraphEdge {
  target: string;        // Target vertex key
  kind: 'swap' | 'bridge';
  rate?: number;         // Exchange rate
  liquidity?: LiquidityPool;
  gas?: number;          // Gas cost estimate
  bridgeFee?: number;    // Bridge fee percentage
  timeDelay?: number;    // Bridge latency (seconds)
}

async function buildRouteGraph(
  vertices: TokenVertex[],
  maxHops?: number
): Promise<RouteGraph>
```

**Process**:
1. Initialize graph with all token vertices
2. Query Pyth for price data
3. Fetch pool liquidity from DEXs (via Blockscout or The Graph)
4. Create swap edges for tokens on same chain
5. Create bridge edges for same token on different chains
6. Calculate edge weights based on rates, fees, gas

**Data Sources**:
- **Pyth Network**: Real-time token prices
- **Blockscout**: On-chain pool data and balances
- **Static Config**: Known bridge routes and DEX deployments

### 2. Router Core (`lib/core/router.ts`)

**Responsibility**: Execute pathfinding algorithms to find optimal swap routes.

**Key Functions**:
```typescript
async function findBestRoute(
  graph: RouteGraph,
  source: TokenKey,
  target: TokenKey,
  maxHops: number
): Promise<RouteResult>

interface RouteResult {
  path: TokenKey[];
  totalWeight: number;
  estimatedOutput: number;
  steps: RouteStep[];
}
```

**Algorithm Selection**:
- Automatically chooses between Classic and PSB-Dijkstra
- Based on graph size and density
- Can be overridden via configuration

**Features**:
- Hop limiting (prevents impractical routes)
- Early termination (stops when target reached)
- Dynamic weight calculation
- Gas cost tracking

### 3. Algorithm Implementations

#### Classic Dijkstra (`lib/core/algorithms/classic-dijkstra.ts`)

Standard SSSP with priority queue optimization.

**Best for**: Small to medium graphs (< 50 tokens)

#### PSB-Dijkstra (`lib/core/algorithms/psb-dijkstra.ts`)

Advanced algorithm with frontier reduction.

**Best for**: Large graphs (100+ tokens)

**Features**:
- Pivot identification
- Recursive BMSSP
- Metrics tracking (execution time, nodes visited, etc.)
- Dynamic trade amount propagation

See [ALGORITHMS.md](./ALGORITHMS.md) for detailed explanation.

### 4. AMM Math Library (`lib/core/amm-math.ts`)

**Responsibility**: Calculate accurate swap outputs using AMM formulas.

**Supported Pool Types**:

1. **Constant Product (Uniswap V2)**:
   ```typescript
   function getOutputAmountConstantProduct(
     inputAmount: number,
     reserveIn: number,
     reserveOut: number,
     feePercent: number
   ): SwapOutput
   ```
   Formula: `x * y = k`

2. **Stable Swap (Curve)**:
   ```typescript
   function getOutputAmountStableSwap(
     inputAmount: number,
     reserveIn: number,
     reserveOut: number,
     amplificationCoeff: number,
     feePercent: number
   ): SwapOutput
   ```
   Formula: Hybrid constant sum + constant product

3. **Concentrated Liquidity (Uniswap V3)**:
   - Simulated via effective reserves
   - Accounts for active range

**Output**:
```typescript
interface SwapOutput {
  outputAmount: number;      // Tokens out
  effectiveRate: number;     // Actual exchange rate
  priceImpact: number;       // Slippage percentage
  feeAmount: number;         // Protocol fees paid
}
```

### 5. Network Configuration (`lib/core/networks.ts`)

**Responsibility**: Define supported blockchains and their properties.

```typescript
interface NetworkConfig {
  chainId: number;
  name: string;
  nativeToken: string;
  avgBlockTime: number;      // seconds
  avgGasPrice: number;       // gwei
  rpcUrl: string;
  explorerUrl: string;
  bridgeSupport: string[];   // Compatible chains
}

const NETWORKS: Record<string, NetworkConfig> = {
  ethereum: { chainId: 1, ... },
  polygon: { chainId: 137, ... },
  // etc.
}
```

**Helper Functions**:
- `getNetwork(name: string)`: Get config by name
- `canBridge(from, to)`: Check if bridging is supported
- `estimateBridgeTime(from, to)`: Estimate cross-chain latency

### 6. Partner Integrations

#### Pyth Network (`lib/partners/pyth.ts`)

**Purpose**: Fetch real-time, high-fidelity price data.

```typescript
async function fetchPythPriceFeed(
  feedId: string,
  symbol: string
): Promise<PythPrice | null>

async function getPriceRatio(
  baseSymbol: string,
  quoteSymbol: string
): Promise<number | null>
```

**API**: Hermes endpoint (`https://hermes.pyth.network`)

**Price Feeds**: See `lib/partners/pyth-feed.ts` for feed ID mappings

**Error Handling**: Graceful fallback to static rates if API unavailable

#### Blockscout (`lib/partners/blockscout.ts`)

**Purpose**: Verify on-chain data and token balances.

```typescript
async function getTokenBalance(
  address: string,
  tokenSymbol: string,
  chain: string
): Promise<BalanceInfo | null>
```

**Features**:
- Multi-chain support
- Token metadata retrieval
- Transaction verification

#### Avail Network (`lib/partners/avail.ts`)

**Purpose**: Cross-chain data availability for bridge transactions.

```typescript
class AvailNexusClient {
  async initialize(walletProvider: any): Promise<void>
  
  async executeBridge(params: {
    token: string;
    amount: number;
    targetChainId: number;
  }): Promise<BridgeTxResult>
  
  async publishRouteData(
    routeData: BridgeRouteData
  ): Promise<boolean>
}
```

**Integration**: Uses `@avail-project/nexus-core` SDK

**Features**:
- Intent-based bridging
- Progress tracking
- Multi-source aggregation

See [INTEGRATION.md](./INTEGRATION.md) for detailed integration guide.

### 7. Route Validator (`lib/core/route-validator.ts`)

**Responsibility**: Validate routes before execution.

**Checks**:
- Path connectivity (all edges exist)
- Liquidity sufficiency (pools can handle trade size)
- Gas affordability (user has enough for gas)
- Bridge compatibility (chains support bridging)
- Slippage tolerance (price impact within limits)

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedGas: number;
  estimatedTime: number;
}

async function validateRoute(
  route: RouteResult,
  userBalance: number,
  slippageTolerance: number
): Promise<ValidationResult>
```

### 8. Metrics Logger (`lib/core/metrics-logger.ts`)

**Responsibility**: Track and log performance metrics.

**Metrics Collected**:
- Route computation time
- Graph construction time
- API call latencies
- Cache hit rates
- Algorithm performance (nodes visited, pivots found)

**Storage**: Local JSON files in `results/` directory

**Format**:
```typescript
interface BenchmarkResult {
  timestamp: string;
  algorithm: 'classic' | 'psb';
  tokenCount: number;
  chainCount: number;
  executionTimeMs: number;
  nodesVisited: number;
  pathLength: number;
  estimatedOutput: number;
}
```

## Data Flow

### 1. Swap Request Flow

```
User Input
   ↓
[Validate Input]
   ↓
[Fetch Current Data] ← Pyth Prices
   ↓                 ← Blockscout Balances
[Build Graph]
   ↓
[Select Algorithm] → Classic or PSB?
   ↓
[Find Best Route]
   ↓
[Validate Route]
   ↓
[Display to User]
   ↓
[Execute Swap] → Blockchain TX
```

### 2. Graph Construction Flow

```
Token List (config)
   ↓
[Query Pyth] → Price feeds
   ↓
[Query Blockscout] → Pool data
   ↓
[Build Vertices] → TokenKey nodes
   ↓
[Create Swap Edges] → Same chain, different tokens
   ↓
[Create Bridge Edges] → Same token, different chains
   ↓
[Calculate Weights] → -ln(rate) + fees + gas
   ↓
RouteGraph (ready for pathfinding)
```

### 3. Route Execution Flow

```
Route Result
   ↓
[Split into Steps]
   ↓
For each step:
   ↓
   Is Bridge? → YES → [Avail Publish] → [Wait for confirmation] → [Complete on target chain]
        ↓ NO
   [Execute Swap] → [DEX Contract Call]
        ↓
   [Confirm TX]
        ↓
   [Update UI]
   ↓
[All Steps Complete]
   ↓
[Final Balance Check]
```

## Frontend Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: TailwindCSS 4
- **State Management**: React Query (@tanstack/react-query)
- **Web3**: Wagmi + Viem
- **Charts**: (To be added: Recharts or similar)

### Component Hierarchy

```
app/
├── layout.tsx                    # Root layout with providers
├── page.tsx                      # Main swap interface
│
components/
├── providers.tsx                 # React Query + Wagmi providers
├── theme-provider.tsx            # Dark/light mode
│
├── swap/
│   ├── SwapPanel.tsx             # Main swap container
│   ├── EnhancedSwapPanel.tsx     # Advanced features
│   ├── TokenSelector.tsx         # Token picker dropdown
│   ├── NetworkSelector.tsx       # Chain selector
│   ├── SwapInput.tsx             # Amount input field
│   ├── SwapActions.tsx           # Swap/bridge buttons
│   └── RouteComparison.tsx       # Compare multiple routes
│
├── testnet/
│   ├── TestnetDashboard.tsx      # Testnet controls
│   ├── BenchmarkDashboard.tsx    # Performance metrics
│   └── NetworkStatus.tsx         # Chain health indicators
│
└── ui/
    ├── button.tsx                # Reusable button
    ├── card.tsx                  # Card component
    ├── input.tsx                 # Input field
    ├── badge.tsx                 # Status badges
    └── progress.tsx              # Progress indicators
```

### State Management Strategy

**React Query** for server state:
```typescript
// Fetch route
const { data: route, isLoading } = useQuery({
  queryKey: ['route', sourceToken, targetToken, amount],
  queryFn: () => fetchRoute(sourceToken, targetToken, amount),
  staleTime: 10000, // 10 seconds
});
```

**Local State** for UI:
```typescript
const [sourceToken, setSourceToken] = useState<TokenKey>('ETH.ethereum');
const [targetToken, setTargetToken] = useState<TokenKey>('USDC.polygon');
const [amount, setAmount] = useState<string>('1.0');
```

**Wagmi** for Web3 state:
```typescript
const { address, isConnected } = useAccount();
const { chain } = useNetwork();
const { data: balance } = useBalance({ address, token });
```

### Custom Hooks

```typescript
// useRouter hook
function useRouter() {
  const findRoute = async (source: string, target: string) => {
    // Build graph, run algorithm, return result
  };
  
  const compareRoutes = async (routes: RouteRequest[]) => {
    // Compare multiple routing options
  };
  
  return { findRoute, compareRoutes };
}
```

## API Design

### Endpoints

#### 1. Route Estimation

**Endpoint**: `POST /api/route/estimate`

**Request**:
```json
{
  "sourceToken": "ETH.ethereum",
  "targetToken": "USDC.polygon",
  "inputAmount": 1.0,
  "maxHops": 4,
  "algorithm": "psb"
}
```

**Response**:
```json
{
  "route": {
    "path": ["ETH.ethereum", "USDC.ethereum", "USDC.polygon"],
    "steps": [
      {
        "from": "ETH.ethereum",
        "to": "USDC.ethereum",
        "kind": "swap",
        "outputAmount": 1850.25
      },
      {
        "from": "USDC.ethereum",
        "to": "USDC.polygon",
        "kind": "bridge",
        "outputAmount": 1848.40,
        "bridgeFee": 0.001
      }
    ],
    "estimatedOutput": 1848.40,
    "totalGas": 0.0008,
    "estimatedTime": 125
  },
  "metrics": {
    "executionTimeMs": 42,
    "nodesVisited": 18
  }
}
```

#### 2. Route Comparison

**Endpoint**: `POST /api/route/compare`

**Request**:
```json
{
  "sourceToken": "ETH.ethereum",
  "targetToken": "USDC.polygon",
  "inputAmount": 1.0,
  "algorithms": ["classic", "psb"]
}
```

**Response**:
```json
{
  "routes": [
    { "algorithm": "classic", "route": {...}, "metrics": {...} },
    { "algorithm": "psb", "route": {...}, "metrics": {...} }
  ],
  "recommendation": "psb"
}
```

#### 3. Benchmark Generation

**Endpoint**: `POST /api/benchmark/generate`

**Request**:
```json
{
  "tokenCounts": [10, 50, 100],
  "chainCount": 3,
  "iterations": 10,
  "algorithm": "psb"
}
```

**Response**:
```json
{
  "results": [
    {
      "tokenCount": 10,
      "avgExecutionTimeMs": 3.2,
      "avgNodesVisited": 8.5,
      "stdDev": 0.4
    }
  ],
  "timestamp": "2025-10-26T12:00:00Z"
}
```

#### 4. Graph Validation

**Endpoint**: `POST /api/graph/validate`

**Purpose**: Check if a manually constructed graph is valid

## State Management

### Application State

```typescript
interface AppState {
  // Swap state
  swap: {
    sourceToken: TokenKey;
    targetToken: TokenKey;
    inputAmount: string;
    route: RouteResult | null;
    isLoading: boolean;
  };
  
  // Graph state
  graph: {
    vertices: Vertex[];
    edges: RouteGraph;
    lastUpdated: number;
  };
  
  // UI state
  ui: {
    theme: 'light' | 'dark';
    showAdvanced: boolean;
    slippageTolerance: number;
  };
  
  // Web3 state
  wallet: {
    address: string | null;
    chainId: number | null;
    isConnected: boolean;
  };
}
```

### Data Caching Strategy

**In-Memory Cache**:
- Graph construction results (5 min TTL)
- Route computation results (10 sec TTL)
- Price feed data (30 sec TTL)

**Browser Storage**:
- User preferences (localStorage)
- Recent trades (sessionStorage)

**React Query Cache**:
- Automatic background refetching
- Stale-while-revalidate pattern
- Optimistic updates

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────┐
│  Developer Machine              │
│  ┌───────────────────────────┐  │
│  │  Next.js Dev Server       │  │
│  │  (localhost:3000)         │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  HMR + Fast Refresh │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Production Environment

```
┌──────────────────────────────────────────────────┐
│  Vercel Edge Network                             │
│  ┌────────────────────────────────────────────┐  │
│  │  Next.js App (Serverless Functions)        │  │
│  │  • Static: Pre-rendered pages              │  │
│  │  • SSR: Dynamic routes                     │  │
│  │  • API: Serverless endpoints               │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
               ↓ External Calls
┌──────────────────────────────────────────────────┐
│  External Services                               │
│  • Pyth Hermes API                               │
│  • Blockscout APIs                               │
│  • Blockchain RPC Endpoints                      │
│  • Avail Network                                 │
└──────────────────────────────────────────────────┘
```

### Docker Deployment (Optional)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

**Docker Compose**:
```yaml
version: '3.8'
services:
  client:
    build: ./client
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_ETHEREUM_RPC_URL=${ETHEREUM_RPC}
      - NEXT_PUBLIC_POLYGON_RPC_URL=${POLYGON_RPC}
```

### Scalability Considerations

**Horizontal Scaling**:
- Stateless Next.js functions scale automatically on Vercel
- No server-side session state
- All computation is per-request

**Caching Layers**:
- CDN edge caching for static assets
- API route caching for repeated queries
- Client-side React Query cache

**Rate Limiting**:
- Implement rate limits for expensive operations (benchmark generation)
- Use Redis for distributed rate limiting (if needed)

**Monitoring**:
- Vercel Analytics for frontend metrics
- Custom metrics endpoint for algorithm performance
- Error tracking (Sentry or similar)

## Security Considerations

### Input Validation

```typescript
// Validate token keys
function isValidTokenKey(key: string): boolean {
  return /^[A-Z0-9]+\.[a-z]+$/.test(key);
}

// Validate amounts
function isValidAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num < 1e18;
}
```

### API Security

- **CORS**: Configured for allowed origins only
- **Rate Limiting**: Prevent abuse of expensive endpoints
- **Input Sanitization**: All user input is validated
- **No Private Keys**: All signing happens client-side via wallet

### Web3 Security

- **Contract Verification**: Use only verified contracts
- **Slippage Protection**: Always set max slippage tolerance
- **Transaction Simulation**: Preview tx before sending
- **Wallet Connection**: Never request private keys

## Performance Optimization

### Algorithm Optimizations

1. **Early Termination**: Stop when target is reached
2. **Hop Limiting**: Prevent exploring deep paths
3. **Liquidity Filtering**: Skip low-liquidity pools
4. **Dynamic Algorithm Selection**: Choose best algorithm for graph size

### Frontend Optimizations

1. **Code Splitting**: Dynamic imports for heavy components
2. **Image Optimization**: Next.js Image component
3. **Lazy Loading**: Load components on demand
4. **Memoization**: React.memo and useMemo for expensive renders

### API Optimizations

1. **Response Caching**: Cache route computations
2. **Parallel Fetching**: Fetch prices and balances concurrently
3. **Request Batching**: Batch multiple route requests
4. **Compression**: Gzip/Brotli for API responses

## Testing Strategy

### Unit Tests
- Algorithm correctness (Dijkstra, PSB-Dijkstra)
- AMM math functions
- Utility functions

### Integration Tests
- Graph construction from real data
- End-to-end route finding
- API endpoint responses

### Performance Tests
- Benchmark suite for algorithms
- Load testing for API endpoints
- Memory leak detection

See test files in respective directories.

## Future Enhancements

### Phase 2 Features

1. **Multi-Path Routing**: Split trades across multiple paths
2. **MEV Protection**: Integrate Flashbots or similar
3. **Intent-Based Execution**: Use Avail Nexus intent system fully
4. **Historical Analytics**: Track route performance over time
5. **Machine Learning**: Predict best routes based on patterns

### Phase 3 Features

1. **Cross-DEX Aggregation**: Support multiple DEXs per chain
2. **Lending Integration**: Include lend/borrow in routes
3. **Gas Optimization**: Dynamic gas strategy based on urgency
4. **Advanced Bridges**: Support more bridge protocols

## Conclusion

This architecture provides a **solid foundation** for a production-grade cross-chain DEX aggregator. Key strengths:

- **Modular Design**: Easy to extend and maintain
- **Performance**: Optimized algorithms for fast routing
- **Reliability**: Comprehensive validation and error handling
- **Scalability**: Stateless design scales horizontally

For implementation details, see:
- [ALGORITHMS.md](./ALGORITHMS.md) - Algorithm deep dive
- [INTEGRATION.md](./INTEGRATION.md) - Partner integration details
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

---

**Last Updated**: October 26, 2025
