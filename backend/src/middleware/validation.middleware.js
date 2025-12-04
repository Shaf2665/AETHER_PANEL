const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors for frontend (expects error.response?.data?.error)
    const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`).join(', ');
    return res.status(400).json({ error: errorMessages });
  }
  next();
};

module.exports = { validate };

