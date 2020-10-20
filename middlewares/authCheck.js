const HttpErrors = require('http-errors');

const authCheck = () => async (req, res, next) => {
  try {
    const { userId, method } = req;
    if (method === 'OPTIONS') {
      next();
      return;
    }
    if (!userId) {
      throw new HttpErrors(403);
    }
  } catch (e) {
    next(e);
  }
};

export default authCheck;
