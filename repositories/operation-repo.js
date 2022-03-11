import Operation from '../models/Operation.js';

export async function findAllOperations() {
  return Operation.find()
    .populate('project', 'name');
}

export async function updateOperation(operation) {
  return operation.save();
}
