'use client';

import { Badge } from '@/components/ui/badge';
import { NETWORKS } from '@/lib/core/networks';

interface NetworkSelectorProps {
  selectedNetwork: string | null;
  onNetworkChange: (network: string | null) => void;
  className?: string;
}

export function NetworkSelector({
  selectedNetwork,
  onNetworkChange,
  className = ''
}: NetworkSelectorProps) {
  const networks = Object.keys(NETWORKS);

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* All Networks Option */}
      <Badge
        variant={selectedNetwork === null ? 'default' : 'outline'}
        className="cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => onNetworkChange(null)}
      >
        <span className="mr-1">🌐</span>
        All networks
      </Badge>

      {/* Individual Networks */}
      {networks.map((network) => {
        const config = NETWORKS[network];
        return (
          <Badge
            key={network}
            variant={selectedNetwork === network ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => onNetworkChange(network)}
          >
            <span className="mr-1">{getNetworkIcon(network)}</span>
            {config.name}
          </Badge>
        );
      })}
    </div>
  );
}

function getNetworkIcon(network: string): string {
  const icons: Record<string, string> = {
    ethereum: '⟠',
    polygon: '🔷',
    arbitrum: '🔵',
    optimism: '🔴',
    avalanche: '🔺'
  };
  return icons[network] || '🔗';
}
