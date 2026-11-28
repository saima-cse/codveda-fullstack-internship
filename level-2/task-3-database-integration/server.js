require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./db');
const { Category, Product } = require('./models');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

app.param('id', (req, res, next, id) => {
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'id must be an integer' });
  }
  next();
});

// ---------- Categories ----------
app.get('/api/categories', wrap(async (req, res) => {
  res.json(await Category.findAll({ order: [['id', 'ASC']] }));
}));

app.post('/api/categories', wrap(async (req, res) => {
  const category = await Category.create({ name: req.body.name });
  res.status(201).json(category);
}));

// ---------- Products ----------
app.get('/api/products', wrap(async (req, res) => {
  const products = await Product.findAll({ include: Category, order: [['id', 'ASC']] });
  res.json(products);
}));

app.get('/api/products/:id', wrap(async (req, res) => {
  const product = await Product.findByPk(req.params.id, { include: Category });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
}));

app.post('/api/products', wrap(async (req, res) => {
  const { name, price, stock, CategoryId } = req.body;
  const product = await Product.create({ name, price, stock, CategoryId });
  res.status(201).json(product);
}));

app.put('/api/products/:id', wrap(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const { name, price, stock, CategoryId } = req.body;
  await product.update({ name, price, stock, CategoryId });
  res.json(product);
}));

app.delete('/api/products/:id', wrap(async (req, res) => {
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
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(PORT, (err) => {
      if (err) {
        console.error('Could not start server:', err.message);
        process.exit(1);
      }
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
})();