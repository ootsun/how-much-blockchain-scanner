import CoinGecko from 'coingecko-api';

let coinGeckoClient;

export const getCoinGeckoClient = () => {
  if (!coinGeckoClient) {
    coinGeckoClient = new CoinGecko();
  }
  return coinGeckoClient;
};
