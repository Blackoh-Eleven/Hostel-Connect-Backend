const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    fullName: String,
    matricNumber: String,
    phoneNumber: String,
    email: String,
    password:String,
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
})

const userFormat = mongoose.model('User', userSchema)

module.exports = userFormat