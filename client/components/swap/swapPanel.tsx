"use client";

import React, { useState } from 'react';
import SwapInput from './swapInput';
import SwapActions from './swapActions';
import { useRouter } from '@/hooks/useRouter';
import { useAccount, useConnect } from 'wagmi';
import { Button } from '../ui/button';
import { ArrowUpDown } from 'lucide-react';

export default function SwapPanel() {
  const [from, setFrom] = useState({ 
    token: 'ETH', 
    chain: 'ethereum', 
    symbol: 'ETH', 
    name: 'Ethereum', 
    decimals: 18 
  });
  const [to, setTo] = useState({ 
    token: 'USDC', 
    chain: 'ethereum', 
    symbol: 'USDC', 
    name: 'USD Coin', 
    decimals: 6 
  });
  const [amount, setAmount] = useState<number | undefined>(1);
  const { route, loading, computeRoute } = useRouter();

  const { address } = useAccount();
  const { connect, connectors } = useConnect();

  async function onFindRoute() {
    if (!amount) return;
    await computeRoute({ from, to, amount });
  }

  const handleSwapTokens = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  return (
    <div className="space-y-4">
      <div>
        <SwapInput 
          value={amount} 
          token={from} 
          onChangeAmount={setAmount} 
          onSelectToken={setFrom} 
          label="You pay" 
        />
      </div>
      
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="icon"
          onClick={handleSwapTokens}
          className="rounded-full"
        >
          <ArrowUpDown className="w-4 h-4" />
        </Button>
      </div>

      <div>
        <SwapInput 
          value={undefined} 
          token={to} 
          readOnly 
          onSelectToken={setTo} 
          label="You receive" 
          displayAmount={route?.totalExpectedOut} 
        />
      </div>

      <div className="space-y-3">
        <Button 
          onClick={onFindRoute} 
          disabled={loading || !amount}
          className="w-full"
          size="lg"
        >
          {loading ? 'Finding route...' : 'Find route'}
        </Button>
        
        {address ? (
          <SwapActions route={route} />
        ) : (
          <Button 
            onClick={() => connect({ connector: connectors[0] })} 
            variant="outline"
            className="w-full"
            size="lg"
          >
            Connect wallet
          </Button>
        )}
      </div>

      {route && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">
            1 {from.token} = {(route.totalExpectedOut / (amount ?? 1)).toFixed(6)} {to.token}
          </div>
          <div className="text-sm text-muted-foreground">
            Gas: ~${route.totalGasUSD.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
