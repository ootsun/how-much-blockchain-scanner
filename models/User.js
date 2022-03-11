import {Schema, model} from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const UserSchema = Schema({
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

UserSchema.plugin(uniqueValidator);

export default model("User", UserSchema);
