import Project from "../models/Project.js";
import mongoose from "mongoose";

const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID;

export const createERC20Project = async (contractAddress, tokenName, symbol, logoUrl) => {
  return await Project.create({
    createdBy: new mongoose.Types.ObjectId(SYSTEM_USER_ID),
    name: tokenName,
    symbol: symbol,
    logoUrl: logoUrl,
    isERC20: true
  });
}