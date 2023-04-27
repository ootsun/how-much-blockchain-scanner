import { getProvider } from '../ethereum/ethereumUtils.js';
import log from './logger.js';

const MAX_NUMBER_OF_GAS_USAGE_SAVED = Number.parseInt(
  process.env.MAX_NUMBER_OF_GAS_USAGE_SAVED,
);

const provider = getProvider();

export const analyzeOperation = async (transaction, operationsMap, updated) => {
  try {
    const operation = findMatchingOperation(transaction, operationsMap);
    if (!operation) {
      return 0;
    }
    const receipt = await provider.getTransactionReceipt(transaction.hash);
    if (receipt.status === 0) {
      return 0;
    }
    operation.lastGasUsages.unshift({
      value: receipt.gasUsed.toNumber(),
    });
    operation.lastGasUsages.length = Math.min(
      operation.lastGasUsages.length,
      MAX_NUMBER_OF_GAS_USAGE_SAVED,
    );
    if (!updated.includes(operation)) {
      updated.push(operation);
    }
    return 1;
  } catch (e) {
    log.error(transaction);
    throw e;
  }
};

function findMatchingOperation(transaction, operationsMap) {
  const operations = operationsMap.get(transaction.to.toLowerCase());
  return operations.find((o) => transaction.data.startsWith(o.methodId));
}
