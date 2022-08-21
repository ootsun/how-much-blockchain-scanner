import 'dotenv/config';
import log from './services/logger.js';
import {getProvider, transactionHasFailed} from './ethereum/ethereumUtils.js';
import {connectDb} from './services/connectDB.js';
import {findAllOperations, updateOperation} from './repositories/operation-repo.js';
import {findLatestScan} from './repositories/scan-repo.js';
import {analyzeKnownOperation, analyzeUnknownOperation} from "./services/transaction-analyzer.js";

if (!await connectDb()) {
  log.warn('Exiting program');
  process.exit(0);
}

let lastMinedBlock = null;
const provider = getProvider();

try {
  const updated = await scan();
  await processUpdatedOperations(updated);
} catch (e) {
  log.error(e);
  log.warn('Exiting program');
  process.exit(0);
}

async function scan() {
  log.debug('Scanning blockchain...');
  let nbMatchingOperations = 0;
  const updated = [];
  const operationsMap = await createOperationsMap();
  const latestScan = await findLatestScan();
  lastMinedBlock = await provider.getBlockNumber();
  const latestPreviouslyScannedBlock = latestScan?.latestBlock || lastMinedBlock - 100;
  const totalBlocksToScan = lastMinedBlock - latestPreviouslyScannedBlock;
  log.debug(`From block ${latestPreviouslyScannedBlock} to ${lastMinedBlock} (${totalBlocksToScan} blocks)`);
  log.debug('Fetching latest blocks and transactions...');
  const remainingBlocksToProcess = [];
  for (let currentBlockNumber = latestPreviouslyScannedBlock + 1; currentBlockNumber <= lastMinedBlock; currentBlockNumber++) {
    remainingBlocksToProcess.push(currentBlockNumber);
  }
  const worker = async () => {
    while (true) {
      const currentBlockNumber = remainingBlocksToProcess.shift();
      if(!currentBlockNumber) {
        return;
      }
      log.debug(`Block #${currentBlockNumber} (${currentBlockNumber - latestPreviouslyScannedBlock}/${totalBlocksToScan})`);
      const block = await provider.getBlockWithTransactions(currentBlockNumber);
      log.debug(`${block.transactions.length} transactions in block`);
      for (const transaction of block.transactions) {
        if(await transactionHasFailed(transaction)) {
          continue;
        }
        try {
          if (!operationsMap.has(transaction.to)) {
            nbMatchingOperations += await analyzeUnknownOperation(transaction, operationsMap, updated, currentBlockNumber);
          } else {
            nbMatchingOperations += await analyzeKnownOperation(transaction, operationsMap, updated, currentBlockNumber);
          }
        } catch (e) {
          log.error('An error occurred while analyzing an operation :');
          log.error(e);
        }
      }
    }
  }
  await Promise.all(new Array(10).fill(0).map(worker));

  log.debug(`${nbMatchingOperations} matching operations found`);
  log.debug('Fetching latest blocks and transactions done.');
  log.debug('Scanning blockchain done.');

  return updated;
}

async function processUpdatedOperations(updated) {
  log.debug('Processing collected data...')
  for (const operation of updated) {
    operation.minGasUsage = Math.min(...operation.lastGasUsages);
    operation.maxGasUsage = Math.max(...operation.lastGasUsages);
    operation.averageGasUsage = Math.round(operation.lastGasUsages.reduce((a, b) => a + b, 0) / operation.lastGasUsages.length);
    await updateOperation(operation);
  }
  log.debug('Processing collected data done.')
}

async function createOperationsMap() {
  const operationsMap = new Map();
  for (const operation of await findAllOperations()) {
    const operations = operationsMap.get(operation.contractAddress) || [];
    operationsMap.set(operation.contractAddress, [...operations, operation]);
  }
  return operationsMap;
}