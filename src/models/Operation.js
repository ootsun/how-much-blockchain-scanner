import pkg from 'mongoose';
const {Schema, model} = pkg;
import User from './User.js';
import Project from './Project.js';

const operationSchema = Schema({
  id: {
    type: Schema.Types.ObjectId,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  contractAddress: {
    type: String,
    required: true
  },
  implementationAddress: {
    type: String,
  },
  functionName: {
    type: String,
    required: true
  },
  minGasUsage: {
    type: Number
  },
  maxGasUsage: {
    type: Number
  },
  averageGasUsage: {
    type: Number
  },
  lastGasUsages: {
    type: [Number]
  },
});

operationSchema.index({ contractAddress: 1, functionName: 1 }, { unique: true });

export default model("Operation", operationSchema);
