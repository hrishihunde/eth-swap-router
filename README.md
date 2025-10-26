# ETH Swap Router - Cross-Chain DEX Aggregator

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

> A sophisticated cross-chain token swap aggregator implementing advanced routing algorithms with Avail, Blockscout, and Pyth Network integrations.

## 🎯 Overview

ETH Swap Router is a **cross-chain DEX aggregator** that automatically finds optimal swap routes across multiple blockchain networks. Like a travel app that finds the cheapest flight with the best connections, our system discovers the most efficient path to swap tokens—maximizing output while minimizing costs and delays.

### Key Features

- **🔄 Cross-Chain Routing**: Seamlessly swap tokens across Ethereum, Polygon, Arbitrum, Optimism, and Avalanche
- **🧠 Advanced Algorithms**: Implements both Classic Dijkstra and Post-Sorting-Barrier (PSB) Dijkstra for optimal pathfinding
- **🌉 Bridge Integration**: Uses [Avail Network](https://www.availproject.org/) for decentralized cross-chain data availability
- **📊 Real-Time Pricing**: Integrates [Pyth Network](https://pyth.network/) oracles for accurate, high-fidelity price feeds
- **🔍 Multi-Chain Explorer**: Leverages [Blockscout](https://www.blockscout.com/) for transparent on-chain data verification
- **⚡ Dynamic Liquidity**: Real-time AMM calculations with price impact modeling
- **📈 Performance Benchmarking**: Built-in tools to measure and visualize routing performance

### Problem Statement

Traditional DEX aggregators face several challenges:
1. **Limited to single chains**: Most aggregators only work within one blockchain
2. **Suboptimal routes**: Simple routing algorithms miss better multi-hop paths
3. **Performance bottlenecks**: Route computation slows dramatically with complexity ("sorting barrier")
4. **Lack of transparency**: Centralized data sources and opaque bridging mechanisms

### Our Solution

We address these challenges through:
- **Multi-chain graph construction**: Unified token graph spanning multiple blockchains with bridge edges
- **Advanced pathfinding**: PSB-Dijkstra algorithm reduces computation from O(m + n log n) to O(m log^(2/3) n)
- **Decentralized infrastructure**: Avail for data availability, Pyth for prices, Blockscout for verification
- **Real-time optimization**: Dynamic weight calculation based on actual liquidity and trade size

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  ┌────────────────┐ ┌──────────────┐ ┌────────────────────┐     │
│  │  Swap Panel    │ │  Route Viz   │ │  Benchmark Dashboard│    │
│  └────────────────┘ └──────────────┘ └────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      Core Routing Engine                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Graph Builder  →  PSB-Dijkstra  →  Route Validator      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    Partner Integrations                         │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────────┐     │
│  │  Pyth    │    │  Blockscout  │    │  Avail Network     │     │ 
│  │ (Prices) │    │  (On-chain)  │    │  (Bridge DA)       │     │ 
│  └──────────┘    └──────────────┘    └────────────────────┘     │ 
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    Blockchain Networks                          │
│   Ethereum  │  Polygon  │  Arbitrum  │  Optimism  │  Avalanche  │
└─────────────────────────────────────────────────────────────────┘
```

For detailed architecture documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm/yarn/pnpm
- **Git** for cloning the repository
- **(Optional)** Docker for containerized deployment

### Installation

```bash
# Clone the repository
git clone https://github.com/hrishihunde/eth-swap-router.git
cd eth-swap-router

# Install dependencies for the full project
make setup

# Or install individually
make setup-client    # For frontend only
make setup-poc       # For proof-of-concept only
```

### Running the Application

```bash
# Start the client (development mode)
make client

# Or using npm directly
cd client && npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

### Environment Configuration

Create a `.env.local` file in the `client/` directory:

```bash
# Required: RPC endpoints
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth.llamarpc.com
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Optional: Pyth Network (uses public endpoint by default)
NEXT_PUBLIC_PYTH_HERMES_ENDPOINT=https://hermes.pyth.network

# Optional: Router address for balance checks
NEXT_PUBLIC_ROUTER_ADDRESS=0x...

# Optional: Avail Network (for production bridging)
NEXT_PUBLIC_AVAIL_NETWORK=testnet
```

For detailed setup instructions, see [client/docs/SETUP.md](./client/docs/SETUP.md).

## 📚 Documentation

### Core Documentation

- **[Architecture Guide](./docs/ARCHITECTURE.md)**: Detailed system design, components, and data flow
- **[Algorithm Deep Dive](./docs/ALGORITHMS.md)**: Explanation of Classic and PSB-Dijkstra routing algorithms
- **[Integration Guide](./docs/INTEGRATION.md)**: How we integrate Avail, Pyth, and Blockscout
- **[Deployment Guide](./docs/DEPLOYMENT.md)**: Production deployment, Docker, and CI/CD

### Client-Specific

- **[Setup Instructions](./client/docs/SETUP.md)**: Frontend development setup and configuration

### Technical Handover

- **[Handover Document](./docs/HANDOVER.md)**: Comprehensive technical handover with implementation details

## 🎮 Usage Examples

### Basic Token Swap

```typescript
import { buildRouteGraph, findBestRoute } from '@/lib/core/router';

// Build the multi-chain token graph
const graph = await buildRouteGraph(vertices);

// Find optimal route from ETH on Ethereum to USDC on Polygon
const route = await findBestRoute(
  graph,
  'ETH.ethereum',
  'USDC.polygon',
  4 // max hops
);

console.log('Best path:', route.path.join(' → '));
console.log('Expected output:', route.estimatedOutput);
```

### PSB-Dijkstra Algorithm

```typescript
import { psbDijkstra } from '@/lib/core/algorithms/psb-dijkstra';

// Use advanced PSB algorithm with trade size
const { route, metrics } = psbDijkstra(
  graph,
  'ETH.ethereum',
  'USDC.polygon',
  1.0, // input amount: 1 ETH
  4    // max hops
);

console.log('Route:', route.path);
console.log('Execution time:', metrics.executionTimeMs, 'ms');
console.log('Nodes visited:', metrics.visitedNodes);
console.log('Gas estimate:', metrics.gasEstimate);
```

### Benchmark Generation

```typescript
import { generateBenchmark } from '@/lib/simulation/benchmarkGenerator';

// Generate performance benchmark
const results = await generateBenchmark({
  tokenCount: [10, 20, 50, 100],
  chainCount: 3,
  iterations: 10,
  algorithm: 'psb'
});

// Results include timing, memory, and routing metrics
```

## 🔬 Algorithms

We implement two shortest-path algorithms:

### 1. Classic Dijkstra
- **Complexity**: O(m + n log n) with priority queue
- **Use case**: Small to medium graphs (< 50 tokens)
- **Advantage**: Simple, predictable, well-tested

### 2. Post-Sorting-Barrier (PSB) Dijkstra
- **Complexity**: O(m log^(2/3) n) - breaks the sorting barrier
- **Use case**: Large graphs (> 100 tokens)
- **Advantage**: Faster on complex multi-chain scenarios
- **Reference**: [Duan et al. (2025)](https://arxiv.org/pdf/2504.17033)

**Key Innovation**: PSB-Dijkstra uses recursive frontier reduction to avoid sorting bottlenecks that plague traditional algorithms at scale.

See [docs/ALGORITHMS.md](./docs/ALGORITHMS.md) for detailed explanation.

## 🔌 Partner Integrations

### Avail Network
- **Purpose**: Cross-chain data availability
- **Usage**: Publishing and verifying bridge transaction data
- **Benefits**: Decentralized, trustless cross-chain communication

### Pyth Network
- **Purpose**: Real-time price oracles
- **Usage**: Fetching accurate token prices for route weights
- **Benefits**: Sub-second updates, high-fidelity data

### Blockscout
- **Purpose**: Multi-chain blockchain explorer
- **Usage**: On-chain data verification and balance checks
- **Benefits**: Open-source, supports multiple EVM chains

See [docs/INTEGRATION.md](./docs/INTEGRATION.md) for integration details.

## 📊 Performance

Benchmarking results on consumer hardware (M1 MacBook Pro):

| Token Count | Classic Dijkstra | PSB-Dijkstra | Improvement |
|-------------|------------------|--------------|-------------|
| 10 tokens   | 2.3 ms          | 3.1 ms       | -34%        |
| 50 tokens   | 45 ms           | 38 ms        | +15%        |
| 100 tokens  | 180 ms          | 98 ms        | +45%        |
| 500 tokens  | 4,200 ms        | 1,100 ms     | +74%        |

**Note**: PSB-Dijkstra shines with larger graphs. The "sorting barrier" becomes apparent at ~100+ tokens.

## 🛠️ Technology Stack

**Frontend**
- Next.js 15.5 (App Router)
- React 19
- TypeScript 5
- TailwindCSS 4
- Wagmi & Viem (Web3)

**Algorithms**
- Custom PSB-Dijkstra implementation
- AMM math libraries (Uniswap formulas)
- Graph theory utilities

**Integrations**
- @avail-project/nexus-core
- Pyth Network Hermes API
- Blockscout API

**Tooling**
- Docker (containerization)
- Make (build automation)
- ESLint & Prettier

## 📈 Project Structure

```
eth-swap-router/
├── client/                 # Next.js frontend application
│   ├── app/               # Next.js app router pages
│   │   ├── api/          # API routes (route finding, benchmarks)
│   │   └── page.tsx      # Main swap interface
│   ├── components/        # React components
│   │   ├── swap/         # Swap panel, token selectors
│   │   └── testnet/      # Benchmark dashboards
│   ├── lib/              # Core logic
│   │   ├── core/         # Router, algorithms, graph builder
│   │   ├── partners/     # Avail, Pyth, Blockscout integrations
│   │   └── simulation/   # Benchmark generators
│   └── docs/             # Client-specific setup docs
├── docs/                  # Main documentation
│   ├── ARCHITECTURE.md   # System architecture
│   ├── ALGORITHMS.md     # Algorithm explanations
│   ├── INTEGRATION.md    # Partner integration guide
│   ├── DEPLOYMENT.md     # Deployment instructions
│   └── HANDOVER.md       # Technical handover doc
├── poc/                   # Proof-of-concept implementations
└── Makefile              # Build and run commands
```

## 🧪 Testing & Benchmarking

### Running Benchmarks

The application includes a built-in benchmark dashboard:

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Click on "Benchmark Dashboard" tab
3. Configure parameters:
   - Token count (10-500)
   - Chain count (1-5)
   - Algorithm (classic vs PSB)
4. Click "Generate Benchmark"
5. View results and download JSON data

### Automated Benchmarks

```bash
# Generate benchmark via API
curl -X POST http://localhost:3000/api/benchmark/generate \
  -H "Content-Type: application/json" \
  -d '{
    "tokenCounts": [10, 50, 100],
    "chainCount": 3,
    "algorithm": "psb"
  }'
```

Benchmark results are saved to `client/results/` directory.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Code follows TypeScript best practices
- New algorithms include complexity analysis
- Documentation is updated for new features
- Benchmarks are run to verify performance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **Avail Project**: For providing decentralized data availability infrastructure
- **Pyth Network**: For high-fidelity, real-time price oracle services
- **Blockscout**: For open-source blockchain exploration tools
- **Duan et al.**: For the Post-Sorting-Barrier Dijkstra algorithm research
- **Uniswap**: For AMM formulas and liquidity concepts

## 📞 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/hrishihunde/eth-swap-router/issues)
- **Documentation**: [Read the docs](./docs/)
- **Developer**: [@hrishihunde](https://github.com/hrishihunde)

---

Built with ❤️ for ETHOnline 2025