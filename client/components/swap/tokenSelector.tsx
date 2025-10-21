"use client";

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, ChevronDown } from 'lucide-react';

interface Token {
  token: string;
  chain: string;
  symbol: string;
  name: string;
  address?: string;
  decimals: number;
  logoUrl?: string;
}

interface TokenSelectorProps {
  selectedToken: Token;
  onTokenSelect: (token: Token) => void;
  label: string;
}

// Mock token data - in a real app, this would come from an API
const TOKENS: Token[] = [
  { token: 'ETH', chain: 'ethereum', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  { token: 'USDC', chain: 'ethereum', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { token: 'USDT', chain: 'ethereum', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  { token: 'WETH', chain: 'ethereum', symbol: 'WETH', name: 'Wrapped Ethereum', decimals: 18 },
  { token: 'DAI', chain: 'ethereum', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  { token: 'WBTC', chain: 'ethereum', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  { token: 'MATIC', chain: 'polygon', symbol: 'MATIC', name: 'Polygon', decimals: 18 },
  { token: 'AVAX', chain: 'avalanche', symbol: 'AVAX', name: 'Avalanche', decimals: 18 },
];

export default function TokenSelector({ selectedToken, onTokenSelect, label }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTokens = TOKENS.filter(token =>
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground">
            {selectedToken.symbol.charAt(0)}
          </div>
          <span>{selectedToken.symbol}</span>
          <Badge variant="secondary" className="text-xs">
            {selectedToken.chain}
          </Badge>
        </div>
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tokens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filteredTokens.map((token) => (
              <button
                key={`${token.token}-${token.chain}`}
                onClick={() => handleTokenSelect(token)}
                className="w-full p-3 text-left hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground">
                      {token.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-sm text-muted-foreground">{token.name}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {token.chain}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

