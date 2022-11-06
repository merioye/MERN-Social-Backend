const mongoose = require('mongoose');

const resetPasswordSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }

}, { timestamps: true });


// setting token's expiry which is after 2 hours of its creation
resetPasswordSchema.index({'updatedAt': 1}, {expireAfterSeconds: 7200});


const ResetPassword = mongoose.model('ResetPassword', resetPasswordSchema);

module.exports = ResetPassword;