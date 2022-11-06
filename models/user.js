const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    profileImage: {
        type: String,
        required: 'Image is required'
    },
    cloudinary_id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: 'Name is required',
        lowercase: true
    },
    email: {
        type: String,
        required: 'Email is required',
        unique: true
    },
    password: {
        type: String,
        required: 'Password is required',
        select: false
    },
    username: {
        type: String,
        required: 'Username is required',
        unique: true,
        lowercase: true
    },
    bio: String,
    socialLinks: mongoose.Schema.Types.Mixed,
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    coverImage: {
        type: String
    },
    coverImage_cloudinaryId:{
        type: String
    },
    followers:[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    following:[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
});


const User = mongoose.model('User', userSchema);

module.exports = User;

