"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Network,
  ExternalLink,
  DollarSign,
  Activity
} from 'lucide-react';
import { TestnetTestResult } from "@/lib/testnet/testnet-setup";
import { TESTNET_CONFIGS } from '@/lib/testnet/testnet-config';

interface NetworkStatusProps {
  testResults: TestnetTestResult[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'passed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'passed':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};

const getTestProgress = (tests: TestnetTestResult['tests']) => {
  const total = Object.keys(tests).length;
  const passed = Object.values(tests).filter(Boolean).length;
  return (passed / total) * 100;
};

export default function NetworkStatus({ testResults }: NetworkStatusProps) {
  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="w-5 h-5" />
            <span>Network Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {testResults.filter(r => r.status === 'passed').length}
              </div>
              <div className="text-sm text-muted-foreground">Networks Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {testResults.filter(r => r.status === 'failed').length}
              </div>
              <div className="text-sm text-muted-foreground">Networks Offline</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {testResults.filter(r => r.status === 'skipped').length}
              </div>
              <div className="text-sm text-muted-foreground">Networks Skipped</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Network Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testResults.map((result) => (
          <Card key={result.chainId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{result.network}</CardTitle>
                {getStatusIcon(result.status)}
              </div>
              <Badge className={getStatusColor(result.status)}>
                {result.status.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Test Progress</span>
                    <span>{Math.round(getTestProgress(result.tests))}%</span>
                  </div>
                  <Progress value={getTestProgress(result.tests)} className="mt-1" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-2">
                      <Network className="w-4 h-4" />
                      <span>RPC Connection</span>
                    </span>
                    {result.tests.rpcConnection ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-2">
                      <ExternalLink className="w-4 h-4" />
                      <span>Block Explorer</span>
                    </span>
                    {result.tests.blockExplorer ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4" />
                      <span>Price Feeds</span>
                    </span>
                    {result.tests.priceFeeds ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-2">
                      <Activity className="w-4 h-4" />
                      <span>Transaction Monitoring</span>
                    </span>
                    {result.tests.transactionMonitoring ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4" />
                      <span>Token Balances</span>
                    </span>
                    {result.tests.tokenBalances ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-3 p-2 bg-red-50 rounded-md">
                    <div className="text-sm font-medium text-red-800">Errors:</div>
                    <ul className="text-xs text-red-600 mt-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Testnet Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Testnet Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(TESTNET_CONFIGS).map((config) => (
              <div key={config.chainId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{config.name}</h3>
                  <Badge variant="outline">{config.chainId}</Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>RPC: {config.rpcUrl}</div>
                  <div>Explorer: {config.blockExplorer}</div>
                  {config.faucetUrl && <div>Faucet: {config.faucetUrl}</div>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}