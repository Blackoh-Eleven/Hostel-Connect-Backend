const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  roomType: { type: String, enum: ['self-contain', 'shared', 'single-room'], required: true },
  amenities: [String], // e.g. ["water", "light", "wifi"]
  images: [String], // Cloudinary URLs
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);