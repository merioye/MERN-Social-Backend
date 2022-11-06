const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    users: [
        {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User',
        }
    ],
    messages:[
        {
            type: mongoose.Schema.Types.ObjectId, 
            ref:'Message'
        }
    ],
    lastMessage: {
        type: String
    },
    lastMessageDate: {
        type: String
    },
    isGrp: {
        type: Boolean,
        default: false
    },
    grpAvatar: {
        type: String
    },
    grpAvatarCloudinaryId: {
        type: String
    },
    grpSubject: {
        type: String
    },
    grpDesc: {
        type: String
    },
    grpAdmins: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    grpCreator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    grpSendMessages: {
        type: String,
        default: 'all'
    },
    grpEditInfo: {
        type: String,
        default: 'admins'
    }
}, {timestamps:true});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;