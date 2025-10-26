"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import TokenSelector from './TokenSelector';
import { getAvailableTokens, PYTH_FEED_IDS } from '@/lib/partners/pyth-feed';
import { fetchPythPriceFeed } from '@/lib/partners/pyth';

interface Token {
  token: string;
  chain: string;
  symbol: string;
  name: string;
  decimals: number;
}

interface SwapInputProps {
  value?: number;
  token: Token;
  onChangeAmount?: (amount: number | undefined) => void;
  onSelectToken?: (token: Token) => void;
  label: string;
  readOnly?: boolean;
  displayAmount?: number;
}

export default function SwapInput({
  value,
  token,
  onChangeAmount,
  onSelectToken,
  label,
  readOnly = false,
  displayAmount
}: SwapInputProps) {
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const availableTokens = getAvailableTokens();

  // Fetch live price when token changes
  useEffect(() => {
    async function fetchPrice() {
      if (!token.token) return;
      
      setPriceLoading(true);
      try {
        const feedId = PYTH_FEED_IDS[`${token.token}/USD`];
        if (feedId) {
          const priceData = await fetchPythPriceFeed(feedId, token.token);
          if (priceData) {
            setTokenPrice(priceData.price);
          }
        }
      } catch (error) {
        console.error('Failed to fetch price:', error);
      } finally {
        setPriceLoading(false);
      }
    }

    fetchPrice();
    
    // Refresh price every 10 seconds
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, [token.token]);

  // Update internal input value when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value.toString());
    } else if (!readOnly) {
      setInputValue('');
    }
  }, [value, readOnly]);

  // Update display value when displayAmount changes
  useEffect(() => {
    if (displayAmount !== undefined && readOnly) {
      setInputValue(displayAmount.toFixed(6));
    }
  }, [displayAmount, readOnly]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Allow empty input
    if (newValue === '') {
      setInputValue('');
      onChangeAmount?.(undefined);
      return;
    }
    
    // Validate number format (allow digits and one decimal point)
    const regex = /^\d*\.?\d*$/;
    if (!regex.test(newValue)) {
      return;
    }
    
    setInputValue(newValue);
    
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onChangeAmount?.(numValue);
    } else if (newValue === '.' || newValue.endsWith('.')) {
      // Allow trailing decimal point
      onChangeAmount?.(undefined);
    }
  };

  const displayValue = readOnly && displayAmount !== undefined 
    ? displayAmount.toFixed(6)
    : inputValue;

  const numericValue = displayAmount || value || 0;
  const usdValue = numericValue * (tokenPrice || 0);

  return (
    <Card className="p-3 sm:p-4 bg-card border-2 hover:border-primary/20 transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {tokenPrice && (
          <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
            ${tokenPrice.toFixed(2)}
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              inputMode="decimal"
              value={displayValue}
              onChange={handleAmountChange}
              placeholder="0.0"
              readOnly={readOnly}
              className="text-2xl sm:text-3xl font-bold border-0 bg-transparent focus-visible:ring-0 px-0 py-1 h-auto w-full placeholder:text-muted-foreground/30"
            />
          </div>
          <div className="w-auto min-w-[120px]">
            <TokenSelector
              tokens={availableTokens}
              value={token.token}
              onChange={(tokenSymbol) => {
                if (onSelectToken) {
                  const tokenData = {
                    token: tokenSymbol,
                    symbol: tokenSymbol,
                    chain: 'ethereum',
                    name: tokenSymbol,
                    decimals: 18,
                  };
                  onSelectToken(tokenData);
                }
              }}
              placeholder="Select"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
          {numericValue > 0 && tokenPrice ? (
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              ≈ ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          ) : priceLoading ? (
            <span className="text-[10px] sm:text-xs text-muted-foreground animate-pulse">
              Loading price...
            </span>
          ) : tokenPrice ? (
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              Enter amount
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              Price unavailable
            </span>
          )}
          
          <span className="text-[10px] text-muted-foreground">
            Balance: 0.00
          </span>
        </div>
      </div>
    </Card>
  );
}
