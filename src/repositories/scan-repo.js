import Scan from '../models/Scan.js';

export async function findLatestScan() {
  return Scan.findOne({}, {}, {sort: {'latestBlock': -1}});
}

export async function createScan(lastMinedBlock) {
  return Scan.create({latestBlock: lastMinedBlock});
}

export const deleteOldestScans = async (lastProcessedBlock) => {
  return Scan.deleteMany({latestBlock: {$lt: lastProcessedBlock}});
}
