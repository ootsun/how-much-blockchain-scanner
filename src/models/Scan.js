import pkg from 'mongoose';
const {Schema, model} = pkg;

const scanSchema = Schema({
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

export default model("Scan", scanSchema);
