import {getAlchemyClient} from "./alchemy.js";
import log from "./logger.js";
import {contractIsAProxy, getImplementationAddress} from "../ethereum/contractUtils.js";
import * as cloudinary from "cloudinary";
import Project from "../models/Project.js";
import mongoose from "mongoose";
import axios from "axios";
import {ethers} from "ethers";
import Operation from "../models/Operation.js";

const ETHERSCAN_TOKEN_API = process.env.ETHERSCAN_TOKEN_API;
const CLOUDINARY_PROJECTS_FOLDER_NAME = process.env.CLOUDINARY_PROJECTS_FOLDER_NAME;
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID;

const approveHashed = '0x095ea7b3';
const transferHashed = '0xa9059cbb';

export const createFromTransaction = async (transaction, operationsMap) => {
    if(!transaction.data.startsWith(approveHashed) && !transaction.data.startsWith(transferHashed)) {
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
    if(res.error || !res.name || !res.logo) {
        return;
    }

    let iface = null;
    try {
        let contractAddress = transaction.to;
        iface = await getInterfaceOfContract(contractAddress);
        if(!iface) {
            return;
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