"use client";

import React from 'react';
import { Route } from '@/types/route';

interface RouteGraphProps {
  route?: Route | null;
}

export function RouteGraph({ route }: RouteGraphProps) {
  if (!route) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">No route to visualize</p>
      </div>
    );
  }

  return (
    <div className="h-64 bg-muted rounded-lg p-4">
      <div className="space-y-3">
        <div className="text-sm font-medium">Route Flow</div>
        <div className="space-y-2">
          {route.hops.map((hop, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm">
                  {hop.from.token} → {hop.to.token}
                </div>
                <div className="text-xs text-muted-foreground">
                  {hop.type === 'swap' ? 'DEX Swap' : 'Bridge'} • {hop.expectedOut.toFixed(4)} {hop.to.token}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(hop.confidence * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
