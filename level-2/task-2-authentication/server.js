require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('./db');
const { Category, Product, User } = require('./models');
const { authenticate, authorize } = require('./auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

app.param('id', (req, res, next, id) => {
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'id must be an integer' });
  }
  next();
});

// ---------- Auth helpers ----------
const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

const cookieOptions = {
  httpOnly: true, // JavaScript in the browser cannot read this cookie
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 1000, // 1 hour
};

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const cleanEmail = (e) => String(e || '').trim().toLowerCase();

// ---------- Auth routes ----------
app.post('/api/auth/signup', wrap(async (req, res) => {
  const { name, password } = req.body;
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  const hashed = await bcrypt.hash(password, 10); // hash before saving
  const user = await User.create({ name, email: cleanEmail(req.body.email), password: hashed });
  res.status(201).json(publicUser(user)); // new users are always role "user"
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  // unscoped() includes the password hash so we can compare it
  const user = await User.unscoped().findOne({ where: { email: cleanEmail(email) } });
  const ok = user && (await bcrypt.compare(String(password), user.password));
  if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

  res.cookie('token', signToken(user), cookieOptions);
  res.json({ message: 'Logged in successfully', user: publicUser(user) });
}));

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json(publicUser(req.user));
});

// ---------- Users (admin only) ----------
app.get('/api/users', authenticate, authorize('admin'), wrap(async (req, res) => {
  res.json(await User.findAll({ order: [['id', 'ASC']] }));
}));

app.put('/api/users/:id/role', authenticate, authorize('admin'), wrap(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'role must be "user" or "admin"' });
  }
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await user.update({ role });
  res.json(publicUser(user));
}));

// ---------- Categories ----------
app.get('/api/categories', authenticate, wrap(async (req, res) => {
  res.json(await Category.findAll({ order: [['id', 'ASC']] }));
}));

app.post('/api/categories', authenticate, authorize('admin'), wrap(async (req, res) => {
  const category = await Category.create({ name: req.body.name });
  res.status(201).json(category);
}));

// ---------- Products: any logged-in user can read, only admin can change ----------
app.get('/api/products', authenticate, wrap(async (req, res) => {
  res.json(await Product.findAll({ include: Category, order: [['id', 'ASC']] }));
}));

app.get('/api/products/:id', authenticate, wrap(async (req, res) => {
  const product = await Product.findByPk(req.params.id, { include: Category });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
}));

app.post('/api/products', authenticate, authorize('admin'), wrap(async (req, res) => {
  const { name, price, stock, CategoryId } = req.body;
  const product = await Product.create({ name, price, stock, CategoryId });
  res.status(201).json(product);
}));

app.put('/api/products/:id', authenticate, authorize('admin'), wrap(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const { name, price, stock, CategoryId } = req.body;
  await product.update({ name, price, stock, CategoryId });
  res.json(product);
}));

app.delete('/api/products/:id', authenticate, authorize('admin'), wrap(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  await product.destroy();
  res.json({ message: 'Product deleted successfully' });
}));

// ---------- Errors ----------
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  if (
    err.name === 'SequelizeValidationError' ||
    err.name === 'SequelizeUniqueConstraintError'
  ) {
    return res.status(400).json({ message: err.errors.map((e) => e.message).join(', ') });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ message: 'Invalid CategoryId' });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

// ---------- Start ----------
async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  const exists = await User.findOne({ where: { email: cleanEmail(ADMIN_EMAIL) } });
  if (exists) return;
  await User.create({
    name: 'Admin',
    email: cleanEmail(ADMIN_EMAIL),
    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
    role: 'admin',
  });
  console.log('Admin user created');
}

(async () => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing in .env');
      process.exit(1);
    }
    await sequelize.authenticate();
    await sequelize.sync();
    await seedAdmin();
    app.listen(PORT, (err) => {
      if (err) {
        console.error('Could not start server:', err.message);
        process.exit(1);
      }
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup failed:', err.message);
  }
})();