"use client";

import { RouteHop } from '@/types/route';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function RouteCard({ hop }: { hop: RouteHop }) {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm text-muted-foreground">
              {hop.from.token}@{hop.from.chain} → {hop.to.token}@{hop.to.chain}
            </span>
            <Badge variant={hop.type === 'swap' ? 'default' : 'secondary'}>
              {hop.type}
            </Badge>
          </div>
          <div className="text-lg font-medium">
            {hop.expectedOut.toFixed(6)} {hop.to.token}
          </div>
          {hop.meta && (
            <div className="text-xs text-muted-foreground mt-1">
              {hop.meta.dex && `DEX: ${hop.meta.dex}`}
              {hop.meta.bridge && `Bridge: ${hop.meta.bridge}`}
              {hop.meta.estimatedTime && ` (${hop.meta.estimatedTime})`}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {hop.feesUSD ? `$${hop.feesUSD.toFixed(2)}` : '-'}
          </div>
          <div className="text-xs text-muted-foreground">
            {Math.round(hop.confidence * 100)}% confidence
          </div>
          <div className="text-xs text-muted-foreground">
            Liquidity: {(hop.liquidityDepth * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </Card>
  );
}
  