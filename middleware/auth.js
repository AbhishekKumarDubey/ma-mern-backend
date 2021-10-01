const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {
  try {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
      throw new Error('Authentication failed!');
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userData = { userId: decodedToken.userId, email: decodedToken.email };

    next();
  } catch (err) {
    return next(new HttpError('Authentication failed!', 403));
  }
};
