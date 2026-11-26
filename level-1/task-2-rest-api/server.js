const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let products = [
  { id: 1, name: 'Laptop', price: 800, stock: 10 },
  { id: 2, name: 'Mouse', price: 20, stock: 100 },
];
let nextId = 3;

// Validation helper
function validateProduct(body) {
  const { name, price, stock } = body || {};
  if (typeof name !== 'string' || name.trim() === '') {
    return 'name is required and must be a non-empty string';
  }
  if (typeof price !== 'number' || price < 0) {
    return 'price is required and must be a non-negative number';
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    return 'stock must be a non-negative integer';
  }
  return null;
}

// READ all
app.get('/api/products', (req, res) => {
  res.status(200).json(products);
});

// READ one
app.get('/api/products/:id', (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.status(200).json(product);
});

// CREATE
app.post('/api/products', (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ message: error });

  const { name, price, stock = 0 } = req.body;
  const product = { id: nextId++, name: name.trim(), price, stock };
  products.push(product);
  res.status(201).json(product);
});

// UPDATE
app.put('/api/products/:id', (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ message: error });

  const { name, price, stock = product.stock } = req.body;
  product.name = name.trim();
  product.price = price;
  product.stock = stock;
  res.status(200).json(product);
});

// DELETE
app.delete('/api/products/:id', (req, res) => {
  const index = products.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Product not found' });

  products.splice(index, 1);
  res.status(200).json({ message: 'Product deleted successfully' });
});

// Unknown route
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});