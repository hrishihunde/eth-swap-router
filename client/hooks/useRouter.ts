"use client";

import { useState } from 'react';
import axios from 'axios';
import { Route } from '@/lib/types/route';

export function useRouter() {
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string| null>(null);

  async function computeRoute(payload: { from: any; to: any; amount: number; constraints?: any }) {
    setLoading(true); setError(null);
    try {
      const res = await axios.post('/api/route', payload);
      setRoute(res.data as Route);
      return res.data;
    } catch (e: any) {
      setError(e?.message || 'failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { route, loading, error, computeRoute, setRoute };
}
