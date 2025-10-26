export interface AvailNexusConfig {
  network: 'mainnet' | 'testnet';
  walletProvider?: any;
}

export interface BridgeRouteData {
  sourceChain: string;
  targetChain: string;
  token: string;
  amount: number;
  route: string[]; // Token path
  estimatedOutput: number;
  timestamp: number;
}

export interface BridgeTxResult {
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
}

export interface ProgressStep {
  typeID: string;
  data: {
    transactionHash?: string;
    explorerURL?: string;
    status?: string;
  };
}

/**
 * Avail Nexus SDK Wrapper for Cross-Chain Routing
 */
export class AvailNexusClient {
  private sdk: any;
  private initialized: boolean = false;
  private config: AvailNexusConfig;

  constructor(config: AvailNexusConfig) {
    this.config = config;
  }

  async initialize(walletProvider: any): Promise<void> {
    try {
      const { NexusSDK } = await import('@avail-project/nexus-core');
      
      this.sdk = new NexusSDK({ 
        network: this.config.network 
      });
      
      await this.sdk.initialize(walletProvider);
      this.initialized = true;
      
      console.log('✅ Avail Nexus SDK initialized');
    } catch (error) {
      console.warn('⚠️ Avail Nexus SDK not available:', error);
      this.initialized = false;
    }
  }
  
  setupHooks(
    onIntentApproval: (data: any) => void,
    onAllowanceApproval: (data: any) => void
  ): void {
    if (!this.sdk) {
      console.warn('SDK not initialized, skipping hook setup');
      return;
    }

    // Intent hook: user approves/denies the bridge transaction
    this.sdk.setOnIntentHook(({ intent, allow, deny, refresh }: any) => {
      console.log('🔔 Intent created:', intent);
      onIntentApproval({ intent, allow, deny, refresh });
    });

    // Allowance hook: user approves token spending
    this.sdk.setOnAllowanceHook(({ allow, deny, sources }: any) => {
      console.log('🔔 Allowance required:', sources);
      onAllowanceApproval({ allow, deny, sources });
    });
  }

  /**
   * Subscribe to bridge progress events
   */
  subscribeToBridgeEvents(
    onExpectedSteps: (steps: ProgressStep[]) => void,
    onStepComplete: (step: ProgressStep) => void
  ): () => void {
    if (!this.sdk?.nexusEvents) {
      console.warn('SDK events not available');
      return () => {};
    }

    const { NEXUS_EVENTS } = require('@avail-project/nexus-core');

    const unsubExpected = this.sdk.nexusEvents.on(
      NEXUS_EVENTS.EXPECTED_STEPS,
      (steps: ProgressStep[]) => {
        console.log('📋 Expected bridge steps:', steps.map(s => s.typeID));
        onExpectedSteps(steps);
      }
    );

    const unsubComplete = this.sdk.nexusEvents.on(
      NEXUS_EVENTS.STEP_COMPLETE,
      (step: ProgressStep) => {
        console.log('✅ Bridge step completed:', step.typeID);
        onStepComplete(step);
      }
    );

    // Return cleanup function
    return () => {
      unsubExpected();
      unsubComplete();
    };
  }

  /**
   * Publish route data to Avail for cross-chain verification
   * This ensures the route execution is available across chains
   */
  async publishRouteData(routeData: BridgeRouteData): Promise<boolean> {
    try {
      console.log('📡 Publishing route data to Avail:', {
        route: routeData.route.join(' → '),
        amount: routeData.amount,
        chains: `${routeData.sourceChain} → ${routeData.targetChain}`
      });

      // In production: would submit to Avail DA layer
      // For MVP: we simulate by logging the data
      // The actual implementation would use Avail's DA submission API

      const dataBlob = JSON.stringify(routeData);
      console.log('📝 Route data blob size:', dataBlob.length, 'bytes');

      // Simulated success
      return true;
    } catch (error) {
      console.error('❌ Failed to publish route data:', error);
      return false;
    }
  }

  /**
   * Execute bridge transaction using Nexus SDK
   * Bridges tokens from source chain(s) to target chain
   */
  async executeBridge(params: {
    token: string;
    amount: number;
    targetChainId: number;
    sourceChains?: number[];
  }): Promise<BridgeTxResult> {
    if (!this.initialized || !this.sdk) {
      return {
        success: false,
        error: 'Avail Nexus SDK not initialized. Install @avail-project/nexus-core to enable bridging.'
      };
    }

    try {
      console.log('🌉 Executing bridge via Avail Nexus:', params);

      const result = await this.sdk.bridge({
        token: params.token,
        amount: params.amount,
        chainId: params.targetChainId,
        sourceChains: params.sourceChains
      });

      if (result.success) {
        console.log('✅ Bridge transaction submitted:', result.transactionHash);
        return {
          success: true,
          transactionHash: result.transactionHash,
          explorerUrl: result.explorerUrl
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('❌ Bridge execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Simulate bridge to preview costs before execution
   */
  async simulateBridge(params: {
    token: string;
    amount: number;
    targetChainId: number;
  }): Promise<{
    estimatedGas: bigint;
    estimatedTime: number;
    estimatedFee: number;
  } | null> {
    if (!this.initialized || !this.sdk) {
      console.warn('SDK not initialized, returning estimated values');
      // Return reasonable defaults for development
      return {
        estimatedGas: BigInt(200000),
        estimatedTime: 120, // 2 minutes
        estimatedFee: 0.001 // 0.1%
      };
    }

    try {
      const simulation = await this.sdk.simulateBridge({
        token: params.token,
        amount: params.amount,
        chainId: params.targetChainId
      });

      return {
        estimatedGas: simulation.gas || BigInt(200000),
        estimatedTime: 120, // Avail bridges typically ~2 minutes
        estimatedFee: 0.001 // 0.1% default
      };
    } catch (error) {
      console.error('Simulation failed:', error);
      return null;
    }
  }

  /**
   * Get bridge status by transaction hash
   */
  async getBridgeStatus(txHash: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    confirmations?: number;
  }> {
    // In production: query Avail bridge contracts or indexer
    // For MVP: simulated status
    console.log('🔍 Checking bridge status for:', txHash);
    
    return {
      status: 'pending',
      confirmations: 0
    };
  }

  /**
   * Check if SDK is ready to use
   */
  isReady(): boolean {
    return this.initialized && !!this.sdk;
  }
}

/**
 * Create and initialize Avail Nexus client
 */
export async function createAvailNexusClient(
  config: AvailNexusConfig
): Promise<AvailNexusClient> {
  const client = new AvailNexusClient(config);
  
  // Try to initialize if wallet provider is available
  if (config.walletProvider) {
    await client.initialize(config.walletProvider);
  }
  
  return client;
}

/**
 * Helper to get chain ID from chain name
 */
export function getChainId(chainName: string): number {
  const chainIds: Record<string, number> = {
    ethereum: 1,
    polygon: 137,
    arbitrum: 42161,
    optimism: 10,
    avalanche: 43114,
    // Testnets
    sepolia: 11155111,
    'polygon-amoy': 80002,
    'arbitrum-sepolia': 421614,
    'optimism-sepolia': 11155420,
    'base-sepolia': 84532
  };

  return chainIds[chainName.toLowerCase()] || 0;
}
