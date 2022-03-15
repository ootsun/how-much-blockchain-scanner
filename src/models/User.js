import pkg from 'mongoose';
const {Schema, model} = pkg;
import uniqueValidator from 'mongoose-unique-validator';

const userSchema = Schema({
  id: {
    type: Schema.Types.ObjectId,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  address: {
    type: String,
    unique: true,
    required: true
  },
  avatarUrl: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false,
  }
});

userSchema.plugin(uniqueValidator);

export default model("User", userSchema);
