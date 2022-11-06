const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    text: {
        type: String, 
        trim: true
    },
    messageMedia: {
        type: String
    },
    cloudinaryId: {
        type: String
    },
    messageMediaType: {
        type: String
    },
    messageSender: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    }
}, {timestamps:true, updatedAt:false});


const Message = mongoose.model('Message', messageSchema);

module.exports = Message;