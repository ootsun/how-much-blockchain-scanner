import {Schema, model} from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const ProjectSchema = Schema({
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
  }
});

ProjectSchema.plugin(uniqueValidator);

export default model("Project", ProjectSchema);
