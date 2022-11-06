const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    personId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    personName: {
        type: String
    },
    personProfileImage: {
        type: String
    },
    notifiedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notificationType: { 
        type: String
    },
    notificationText: {
        type: String
    },
    notificationPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    notificationUserProfileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notificationChatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat'
    },
    messageNotificationReceivers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    isNotificationOpened: {
        type: Boolean,
        default: false
    },
    isNotificationViewed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });


const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;