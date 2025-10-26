// map (symbol => feedId) for your app
// these might require verification? or I need a better way to pull them from hermes.
export const PYTH_FEED_IDS: Record<string, string> = {
  "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BTC/USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "USDC/USD": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT/USD": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  "BNB/USD": "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  "SOL/USD": "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "ARB/USD": "0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
  "AVAX/USD": "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  "AAVE/USD": "0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445",
  "UNI/USD": "0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501",
  "LINK/USD": "0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
  "LTC/USD": "0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
  "DOGE/USD": "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  "BCH/USD": "0x3dd2b63686a450ec7290df3a1e0b583c0481f651351edfa7636f39aed55cf8a3",
  "SHIB/USD": "0xf0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a",
  "OP/USD": "0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
  "SAND/USD": "0xcb7a1d45139117f8d3da0a4b67264579aa905e3b124efede272634f094e1e9d1",
  "MANA/USD": "0x1dfffdcbc958d732750f53ff7f06d24bb01364b3f62abea511a390c74b8d16a5",
  "CRV/USD": "0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8",
  "SNX/USD": "0x39d020f60982ed892abbcd4a06a276a9f9b7bfbce003204c110b6e488f502da3",
  "DYDX/USD": "0x6489800bb8974169adfe35937bf6736507097d13c190d760c557108c7e93a81b",
  "COMP/USD": "0x4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478",
  "ENS/USD": "0xb98ab6023650bd2edc026b983fb7c2f8fa1020286f1ba6ecf3f4322cd83b72a6",
  "RPL/USD": "0x24f94ac0fd8638e3fc41aab2e4df933e63f763351b640bf336a6ec70651c4503",
  "LDO/USD": "0xc63e2a7f37a04e5e614c07238bedb25dcc38927fba8fe890597a593c0b2fa4ad",
  "GRT/USD": "0x4d1f8dae0d96236fb98e8f47471a366ec3b1732b47041781934ca3a9bb2f35e7",
  "PEPE/USD": "0xd69731a2e74ac1ce884fc3890f7ee324b6deb66147055249568869ed700882e4"
};

// Get available tokens from Pyth feeds
export function getAvailableTokens(): string[] {
  return Object.keys(PYTH_FEED_IDS).map(symbol => {
    // Handle special cases
    if (symbol === 'MATICX/MATIC.RR') return 'MATIC';
    if (symbol === 'BTC/USD') return 'BTC';
    return symbol.replace('/USD', '');
  });
}

// Get token info for UI
export function getTokenInfo(symbol: string): { symbol: string; name: string; feedId: string } | null {
  // Handle special cases
  let feedKey: string;
  if (symbol === 'MATIC') {
    feedKey = 'MATICX/MATIC.RR';
  } else if (symbol === 'BTC') {
    feedKey = 'BTC/USD';
  } else {
    feedKey = `${symbol}/USD`;
  }
  
  const feedId = PYTH_FEED_IDS[feedKey];
  if (!feedId) return null;
  
  return {
    symbol,
    name: symbol, // You can expand this with full names
    feedId
  };
}
