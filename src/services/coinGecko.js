import CoinGecko from 'coingecko-api';

let coinGeckoClient;

export const getCoinGeckoClient = async () => {
  if (!coinGeckoClient) {
    coinGeckoClient = new CoinGecko();
  }
  return coinGeckoClient;
};
