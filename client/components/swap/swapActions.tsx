/* Swap Actions:
    - switch between swap tokens
    - execute swap button (link to contract + router)
*/

"use client";

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Route } from '../../types/route';
import { useAccount, useWriteContract } from 'wagmi';
import { ArrowUpDown, Loader2 } from 'lucide-react';

interface SwapActionsProps {
  route: Route | null;
}

export default function SwapActions({ route }: SwapActionsProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  const handleSwap = async () => {
    if (!route || !address) return; // improve logic for a different error message for no routes
    
    setIsExecuting(true);
    try {
      // TODO: Implement actual swap execution logic
      // this would involve calling the appropriate smart contracts
      // based on the route hops
      console.log('Executing swap for route:', route);
      
      // simulate swap execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // show success message
      alert('Swap executed successfully!');
    } catch (error) {
      console.error('Swap failed:', error);
      alert('Swap failed. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!route) {
    return (
      <Button disabled className="flex-1">
        <ArrowUpDown className="w-4 h-4 mr-2" />
        Select a route
      </Button>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <Button
        onClick={handleSwap}
        disabled={isExecuting}
        className="flex-1"
        size="lg"
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Executing...
          </>
        ) : (
          <>
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Execute Swap
          </>
        )}
      </Button>
      
      <div className="text-xs text-muted-foreground text-center">
        Gas: ~${route.totalGasUSD.toFixed(2)}
      </div>
    </div>
  );
}

