"use client";

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, ChevronDown } from 'lucide-react';
import { getAvailableTokens, getTokenInfo } from '../../lib/partners/pyth-feed';

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

// Get tokens from Pyth feeds - only show tokens that have price feeds
function getPythTokens(): Token[] {
  const availableTokens = getAvailableTokens();
  
  return availableTokens.map(symbol => {
    const tokenInfo = getTokenInfo(symbol);
    if (!tokenInfo) return null;
    
    // Map symbols to their common names and chains
    const tokenMap: Record<string, { name: string; chain: string; decimals: number }> = {
      'ETH': { name: 'Ethereum', chain: 'ethereum', decimals: 18 },
      'BTC': { name: 'Bitcoin', chain: 'ethereum', decimals: 8 },
      'USDC': { name: 'USD Coin', chain: 'ethereum', decimals: 6 },
      'USDT': { name: 'Tether USD', chain: 'ethereum', decimals: 6 },
      'MATIC': { name: 'Polygon', chain: 'polygon', decimals: 18 },
      'BNB': { name: 'Binance Coin', chain: 'bsc', decimals: 18 },
      'SOL': { name: 'Solana', chain: 'solana', decimals: 9 },
      'ARB': { name: 'Arbitrum', chain: 'arbitrum', decimals: 18 },
      'AVAX': { name: 'Avalanche', chain: 'avalanche', decimals: 18 },
      'AAVE': { name: 'Aave', chain: 'ethereum', decimals: 18 },
      'UNI': { name: 'Uniswap', chain: 'ethereum', decimals: 18 },
      'LINK': { name: 'Chainlink', chain: 'ethereum', decimals: 18 },
      'LTC': { name: 'Litecoin', chain: 'ethereum', decimals: 8 },
      'DOGE': { name: 'Dogecoin', chain: 'ethereum', decimals: 8 },
      'BCH': { name: 'Bitcoin Cash', chain: 'ethereum', decimals: 8 },
      'SHIB': { name: 'Shiba Inu', chain: 'ethereum', decimals: 18 },
      'OP': { name: 'Optimism', chain: 'optimism', decimals: 18 },
      'SAND': { name: 'The Sandbox', chain: 'ethereum', decimals: 18 },
      'MANA': { name: 'Decentraland', chain: 'ethereum', decimals: 18 },
      'CRV': { name: 'Curve DAO', chain: 'ethereum', decimals: 18 },
      'SNX': { name: 'Synthetix', chain: 'ethereum', decimals: 18 },
      'DYDX': { name: 'dYdX', chain: 'ethereum', decimals: 18 },
      'COMP': { name: 'Compound', chain: 'ethereum', decimals: 18 },
      'ENS': { name: 'Ethereum Name Service', chain: 'ethereum', decimals: 18 },
      'RPL': { name: 'Rocket Pool', chain: 'ethereum', decimals: 18 },
      'LDO': { name: 'Lido DAO', chain: 'ethereum', decimals: 18 },
      'GRT': { name: 'The Graph', chain: 'ethereum', decimals: 18 },
      'PEPE': { name: 'Pepe', chain: 'ethereum', decimals: 18 },
    };
    
    const tokenData = tokenMap[symbol] || { name: symbol, chain: 'ethereum', decimals: 18 };
    
    return {
      token: symbol,
      chain: tokenData.chain,
      symbol: symbol,
      name: tokenData.name,
      decimals: tokenData.decimals,
    };
  }).filter((token): token is Token => token !== null);
}

const TOKENS = getPythTokens();

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

