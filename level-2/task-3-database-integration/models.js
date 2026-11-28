const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Category = sequelize.define('Category', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Category name is required' },
      len: { args: [2, 50], msg: 'Category name must be 2-50 characters' },
    },
  },
});

const Product = sequelize.define(
  'Product',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Product name is required' },
        len: { args: [2, 100], msg: 'Product name must be 2-100 characters' },
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: { args: [0], msg: 'Price must be 0 or more' } },
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: { msg: 'Stock must be an integer' },
        min: { args: [0], msg: 'Stock must be 0 or more' },
      },
    },
  },
  {
    indexes: [{ fields: ['name'] }, { fields: ['price'] }],
  }
);

Category.hasMany(Product, { onDelete: 'SET NULL' });
Product.belongsTo(Category);

module.exports = { Category, Product };