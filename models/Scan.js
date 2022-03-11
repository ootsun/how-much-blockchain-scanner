import {Schema, model} from 'mongoose';

const ScanSchema = Schema({
  id: {
    type: Schema.Types.ObjectId,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  latestBlock: {
    type: Number,
    required: true
  }
});

export default model("Scan", ScanSchema);
