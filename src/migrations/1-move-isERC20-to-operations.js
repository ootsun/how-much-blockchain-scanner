import 'dotenv/config';
import { findAllOperations } from '../repositories/operation-repo.js';
import { connectDb } from '../services/connectDB.js';
import Project from '../models/Project.js';

const migrate = async () => {
  console.time('migrate');
  await connectDb();
  console.time('findAllOperations');
  const operations = await findAllOperations();
  console.timeEnd('findAllOperations');
  let i = 1;
  for (const operation of operations) {
    operation.isERC20 = operation.project.isERC20;
    console.time('save');
    await operation.save();
    console.timeEnd('save');
    console.time('updateOne');
    await Project.updateOne(
      { _id: operation.project._id },
      { $unset: { isERC20: 1 } },
    );
    console.timeEnd('updateOne');
    console.log(i++ + '/' + operations.length);
  }
  console.timeEnd('migrate');
  process.exit(0);
};

migrate();
