import pkg from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
const { Schema, model } = pkg;

const ignoredERC20ContractSchema = Schema({
  id: {
    type: Schema.Types.ObjectId,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  contractAddress: {
    type: String,
    required: true,
    unique: true,
  },
});

ignoredERC20ContractSchema.plugin(uniqueValidator);

export default model('IgnoredERC20Contract', ignoredERC20ContractSchema);
