'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NetworkSelector } from './NetworkSelector';
import TokenSelector from './TokenSelector';
import { RouteComparison } from './RouteComparison';
import { ArrowUpDown, Loader2, AlertTriangle } from 'lucide-react';
import { getAllTokens } from '@/lib/core/token-config';
import { fetchSymbolPrice } from '@/lib/partners/pyth';

interface Token {
  key: string;
  symbol: string;
  network: string;
  name?: string;
  balance?: number;
  priceUSD?: number;
}

export function EnhancedSwapPanel() {
  // State
  const [sourceNetwork, setSourceNetwork] = useState<string | null>(null);
  const [targetNetwork, setTargetNetwork] = useState<string | null>(null);
  const [sourceToken, setSourceToken] = useState<string | null>(null);
  const [targetToken, setTargetToken] = useState<string | null>(null);
  const [inputAmount, setInputAmount] = useState<string>('1');
  const [estimatedOutput, setEstimatedOutput] = useState<number | null>(null);
  const [estimationRate, setEstimationRate] = useState<number | null>(null);
  const [priceImpact, setPriceImpact] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isFindingRoute, setIsFindingRoute] = useState(false);
  const [routeComparison, setRouteComparison] = useState<any>(null);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});

  // Load real tokens (not benchmark)
  useEffect(() => {
    loadRealTokens();
  }, []);

  async function loadRealTokens() {
    try {
      const tokens = getAllTokens();
      const tokensWithPrice = tokens.map(t => ({
        key: t.key,
        symbol: t.symbol,
        network: t.network,
        name: t.name,
        priceUSD: 0, // Will be loaded separately
      }));
      setAvailableTokens(tokensWithPrice);
      
      // Load prices from Pyth
      loadTokenPrices(tokens);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  async function loadTokenPrices(tokens: any[]) {
    const prices: Record<string, number> = {};
    const uniqueSymbols = new Set(tokens.filter(t => t.pythFeedId).map(t => t.pythFeedId));
    
    for (const feedId of uniqueSymbols) {
      try {
        const price = await fetchSymbolPrice(feedId!);
        if (price) {
          prices[feedId!] = price.price;
        }
      } catch (err) {
        console.warn(`Failed to load price for ${feedId}:`, err);
      }
    }
    
    setTokenPrices(prices);
  }

  // Get USD value for a token amount
  function getUSDValue(tokenKey: string | null, amount: string | number): string {
    if (!tokenKey || !amount) return '$0.00';
    
    const token = availableTokens.find(t => t.key === tokenKey);
    if (!token) return '$0.00';
    
    // Find token config to get pythFeedId
    const allTokens = getAllTokens();
    const tokenConfig = allTokens.find(t => t.key === tokenKey);
    if (!tokenConfig || !tokenConfig.pythFeedId) return '$0.00';
    
    const price = tokenPrices[tokenConfig.pythFeedId];
    if (!price) return '$0.00';
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '$0.00';
    
    const usdValue = numAmount * price;
    return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Real-time price estimation (debounced)
  useEffect(() => {
    if (!sourceToken || !targetToken || !inputAmount || parseFloat(inputAmount) <= 0) {
      setEstimatedOutput(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsEstimating(true);
      try {
        const response = await fetch('/api/route/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: sourceToken,
            target: targetToken,
            amount: parseFloat(inputAmount)
          })
        });

        const data = await response.json();
        setEstimatedOutput(data.estimatedOutput);
        setEstimationRate(data.rate);
        setPriceImpact(data.priceImpact);
      } catch (error) {
        console.error('Estimation failed:', error);
        setEstimatedOutput(null);
      } finally {
        setIsEstimating(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [sourceToken, targetToken, inputAmount]);

  // Find Route (run both algorithms)
  async function handleFindRoute() {
    if (!sourceToken || !targetToken || !inputAmount) return;

    setIsFindingRoute(true);
    setRouteComparison(null);

    try {
      const response = await fetch('/api/route/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: sourceToken,
          target: targetToken,
          amount: parseFloat(inputAmount),
          hops: 4,
          ethPriceUSD: 2000
        })
      });

      const data = await response.json();
      if (data.success) {
        setRouteComparison(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Route finding failed:', error);
      alert('Failed to find route. Please try again.');
    } finally {
      setIsFindingRoute(false);
    }
  }

  // Reverse tokens
  function handleReverseTokens() {
    const tempToken = sourceToken;
    const tempNetwork = sourceNetwork;
    setSourceToken(targetToken);
    setSourceNetwork(targetNetwork);
    setTargetToken(tempToken);
    setTargetNetwork(tempNetwork);
  }

  // Get token display info
  function getTokenDisplay(tokenKey: string | null): { symbol: string; network: string } | null {
    if (!tokenKey) return null;
    const [symbol, network] = tokenKey.split('.');
    return { symbol, network };
  }

  const sourceDisplay = getTokenDisplay(sourceToken);
  const targetDisplay = getTokenDisplay(targetToken);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Swap</h2>
        </div>

        {/* Network Selector */}
        <div className="mb-4">
          <NetworkSelector
            selectedNetwork={sourceNetwork}
            onNetworkChange={setSourceNetwork}
          />
        </div>

        {/* You Pay Section */}
        <div className="mb-4">
          <label className="text-sm text-muted-foreground mb-2 block">You pay</label>
          <Card className="p-4 bg-muted/30">
            <div className="flex justify-between items-start mb-2">
              <TokenSelector
                tokens={availableTokens}
                selectedToken={sourceToken}
                selectedNetwork={sourceNetwork}
                onSelect={(key) => {
                  setSourceToken(key);
                  const [, network] = key.split('.');
                  setSourceNetwork(network);
                }}
                placeholder="Select token"
              />
              <div className="flex flex-col items-end w-1/2">
                <Input
                  type="number"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  placeholder="0.0"
                  className="text-right text-2xl font-mono border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  min="0"
                  step="any"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {getUSDValue(sourceToken, inputAmount)}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Reverse Button */}
        <div className="flex justify-center my-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReverseTokens}
            className="rounded-full h-10 w-10 hover:rotate-180 transition-transform duration-300"
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>

        {/* You Receive Section */}
        <div className="mb-4">
          <label className="text-sm text-muted-foreground mb-2 block">You receive</label>
          <Card className="p-4 bg-muted/30">
            <div className="flex justify-between items-start mb-2">
              <TokenSelector
                tokens={availableTokens}
                selectedToken={targetToken}
                selectedNetwork={targetNetwork}
                onSelect={(key) => {
                  setTargetToken(key);
                  const [, network] = key.split('.');
                  setTargetNetwork(network);
                }}
                placeholder="Select token"
              />
              <div className="text-right w-1/2">
                {isEstimating ? (
                  <div className="flex flex-col items-end">
                    <div className="text-2xl font-mono text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      ...
                    </div>
                  </div>
                ) : estimatedOutput !== null ? (
                  <div className="flex flex-col items-end">
                    <div className="text-2xl font-mono font-semibold">
                      {estimatedOutput.toFixed(6)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getUSDValue(targetToken, estimatedOutput)}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <div className="text-2xl font-mono text-muted-foreground">0.0</div>
                    <div className="text-xs text-muted-foreground mt-1">$0.00</div>
                  </div>
                )}
              </div>
            </div>
            {priceImpact !== null && priceImpact > 0 && estimatedOutput !== null && (
              <div className="text-xs text-right text-muted-foreground mt-2">
                <span className={priceImpact > 5 ? 'text-red-500 font-semibold' : priceImpact > 1 ? 'text-yellow-600' : ''}>
                  ({priceImpact > 0 ? '-' : ''}{priceImpact.toFixed(2)}% impact)
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Exchange Rate Display */}
        {estimationRate !== null && sourceDisplay && targetDisplay && (
          <div className="flex justify-between items-center text-sm bg-muted/50 p-3 rounded-lg mb-4">
            <span className="text-muted-foreground">
              1 {sourceDisplay.symbol} = {estimationRate.toFixed(6)} {targetDisplay.symbol}
            </span>
            {priceImpact !== null && (
              <Badge variant={priceImpact > 5 ? 'destructive' : priceImpact > 1 ? 'secondary' : 'default'}>
                {priceImpact.toFixed(2)}% impact
              </Badge>
            )}
          </div>
        )}

        {/* Find Route Button */}
        <Button
          onClick={handleFindRoute}
          disabled={!sourceToken || !targetToken || !inputAmount || isFindingRoute}
          className="w-full"
          size="lg"
        >
          {isFindingRoute ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Finding best route...
            </span>
          ) : (
            'Find Route'
          )}
        </Button>

        {/* High Slippage Warning */}
        {priceImpact !== null && priceImpact > 5 && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300">
                <div className="font-medium">High price impact warning</div>
                <div className="text-xs mt-1">
                  This trade has a {priceImpact.toFixed(2)}% price impact. Consider reducing your trade size.
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Route Comparison Results */}
      {routeComparison && (
        <RouteComparison data={routeComparison} />
      )}
    </div>
  );
}
