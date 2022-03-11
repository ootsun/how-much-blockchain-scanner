export function contractIsAProxy(methods, iface) {
  if (!methods) {
    methods = Object.values(iface.functions).map(f => f.name);
  }
  return methods.includes('implementation');
}

export async function getImplementationAddress(contractAddress) {
  const address = await provider.getStorageAt(contractAddress, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc');
  return ethers.utils.hexStripZeros(address);
}
