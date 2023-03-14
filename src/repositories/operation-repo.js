import Operation from '../models/Operation.js';
import mongoose from 'mongoose';

const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID;

export async function findAllOperations() {
  return Operation.find().populate('project', 'name isERC20');
}

export async function updateOperation(operation) {
  return operation.save();
}

export const createOperation = async (
  project,
  contractAddress,
  implementationAddress,
  functionName,
  methodId,
) => {
  return Operation.create({
    createdBy: new mongoose.Types.ObjectId(SYSTEM_USER_ID),
    project: project._id,
    contractAddress: contractAddress,
    implementationAddress: implementationAddress,
    functionName: functionName,
    methodId: methodId,
  });
};
