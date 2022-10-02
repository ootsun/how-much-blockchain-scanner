import { getProvider } from './ethereumUtils.js';
import { ethers } from 'ethers';
import axios from 'axios';

const provider = getProvider();

const ETHERSCAN_TOKEN_API = process.env.ETHERSCAN_TOKEN_API;

export function contractIsAProxy(methods, iface) {
  if (!methods) {
    methods = Object.values(iface.functions).map((f) => f.name);
  }
  return methods.includes('implementation');
}

export async function getImplementationAddress(contractAddress) {
  //See https://ethereum.stackexchange.com/questions/99812/finding-the-address-of-the-proxied-to-address-of-a-proxy
  const eip1967ImplementationStorageSlot =
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const openzeppelinImplementationStorageSlot =
    '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3';
  let rawAddress = await provider.getStorageAt(
    contractAddress,
    eip1967ImplementationStorageSlot,
  );
  let address = ethers.utils.hexStripZeros(rawAddress);
  if (address === '0x') {
    rawAddress = await provider.getStorageAt(
      contractAddress,
      openzeppelinImplementationStorageSlot,
    );
    address = ethers.utils.hexStripZeros(rawAddress);
  }
  return address;
}

export const getInterfaceOfContract = async (contractAddress) => {
  const res = await axios.get(
    `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${ETHERSCAN_TOKEN_API}`,
  );
  if (res.data.message !== 'OK') {
    return null;
  }
  let abi = JSON.parse(res.data.result);
  return new ethers.utils.Interface(abi);
};
