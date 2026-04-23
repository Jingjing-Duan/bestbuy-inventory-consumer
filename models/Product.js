const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: String,
    image: String,
    stock: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);