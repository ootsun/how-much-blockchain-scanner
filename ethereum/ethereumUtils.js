import {ethers} from 'ethers';

const ETHERSCAN_TOKEN_API = process.env.ETHERSCAN_TOKEN_API;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const POCKET_PORTAL_ID = process.env.POCKET_PORTAL_ID;

export const provider = new ethers.providers.getDefaultProvider(null, {
  etherscan: ETHERSCAN_TOKEN_API,
  infura: INFURA_PROJECT_ID,
  alchemy: '',
  pocket: POCKET_PORTAL_ID
});
