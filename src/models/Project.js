import pkg from 'mongoose';
const { Schema, model } = pkg;
import uniqueValidator from 'mongoose-unique-validator';

const projectSchema = Schema({
  id: {
    type: Schema.Types.ObjectId,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  symbol: {
    type: String,
    trim: true,
    sparse: true,
    uppercase: true,
  },
  logoUrl: {
    type: String,
    trim: true,
    required: true,
  },
});

export default model('Project', projectSchema);
