import IgnoredERC20Contract from '../models/IgnoredERC20Contract.js';

export const createIgnoreERC20Contract = async (contractAddress) => {
  return IgnoredERC20Contract.create({
    contractAddress: contractAddress,
  });
};

export const isIgnored = async (contractAddress) => {
  const ignoredContract = await IgnoredERC20Contract.findOne({
    contractAddress: { $eq: contractAddress },
  });

  if (!ignoredContract) {
    return false;
  }

  console.log(ignoredContract);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  if (ignoredContract.createdAt.getTime() < oneWeekAgo.getTime()) {
    await IgnoredERC20Contract.deleteOne(ignoredContract);
    return false;
  }

  return true;
};
