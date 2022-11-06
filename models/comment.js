const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    commentText: {
        type: String
    },
    commentImage: {
        type: String
    },
    cloudinaryId: {
        type: String
    },
    commentAuthor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    commentLikes: [{type: mongoose.Schema.Types.ObjectId, ref:'User', unique: true}] 

}, {timestamps: true});




const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;