const jwt = require('jsonwebtoken');
const { User } = require('./models');

// Checks the JWT (from the cookie, or an Authorization: Bearer header)
async function authenticate(req, res, next) {
  try {
    let token = req.cookies.token;
    const header = req.headers.authorization;
    if (!token && header && header.startsWith('Bearer ')) {
      token = header.slice(7);
    }
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    next(err);
  }
}

// Allows only the given roles
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, authorize };