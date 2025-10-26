"use client";

import React, { useState, useEffect } from 'react';
import SwapInput from './SwapInput';
import SwapActions from './SwapActions';
import { useRouter } from '@/hooks/useRouter';
import { useAccount, useConnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowUpDown, TrendingUp, Zap, AlertTriangle } from 'lucide-react';

export default function SwapPanel() {
  interface Token {
    token: string;
    chain: string;
    symbol: string;
    name: string;
    decimals: number;
  }

  const [from, setFrom] = useState<Token>({ 
    token: 'ETH', 
    chain: 'ethereum', 
    symbol: 'ETH', 
    name: 'Ethereum', 
    decimals: 18 
  });
  const [to, setTo] = useState<Token>({ 
    token: 'USDC', 
    chain: 'ethereum', 
    symbol: 'USDC', 
    name: 'USD Coin', 
    decimals: 6 
  });
  const [amount, setAmount] = useState<number | undefined>(1);
  const [outputAmount, setOutputAmount] = useState<number | undefined>(undefined);
  const { route, loading, error, computeRoute, benchmarkLoaded } = useRouter();

  const { address } = useAccount();
  const { connect, connectors } = useConnect();

  // Auto-calculate output amount when input changes
  useEffect(() => {
    if (amount && amount > 0 && from.token && to.token && benchmarkLoaded) {
      const timeoutId = setTimeout(() => {
        computeRoute({ from, to, amount });
      }, 800); // Debounce for 800ms
      
      return () => clearTimeout(timeoutId);
    } else {
      // Clear output if no amount
      setOutputAmount(undefined);
    }
  }, [amount, from.token, to.token, benchmarkLoaded]);

  // Update output amount when route changes
  useEffect(() => {
    if (route?.psb.route.estimatedOutput) {
      setOutputAmount(route.psb.route.estimatedOutput);
    } else {
      setOutputAmount(undefined);
    }
  }, [route]);

  async function onFindRoute() {
    if (!amount) return;
    await computeRoute({ from, to, amount });
  }

  const handleSwapTokens = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
    
    // Swap amounts too
    if (outputAmount) {
      setAmount(outputAmount);
      setOutputAmount(amount);
    }
  };

  const priceImpact = route && amount 
    ? ((route.psb.route.estimatedOutput - route.classic.route.estimatedOutput) / route.classic.route.estimatedOutput * 100)
    : 0;

  return (
    <Card className="p-4 sm:p-5 bg-gradient-to-br from-card to-muted/20 shadow-lg">
      <div className="space-y-2.5">
        {/* Status Banner */}
        {!benchmarkLoaded && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Benchmark not loaded. Generate one in the Testnet tab.</span>
          </div>
        )}

        {/* From Token Input */}
        <SwapInput 
          value={amount} 
          token={from} 
          onChangeAmount={setAmount} 
          onSelectToken={setFrom} 
          label="You pay" 
        />
        
        {/* Swap Button */}
        <div className="flex justify-center -my-1 z-10 relative">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapTokens}
            className="rounded-full h-9 w-9 bg-background shadow-md hover:shadow-lg transition-all hover:rotate-180 duration-300 border-2"
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>

        {/* To Token Input */}
        <SwapInput 
          value={undefined} 
          token={to} 
          readOnly 
          onSelectToken={setTo} 
          label="You receive (estimated)" 
          displayAmount={outputAmount} 
        />

        {/* Route Information */}
        {route && amount && outputAmount && (
          <Card className="p-3 bg-muted/50 space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Rate</span>
              </span>
              <span className="font-medium">
                1 {from.token} = {(outputAmount / amount).toFixed(6)} {to.token}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Gas</span>
              </span>
              <span className="font-medium">
                ${route.psb.metrics.gasEstimate.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Hops</span>
              <span className="font-medium">
                {route.psb.route.path.length - 1}
              </span>
            </div>

            {/* Algorithm Comparison */}
            <div className="pt-2 border-t border-border">
              <div className="text-[10px] text-muted-foreground mb-1.5">Algorithm Comparison</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-background rounded">
                  <div className="text-muted-foreground text-[10px]">Classic</div>
                  <div className="font-medium text-xs truncate">{route.classic.route.estimatedOutput.toFixed(4)}</div>
                </div>
                <div className="p-2 bg-primary/10 rounded border border-primary/20">
                  <div className="text-muted-foreground text-[10px]">PSB (Best)</div>
                  <div className="font-medium text-primary text-xs truncate">{route.psb.route.estimatedOutput.toFixed(4)}</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 animate-in fade-in duration-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-red-900 dark:text-red-200">Error</div>
                <div className="text-xs text-red-700 dark:text-red-300 break-words">{error}</div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <Button 
            onClick={onFindRoute} 
            disabled={loading || !amount || !benchmarkLoaded}
            className="w-full h-10 text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            size="lg"
          >
            {loading ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Finding route...
              </>
            ) : (
              'Find Best Route'
            )}
          </Button>
          
          {address ? (
            <SwapActions route={route} />
          ) : (
            <Button 
              onClick={() => connect({ connector: connectors[0] })} 
              variant="outline"
              className="w-full h-9 text-sm"
              size="lg"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
