import 'dotenv/config';
import log from './services/logger.js';
import { getProvider } from './ethereum/ethereumUtils.js';
import { connectDb, disconnectDb } from './services/connectDB.js';
import {
  findAllOperations,
  updateOperation,
} from './repositories/operation-repo.js';
import { createScan, findLatestScan } from './repositories/scan-repo.js';
import { analyzeOperation } from './services/transaction-analyzer.js';
import { createFromTransaction } from './services/project-factory.js';

const NUMBER_OF_WORKERS = Number.parseInt(process.env.NUMBER_OF_WORKERS) || 20;
const MAX_NUMBER_OF_BLOCKS_TO_SCAN = Number.parseInt(process.env.MAX_NUMBER_OF_BLOCKS_TO_SCAN) || 100;

let lastMinedBlock = null;

const provider = getProvider();
await connectDb();

try {
  const updated = await scan();
  await processUpdatedOperations(updated);
  await disconnectDb();
} catch (e) {
  log.error(e);
  await disconnectDb();
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
  let latestPreviouslyScannedBlock;
  let totalBlocksToScan;
  if(latestScan?.latestBlock) {
    latestPreviouslyScannedBlock = latestScan.latestBlock;
    totalBlocksToScan = lastMinedBlock - latestPreviouslyScannedBlock;
  }
  if(!totalBlocksToScan || totalBlocksToScan > MAX_NUMBER_OF_BLOCKS_TO_SCAN) {
    latestPreviouslyScannedBlock = lastMinedBlock - MAX_NUMBER_OF_BLOCKS_TO_SCAN;
    totalBlocksToScan = MAX_NUMBER_OF_BLOCKS_TO_SCAN;
  }

  log.debug(
    `From block ${latestPreviouslyScannedBlock} to ${lastMinedBlock} (${totalBlocksToScan} blocks)`,
  );
  log.debug('Fetching latest blocks and transactions...');
  const remainingBlocksToProcess = [];
  for (
    let currentBlockNumber = latestPreviouslyScannedBlock + 1;
    currentBlockNumber <= lastMinedBlock;
    currentBlockNumber++
  ) {
    remainingBlocksToProcess.push(currentBlockNumber);
  }
  log.debug('Fetching latest blocks and transactions done.');

  let nbStoppedWorkers = 0;
  const worker = async (number) => {
    while (true) {
      const currentBlockNumber = remainingBlocksToProcess.shift();
      if (!currentBlockNumber) {
        log.debug(
          `Worker n°${number} stopped. ${++nbStoppedWorkers}/${NUMBER_OF_WORKERS}`,
        );
        return;
      }
      log.debug(
        `Block #${currentBlockNumber} (${
          currentBlockNumber - latestPreviouslyScannedBlock
        }/${totalBlocksToScan})`,
      );
      const block = await provider.getBlockWithTransactions(currentBlockNumber);
      log.debug(`${block.transactions.length} transactions in block`);
      for (const transaction of block.transactions) {
        try {
          if (!operationsMap.has(transaction.to)) {
            await createFromTransaction(transaction, operationsMap);
          }
          if (operationsMap.has(transaction.to)) {
            nbMatchingOperations += await analyzeOperation(
              transaction,
              operationsMap,
              updated,
              currentBlockNumber,
            );
          }
        } catch (e) {
          log.error('An error occurred while analyzing an operation :');
          log.error(e);
        }
      }
    }
  };

  try {
    let i = 1;
    await Promise.all(
      Array.from({ length: NUMBER_OF_WORKERS }, () => i++).map((number) =>
        worker(number),
      ),
    );
  } finally {
    await createScan(lastMinedBlock);
  }

  log.debug(`${nbMatchingOperations} matching operations found`);
  log.debug('Scanning blockchain done.');

  return updated;
}

async function processUpdatedOperations(updated) {
  log.debug('Processing collected data...');
  for (const operation of updated) {
    operation.minGasUsage = Math.min(
      ...operation.lastGasUsages.map((gu) => gu.value),
    );
    operation.maxGasUsage = Math.max(
      ...operation.lastGasUsages.map((gu) => gu.value),
    );
    operation.averageGasUsage = Math.round(
      operation.lastGasUsages.map((gu) => gu.value).reduce((a, b) => a + b, 0) /
        operation.lastGasUsages.length,
    );
    await updateOperation(operation);
  }
  log.debug('Processing collected data done.');
}

async function createOperationsMap() {
  const operationsMap = new Map();
  for (const operation of await findAllOperations()) {
    const operations = operationsMap.get(operation.contractAddress) || [];
    operationsMap.set(operation.contractAddress, [...operations, operation]);
  }
  return operationsMap;
}
