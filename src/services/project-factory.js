import {getAlchemyClient} from "./alchemy.js";
import log from "./logger.js";
import {contractIsAProxy, getImplementationAddress, getInterfaceOfContract} from "../ethereum/contractUtils.js";
import * as cloudinary from "cloudinary";
import {createERC20Project} from "../repositories/project-repo.js";
import {createOperation} from "../repositories/operation-repo.js";

const CLOUDINARY_PROJECTS_FOLDER_NAME = process.env.CLOUDINARY_PROJECTS_FOLDER_NAME;

const approveHashed = '0x095ea7b3';
const transferHashed = '0xa9059cbb';

export const createFromTransaction = async (transaction, operationsMap) => {
  if (!transaction.data.startsWith(approveHashed) && !transaction.data.startsWith(transferHashed)) {
    return;
  }
  const alchemyClient = await getAlchemyClient();
  let res = null;
  try {
    res = await alchemyClient.core.getTokenMetadata(transaction.to);
  } catch (e) {
    log.error('Could not get token metadata from Alchemy :');
    log.error(e.message);
    return;
  }
  if (res.error || !res.name || !res.logo) {
    return;
  }

  let iface = null;
  try {
    let contractAddress = transaction.to;
    iface = await getInterfaceOfContract(contractAddress);
    if (!iface) {
      return;
    }
    const logoUrl = await uploadLogo(res.logo, res.name);
    const project = await createERC20Project(contractAddress, res.name, logoUrl);
    log.debug(`New project created '${project.name}'`);

    let implementationAddress = undefined;
    if (contractIsAProxy(null, iface)) {
      implementationAddress = await getImplementationAddress(contractAddress);
    }

    const approveOperation = await createOperation(project, contractAddress, implementationAddress, 'approve', approveHashed);
    const transferOperation = await createOperation(project, contractAddress, implementationAddress, 'transfer', transferHashed);
    operationsMap.set(contractAddress, [approveOperation, transferOperation]);
  } catch (e) {
    log.error(transaction);
    throw e;
  }
}

const uploadLogo = async (logoToCopyUrl, tokenName) => {
  const upload = await cloudinary.v2.uploader.upload(logoToCopyUrl, {
    public_id: CLOUDINARY_PROJECTS_FOLDER_NAME + "/" + tokenName,
  });
  return upload.secure_url;
}