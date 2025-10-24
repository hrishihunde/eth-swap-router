"use client";

import React from 'react';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import TokenSelector from './TokenSelector';

interface Token {
  token: string;
  chain: string;
  symbol: string;
  name: string;
  decimals: number; // unsure if this is needed
}

interface SwapInputProps {
  value?: number;
  token: Token;
  onChangeAmount?: (amount: number) => void;
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
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue) && onChangeAmount) {
      onChangeAmount(newValue);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">Balance: 0.00</span> // edit to show actual balance
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            value={displayAmount !== undefined ? displayAmount.toFixed(6) : value || ''}
            onChange={handleAmountChange}
            placeholder="0.0"
            readOnly={readOnly}
            className="text-2xl font-medium border-0 bg-transparent focus-visible:ring-0 p-0 h-auto"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <TokenSelector
              selectedToken={token}
              onTokenSelect={onSelectToken || (() => {})}
              label="Select token"
            />
          </div>
        </div>
        
        {value && (
          <div className="text-sm text-muted-foreground">
            ≈ ${(value * 2000).toFixed(2)} USD
          </div>
        )}
      </div>
    </Card>
  );
}
