import { Network, Alchemy } from "alchemy-sdk";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

const settings = {
    apiKey: ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
};
let alchemyClient;

export const getAlchemyClient = async () => {
    if(!alchemyClient) {
        alchemyClient = new Alchemy(settings);
    }
    return alchemyClient;
}