import log from './logger.js';
import {
  contractIsAProxy,
  getImplementationAddress,
  getInterfaceOfContract,
} from '../ethereum/contractUtils.js';
import * as cloudinary from 'cloudinary';
import { createProject } from '../repositories/project-repo.js';
import { createOperation } from '../repositories/operation-repo.js';
import { getCoinGeckoClient } from './coinGecko.js';
import {
  createIgnoreERC20Contract,
  isIgnored,
} from '../repositories/ignored-ERC20-contract-repo.js';

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

  let contractAddress = transaction.to;

  if (await isIgnored(contractAddress)) {
    return;
  }

  let res = null;
  try {
    res = await getCoinGeckoClient().coins.fetchCoinContractInfo(
      contractAddress?.toLowerCase(),
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
    res.data?.market_cap_rank > MIN_COINGECKO_MARKET_CAP_RANK
  ) {
    if (!isTooManyRequestsError(res)) {
      await createIgnoreERC20Contract(contractAddress);
    }
    return;
  }

  let iface = null;
  try {
    iface = await getInterfaceOfContract(contractAddress);
    if (!iface) {
      return;
    }
    const logoUrl = await uploadLogo(res.data.image.thumb, res.data.name);
    const project = await createProject(
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
      true
    );
    const transferOperation = await createOperation(
      project,
      contractAddress,
      implementationAddress,
      'transfer',
      transferHashed,
      true
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

const isTooManyRequestsError = (res) => {
  return !res.success && res.code === 429;
};
