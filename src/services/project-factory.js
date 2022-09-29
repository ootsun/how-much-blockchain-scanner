import log from './logger.js';
import {
  contractIsAProxy,
  getImplementationAddress,
  getInterfaceOfContract,
} from '../ethereum/contractUtils.js';
import * as cloudinary from 'cloudinary';
import { createERC20Project } from '../repositories/project-repo.js';
import { createOperation } from '../repositories/operation-repo.js';
import { getCoinGeckoClient } from './coinGecko.js';

const CLOUDINARY_PROJECTS_FOLDER_NAME =
  process.env.CLOUDINARY_PROJECTS_FOLDER_NAME;
const MIN_COINGECKO_MARKET_CAP_RANK =
  process.env.MIN_COINGECKO_MARKET_CAP_RANK || 1000;

const approveHashed = '0x095ea7b3';
const transferHashed = '0xa9059cbb';

export const createFromTransaction = async (transaction, operationsMap) => {
  if (
    !transaction.data.startsWith(approveHashed) &&
    !transaction.data.startsWith(transferHashed)
  ) {
    return;
  }

  let res = null;
  try {
    res = await getCoinGeckoClient().coins.fetchCoinContractInfo(
      transaction.to,
    );
  } catch (e) {
    log.error('Could not get coin contract info from CoinGecko :');
    log.error(e.message);
    return;
  }

  if (
    !res.success ||
    !res.data?.image?.thumb ||
    !res.data?.market_cap_rank ||
    !res.data?.market_cap_rank <= MIN_COINGECKO_MARKET_CAP_RANK
  ) {
    return;
  }

  let iface = null;
  try {
    let contractAddress = transaction.to;
    iface = await getInterfaceOfContract(contractAddress);
    if (!iface) {
      return;
    }
    const logoUrl = await uploadLogo(res.data.image.thumb, res.data.name);
    const project = await createERC20Project(
      contractAddress,
      res.data.name,
      res.data.symbol,
      logoUrl,
    );
    log.debug(`New project created '${project.name}'`);

    let implementationAddress = undefined;
    if (contractIsAProxy(null, iface)) {
      implementationAddress = await getImplementationAddress(contractAddress);
    }

    const approveOperation = await createOperation(
      project,
      contractAddress,
      implementationAddress,
      'approve',
      approveHashed,
    );
    const transferOperation = await createOperation(
      project,
      contractAddress,
      implementationAddress,
      'transfer',
      transferHashed,
    );
    operationsMap.set(contractAddress, [approveOperation, transferOperation]);
  } catch (e) {
    log.error(transaction);
    throw e;
  }
};

const uploadLogo = async (logoToCopyUrl, tokenName) => {
  const upload = await cloudinary.v2.uploader.upload(logoToCopyUrl, {
    public_id: CLOUDINARY_PROJECTS_FOLDER_NAME + '/' + tokenName,
  });
  return upload.secure_url;
};
