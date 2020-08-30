const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = (req, res, next) => {
  // Get token from header

  const token = req.header('Authorization');

  //   Check if no token

  if (!token) {
    return res.status(401).json({ msg: 'You are not authorized.' });
  }

  //   Verify

  try {
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    req.user = decoded.user;
    next();
  } catch (E) {
    res.status(401).json({ msg: 'You are not authorized.' });
  }
};
