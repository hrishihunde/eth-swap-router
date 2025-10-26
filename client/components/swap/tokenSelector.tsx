"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown } from 'lucide-react';

interface Token {
  key: string;        // e.g., "ETH.ethereum"
  symbol: string;     // e.g., "ETH"
  network: string;    // e.g., "ethereum"
  name?: string;
  balance?: number;
  priceUSD?: number;
}

interface TokenSelectorProps {
  tokens: Token[];
  selectedToken: string | null;
  selectedNetwork: string | null;
  onSelect: (tokenKey: string) => void;
  placeholder?: string;
}

// Map tokens to their primary networks based on real-world usage
const TOKEN_NETWORK_MAP: Record<string, string[]> = {
  'ETH': ['ethereum', 'arbitrum', 'optimism', 'polygon'],
  'WETH': ['ethereum', 'arbitrum', 'optimism', 'polygon'],
  'USDC': ['ethereum', 'arbitrum', 'optimism', 'polygon', 'avalanche'],
  'USDT': ['ethereum', 'arbitrum', 'optimism', 'polygon', 'avalanche'],
  'USDC.e': ['arbitrum', 'optimism', 'polygon', 'avalanche'],
  'WBTC': ['ethereum', 'arbitrum', 'optimism', 'polygon'],
  'DAI': ['ethereum', 'arbitrum', 'optimism', 'polygon'],
  'MATIC': ['polygon', 'ethereum'],
  'AVAX': ['avalanche', 'ethereum'],
  'ARB': ['arbitrum', 'ethereum'],
  'OP': ['optimism', 'ethereum'],
  'BNB': ['ethereum'],
  'UNI': ['ethereum', 'arbitrum', 'optimism', 'polygon'],
  'LINK': ['ethereum', 'arbitrum', 'optimism', 'polygon'],
  'AAVE': ['ethereum', 'arbitrum', 'optimism', 'polygon'],
  'CRV': ['ethereum', 'arbitrum', 'optimism', 'polygon'],
  'SNX': ['ethereum', 'optimism'],
  'SUSHI': ['ethereum', 'arbitrum', 'polygon'],
  'COMP': ['ethereum', 'arbitrum', 'polygon'],
  'MKR': ['ethereum'],
  'LDO': ['ethereum', 'arbitrum', 'optimism'],
  'RPL': ['ethereum', 'arbitrum'],
  'GRT': ['ethereum', 'arbitrum'],
  'BAL': ['ethereum', 'arbitrum', 'polygon'],
  'FXS': ['ethereum'],
  'FRAX': ['ethereum', 'arbitrum', 'optimism', 'polygon'],
  'STG': ['ethereum', 'arbitrum', 'optimism', 'polygon', 'avalanche'],
  'JOE': ['avalanche'],
  'GMX': ['arbitrum', 'avalanche'],
  'MAGIC': ['arbitrum'],
};

// Popular tokens for quick select
const POPULAR_TOKENS = ['ETH', 'USDC', 'USDT', 'WETH', 'WBTC', 'DAI'];

export default function TokenSelector({
  tokens,
  selectedToken,
  selectedNetwork,
  onSelect,
  placeholder = 'Select token'
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter tokens by network and search query
  const filteredTokens = useMemo(() => {
    return tokens
      .filter(token => !token.symbol.startsWith('SYN')) // Exclude synthetic tokens (SYN0, SYN1, etc.)
      .filter(token => {
        const matchesNetwork = !selectedNetwork || token.network === selectedNetwork;
        const matchesSearch = !searchTerm || 
          token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          token.network.toLowerCase().includes(searchTerm.toLowerCase()) ||
          token.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesNetwork && matchesSearch;
      });
  }, [tokens, selectedNetwork, searchTerm]);

  // Group tokens by network
  const groupedTokens = useMemo(() => {
    const groups: Record<string, Token[]> = {};
    filteredTokens.forEach(token => {
      if (!groups[token.network]) {
        groups[token.network] = [];
      }
      groups[token.network].push(token);
    });
    // Sort networks: ethereum first, then alphabetically
    const sortedGroups: Record<string, Token[]> = {};
    const sortedNetworks = Object.keys(groups).sort((a, b) => {
      if (a === 'ethereum') return -1;
      if (b === 'ethereum') return 1;
      return a.localeCompare(b);
    });
    sortedNetworks.forEach(network => {
      sortedGroups[network] = groups[network];
    });
    return sortedGroups;
  }, [filteredTokens]);

  const handleSelect = (tokenKey: string) => {
    onSelect(tokenKey);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Get display info for selected token
  const selectedTokenData = selectedToken ? tokens.find(t => t.key === selectedToken) : null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-12 text-base"
      >
        <div className="flex items-center space-x-2">
          {selectedTokenData ? (
            <>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm text-primary-foreground font-bold">
                {selectedTokenData.symbol.substring(0, 2)}
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold">{selectedTokenData.symbol}</span>
                <span className="text-xs text-muted-foreground">on {selectedTokenData.network}</span>
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <Card className="absolute top-full left-0 right-0 min-w-[300px] mt-2 z-50 max-h-96 overflow-hidden shadow-xl">
            <div className="p-3 border-b sticky top-0 bg-background z-10">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or paste address"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                  autoFocus
                />
              </div>

              {/* Popular Tokens */}
              {!searchTerm && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Popular</div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_TOKENS.map(symbol => {
                      const token = tokens.find(t => t.symbol === symbol && (!selectedNetwork || t.network === selectedNetwork));
                      if (!token) return null;
                      return (
                        <Badge
                          key={token.key}
                          variant="outline"
                          className="cursor-pointer hover:bg-muted text-xs"
                          onClick={() => handleSelect(token.key)}
                        >
                          {symbol}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Grouped Token List */}
            <div className="max-h-72 overflow-y-auto">
              {Object.entries(groupedTokens).map(([network, networkTokens]) => (
                <div key={network} className="border-b last:border-b-0">
                  <div className="text-sm font-semibold text-muted-foreground px-3 py-2 bg-muted/50 capitalize">
                    {network}
                  </div>
                  <div>
                    {networkTokens.map(token => (
                      <button
                        key={token.key}
                        onClick={() => handleSelect(token.key)}
                        className={`
                          w-full px-3 py-2.5 text-left hover:bg-muted transition-colors flex items-center justify-between
                          ${selectedToken === token.key ? 'bg-primary/10' : ''}
                        `}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-semibold">
                            {token.symbol.substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium">{token.symbol}</div>
                            {token.name && (
                              <div className="text-xs text-muted-foreground">{token.name}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          {token.balance !== undefined && (
                            <div className="font-mono">
                              {token.balance.toFixed(4)}
                            </div>
                          )}
                          {token.priceUSD !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              ${token.priceUSD.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* No Results */}
              {filteredTokens.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No tokens found
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
