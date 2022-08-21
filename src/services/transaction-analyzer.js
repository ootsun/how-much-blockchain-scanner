import axios from "axios";
import {ethers} from "ethers";
import {contractIsAProxy, getImplementationAddress} from "../ethereum/contractUtils.js";
import {getProvider} from "../ethereum/ethereumUtils.js";
import log from "./logger.js";
import {createScan} from "../repositories/scan-repo.js";
import * as cloudinary from "cloudinary";
import Project from "../models/Project.js";
import mongoose from "mongoose";
import Operation from "../models/Operation.js";
import {getAlchemyClient} from "./alchemy.js";

const MAX_NUMBER_OF_GAS_USAGE_SAVED = Number.parseInt(process.env.MAX_NUMBER_OF_GAS_USAGE_SAVED);
const ETHERSCAN_TOKEN_API = process.env.ETHERSCAN_TOKEN_API;
const CLOUDINARY_PROJECTS_FOLDER_NAME = process.env.CLOUDINARY_PROJECTS_FOLDER_NAME;
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID;

const approveHashed = '0x095ea7b3';
const transferHashed = '0xa9059cbb';

const provider = getProvider();

export const analyzeUnknownOperation = async (transaction, operationsMap, updated, currentBlockNumber) => {
    if(!transaction.data.startsWith(approveHashed) && !transaction.data.startsWith(transferHashed)) {
        return 0;
    }
    const alchemyClient = await getAlchemyClient();
    let res = null;
    try {
        res = await alchemyClient.core.getTokenMetadata(transaction.to);
    } catch (e) {
        log.error('Could not get token metadata from Alchemy :');
        log.error(e.message);
        return 0;
    }
    if(res.error || !res.name || !res.logo) {
        return 0;
    }

    let iface = null;
    try {
        let contractAddress = transaction.to;
        iface = await getInterfaceOfContract(contractAddress);
        if(!iface) {
            return 0;
        }
        const project = await createProject(contractAddress, res.name, res.logo);
        log.debug(`New project created '${project.name}'`);

        let implementationAddress = undefined;
        if (contractIsAProxy(null, iface)) {
            implementationAddress = await getImplementationAddress(contractAddress);
        }

        const approveOperation = await createOperation(project, contractAddress, implementationAddress, 'approve', approveHashed);
        const transferOperation = await createOperation(project, contractAddress, implementationAddress, 'transfer', transferHashed);
        operationsMap.set(contractAddress, [approveOperation, transferOperation]);

        const currentOperation = findMatchingOperation(transaction, operationsMap);
        return await analyzeKnownOperation(transaction, operationsMap, updated, currentBlockNumber, currentOperation);
    } catch (e) {
        log.error(transaction);
        log.error(iface);
        throw e;
    }
}

export const analyzeKnownOperation = async (transaction, operationsMap, updated, currentBlockNumber, operation) => {
    try {
        if(!operation) {
            operation = findMatchingOperation(transaction, operationsMap);
        }
        if (operation) {
            const receipt = await provider.getTransactionReceipt(transaction.hash);
            operation.lastGasUsages.unshift(receipt.gasUsed.toNumber());
            operation.lastGasUsages.length = Math.min(operation.lastGasUsages.length, MAX_NUMBER_OF_GAS_USAGE_SAVED);
            if (!updated.includes(operation)) {
                updated.push(operation);
            }
            return 1;
        }
    } catch (e) {
        log.error(transaction);
        throw e;
    } finally {
        await createScan(currentBlockNumber);
    }
}

function findMatchingOperation(transaction, operationsMap) {
    const operations = operationsMap.get(transaction.to);
    const filtered = operations.filter(o => transaction.data.startsWith(o.methodId));
    return filtered.length ? filtered[0] : null;
}

const uploadLogo = async (logoToCopyUrl, tokenName) => {
    const upload = await cloudinary.v2.uploader.upload(logoToCopyUrl, {
        public_id: CLOUDINARY_PROJECTS_FOLDER_NAME + "/" + tokenName,
    });
    return upload.secure_url;
}

const createProject = async (contractAddress, tokenName, logoToCopyUrl) => {
    const logoUrl = await uploadLogo(logoToCopyUrl, tokenName);
    return await Project.create({
        createdBy: new mongoose.Types.ObjectId(SYSTEM_USER_ID),
        name: tokenName,
        logoUrl: logoUrl,
        isERC20: true
    });
}

const getInterfaceOfContract = async (contractAddress) => {
    const res = await axios.get(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${ETHERSCAN_TOKEN_API}`);
    if (res.data.message !== 'OK') {
        return null;
    }
    let abi = JSON.parse(res.data.result);
    return new ethers.utils.Interface(abi);
}

const createOperation = async (project, contractAddress, implementationAddress, functionName, methodId) => {
    return await Operation.create({
        createdBy: new mongoose.Types.ObjectId(SYSTEM_USER_ID),
        project: project._id,
        contractAddress: contractAddress,
        implementationAddress: implementationAddress,
        functionName: functionName,
        methodId: methodId
    });
}