/*
  Pyth Integration Module
  Docs: https://docs.pyth.network/price-feeds/how-pyth-works/hermes
*/

import { PYTH_FEED_IDS } from "./pyth-feed";
export interface PythPrice {
  id: string;
  price: number;       // Normalized, corrected for exponent
  confidence: number;  // confidence interval
  expo: number;        // Exponent as given by Hermes/Pyth
  publishTime: number; 
  emaPrice: number;    // Exponential moving average, if needed
  symbol: string;     
}

const HERMES_BASE = process.env.NEXT_PUBLIC_PYTH_HERMES_ENDPOINT || "https://hermes.pyth.network";
const GET_PRICE_PATH = "/api/latest_price_feeds";

export async function fetchPythPriceFeed(feedId: string, symbol: string): Promise<PythPrice | null> {
  const url = `${HERMES_BASE}${GET_PRICE_PATH}?ids[]=${feedId}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`Pyth fetch failed for ${feedId}: ${resp.status}`);
      return null; // Return null instead of throwing to allow graceful fallback
    } else {
      console.log(`Fetched Pyth Price for ${symbol} successfully!!`);
    }
    const json = await resp.json();

    const data = json?.[0]; // Response is an array, not wrapped in 'parsed'
    if (!data) return null; // Unrecognized feed
    
    // Parse price and confidence as numbers (they come as strings)
    const priceValue = parseFloat(data.price.price);
    const confValue = parseFloat(data.price.conf);
    const expo = data.price.expo;
    
    // Calculation: normalizedPrice = price * 10^expo (expo is NEGATIVE for decimals)
    const normalizedPrice = priceValue * Math.pow(10, expo);
    const normalizedConf = confValue * Math.pow(10, expo);
    
    // Parse EMA price
    const emaPriceValue = parseFloat(data.ema_price.price);
    const emaPrice = emaPriceValue * Math.pow(10, data.ema_price.expo);
    
    return {
      id: feedId,
      price: normalizedPrice,
      confidence: normalizedConf,
      expo: expo,
      publishTime: data.price.publish_time,
      emaPrice: emaPrice,
      symbol: symbol, 
    };
  } catch (err) {
    console.error("Pyth integration error:", err);
    return null;
  }
}

export async function fetchSymbolPrice(symbol: string): Promise<PythPrice | null> {
  const id = PYTH_FEED_IDS[symbol];
  if (!id) {
    console.warn("Unknown Pyth symbol/feedId mapping: " + symbol);
    return null;
  }
  return fetchPythPriceFeed(id, symbol);
}

// for router.ts: get route price ratio (used as edge weight normalization)
export async function getPriceRatio(baseSymbol: string, quoteSymbol: string): Promise<number | null> {
  const [base, quote] = await Promise.all([
    fetchSymbolPrice(baseSymbol),
    fetchSymbolPrice(quoteSymbol),
  ]);
  if (!base || !quote || !base.price || !quote.price) return null;
  return base.price / quote.price;
}
