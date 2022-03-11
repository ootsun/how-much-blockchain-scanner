import {ethers} from 'ethers';
import axios from 'axios';
import log from 'logger.js';
import {contractIsAProxy, getImplementationAddress} from 'ethereum/contractUtils.js';
import {provider} from 'ethereum/ethereumUtils.js';
import {connectDb} from './connectDB.js';
import {findAllOperations, updateOperation} from './repositories/operation-repo.js';
import {createScan, findLatestScan} from './repositories/scan-repo.js';

const MAX_NUMBER_OF_GAS_USAGE_SAVED = Number.parseInt(process.env.MAX_NUMBER_OF_GAS_USAGE_SAVED);
const ETHERSCAN_TOKEN_API = process.env.ETHERSCAN_TOKEN_API;

if (!await connectDb()) {
  log.warn('Exiting program');
  return;
}

let lastMinedBlock = null;

try {
  const updated = await scan();
  await process(updated);
} catch (e) {
  log.error(e);
  log.warn('Exiting program');
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
  log.debug(`From block ${lastMinedBlock} to ${latestPreviouslyScannedBlock} (${totalBlocksToScan} blocks)`);
  log.debug('Fetching latest blocks and transactions...');
  for (let currentBlockNumber = lastMinedBlock; currentBlockNumber > latestPreviouslyScannedBlock; currentBlockNumber--) {
    log.debug(`Block #${currentBlockNumber} (${currentBlockNumber - latestPreviouslyScannedBlock + 1}/${totalBlocksToScan})`);
    const block = await provider.getBlockWithTransactions(currentBlockNumber);
    log.debug(`${block.transactions.length} transactions in block`);
    for (const transaction of block.transactions) {
      if (!operationsMap.has(transaction.to)) {
        continue;
      }
      console.log('abi')
      const res = await axios.get(`https://api.etherscan.io/api?module=contract&action=getabi&address=${transaction.to}&apikey=${ETHERSCAN_TOKEN_API}`);
      if (res.data.message !== 'OK') {
        continue;
      }
      let abi = JSON.parse(res.data.result);
      let iface = new ethers.utils.Interface(abi);
      try {
        let implementationAddress = null;
        if (contractIsAProxy(null, iface)) {
          implementationAddress = await getImplementationAddress(transaction.to);
          console.log('abi2')
          const res = await axios.get(`https://api.etherscan.io/api?module=contract&action=getabi&address=${implementationAddress}&apikey=${ETHERSCAN_TOKEN_API}`);
          if (res.data.message !== 'OK') {
            continue;
          }
          abi = JSON.parse(res.data.result);
          iface = new ethers.utils.Interface(abi);
        }
        const operation = findMatchingOperation(iface, transaction, operationsMap);
        if (operation) {
          const receipt = await provider.getTransactionReceipt(transaction.hash);
          operation.lastGasUsages.unshift(receipt.gasUsed.toNumber());
          operation.lastGasUsages.length = Math.min(operation.lastGasUsages.length, MAX_NUMBER_OF_GAS_USAGE_SAVED);
          if (!updated.includes(operation)) {
            updated.push(operation);
          }
          nbMatchingOperations++;
        }
      } catch (e) {
        console.log(e)
        console.log(transaction)
        console.log(iface)
        throw e;
      }
    }
  }
  log.debug(`${nbMatchingOperations} matching operations found`);
  log.debug('Fetching latest blocks and transactions done.');
  log.debug('Scanning blockchain done.');

  return updated;
}

async function process(updated) {
  log.debug('Processing collected data...')
  for (const operation of updated) {
    operation.minGasUsage = Math.min(...operation.lastGasUsages);
    operation.maxGasUsage = Math.max(...operation.lastGasUsages);
    operation.averageGasUsage = Math.round(operation.lastGasUsages.reduce((a, b) => a + b, 0) / operation.lastGasUsages.length);
    await updateOperation(operation);
  }
  await createScan(lastMinedBlock);
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

function findMatchingOperation(iface, transaction, operationsMap) {
  const parsed = iface.parseTransaction(transaction);
  const operations = operationsMap.get(transaction.to);
  const filtered = operations.filter(o => o.functionName === parsed.name);
  return filtered.length ? filtered[0] : null;
}
