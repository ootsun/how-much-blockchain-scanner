import pkg from 'mongoose';
const {Schema, model} = pkg;
import uniqueValidator from 'mongoose-unique-validator';

const projectSchema = Schema({
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
  name: {
    type: String,
    required: true,
    unique: true
  },
  logoUrl: {
    type: String,
    required: true,
  },
  isERC20: {
    type: Boolean,
    default: false,
  }
});

projectSchema.plugin(uniqueValidator);

export default model("Project", projectSchema);
