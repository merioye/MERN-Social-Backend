const router = require("express").Router();
const Post = require("../models/post");
const Comment = require("../models/comment");
const User = require("../models/user");
const auth = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const cloudinary = require("../utils/cloudinary");

router.post("/posts", auth, upload.single("postMedia"), async (req, res) => {
    try {
        const { text, location, media } = req.body;
        if (!text && !req.file) {
            return res.status(400).json({
                message: "Please enter something to post",
            });
        }

        let result = {
            secure_url: "",
            public_id: "",
        };
        if (req.file) {
            result = await cloudinary.uploader.upload(req.file.path, {
                resource_type: "auto",
            });
        }

        const post = new Post({
            postText: text,
            postMedia: result.secure_url,
            postMediaType: media,
            cloudinaryId: result.public_id,
            postLocation: location,
            postAuthor: req.id,
        });

        const saved = await post.save();
        const savedPost = await Post.findOne({ _id: saved._id }).populate(
            "postAuthor"
        );

        res.status(201).json({
            createdPost: savedPost,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

// Get all posts to whome the loggedIn user follows or his own created
router.get("/posts", auth, async (req, res) => {
    try {
        const { profileUserId, pageNo } = req.query;

        let skips;
        if (Number(pageNo) === 1) {
            skips = 0;
        } else {
            skips = (pageNo - 1) * 10;
        }

        let posts;
        // if profileUserId is provided(means request made from profile page then in response send on his posts
        if (profileUserId) {
            posts = await Post.find({ postAuthor: profileUserId })
                .populate("postAuthor")
                .populate("postLikes")
                .populate({
                    path: "postComments",
                    populate: "commentAuthor commentLikes",
                })
                .skip(skips)
                .limit(10)
                .sort({ createdAt: -1 });
        } else {
            // following is an array who's items are id's of user's to whom the currently loggedIN user is following and including it's own id also
            let following;
            const user = await User.findOne({ _id: req.id });
            following = [...user.following, req.id];

            posts = await Post.find({ postAuthor: { $in: following } })
                .populate("postAuthor")
                .populate("postLikes")
                .populate({
                    path: "postComments",
                    populate: "commentAuthor commentLikes",
                })
                .skip(skips)
                .limit(10)
                .sort({ createdAt: -1 });
        }

        res.status(200).json({
            posts: posts,
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.get("/posts/:postId", auth, async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await Post.findOne({ _id: postId })
            .populate("postAuthor")
            .populate("postLikes")
            .populate({
                path: "postComments",
                populate: "commentAuthor commentLikes",
            });

        res.status(200).json({
            post: post,
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
        console.log(e);
    }
});

router.put("/posts/:id", auth, upload.single("postMedia"), async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.body.postText && !req.file) {
            return res.status(400).json({
                message: "No update received",
            });
        }

        let result = {
            secure_url: "",
            public_id: "",
        };
        if (req.file) {
            result = await cloudinary.uploader.upload(req.file.path, {
                resource_type: "auto",
            });
        }

        let dataToUpdate = req.body;
        if (result.secure_url.length) {
            dataToUpdate.postMedia = result.secure_url;
            dataToUpdate.cloudinaryId = result.public_id;
        }

        const updatingPost = await Post.findByIdAndUpdate(
            { _id: id },
            { $set: dataToUpdate }
        );

        if (result.secure_url.length) {
            if (updatingPost.cloudinaryId.length) {
                if (updatingPost.postMediaType === "img") {
                    await cloudinary.uploader.destroy(
                        updatingPost.cloudinaryId
                    );
                } else {
                    await cloudinary.uploader.destroy(
                        updatingPost.cloudinaryId,
                        { resource_type: "video" }
                    );
                }
            }
        }

        const updatedPost = await Post.findOne({ _id: id })
            .populate("postAuthor")
            .populate("postLikes")
            .populate({
                path: "postComments",
                populate: "commentAuthor commentLikes",
            });

        res.status(200).json({
            updatedPost: updatedPost,
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.delete("/posts/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;

        const deletedPost = await Post.findByIdAndDelete({ _id: id });

        if (deletedPost.cloudinaryId.length) {
            if (deletedPost.postMediaType === "img") {
                await cloudinary.uploader.destroy(deletedPost.cloudinaryId);
            } else {
                await cloudinary.uploader.destroy(deletedPost.cloudinaryId, {
                    resource_type: "video",
                });
            }
        }

        res.status(200).json({
            message: "Post deleted successfully...",
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.get("/posts/:id/like", auth, async (req, res) => {
    try {
        // id of the post
        const { id } = req.params;
        // liked is a query parameter that shows either the user has added(true) his like or removed(false) his like from the post
        const { liked } = req.query;

        if (liked === "true") {
            await Post.findByIdAndUpdate(
                { _id: id },
                { $push: { postLikes: req.id } }
            );

            res.status(200).json({
                message: "Post has been liked",
            });
        } else if (liked === "false") {
            await Post.findByIdAndUpdate(
                { _id: id },
                { $pull: { postLikes: req.id } }
            );

            res.status(200).json({
                message: "Post like has been removed",
            });
        }
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.post(
    "/posts/:id/comments",
    auth,
    upload.single("commentImage"),
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!req.body.commentText && !req.file) {
                return res.status(400).json({
                    message: "Please fill out the required fields",
                });
            }

            let result = {
                secure_url: "",
                public_id: "",
            };
            if (req.file) {
                result = await cloudinary.uploader.upload(req.file.path);
            }

            const comment = new Comment({
                commentText: req.body.commentText,
                commentImage: result.secure_url,
                cloudinaryId: result.public_id,
                commentAuthor: req.id,
            });

            await comment.save();

            await Post.findByIdAndUpdate(
                { _id: id },
                { $push: { postComments: comment._id } }
            );

            const createdComment = await Comment.findOne({
                _id: comment._id,
            }).populate("commentAuthor");

            res.status(201).json({
                createdComment: createdComment,
            });
        } catch (e) {
            console.log(e);
            res.status(500).json({
                message: "Some problem occurred",
            });
        }
    }
);

router.put(
    "/posts/:postId/comments/:commentId",
    auth,
    upload.single("commentImage"),
    async (req, res) => {
        try {
            const { commentId } = req.params;

            if (!req.body.commentText && !req.file) {
                return res.status(400).json({
                    message: "No update received",
                });
            }

            let result = {
                secure_url: "",
                public_id: "",
            };
            if (req.file) {
                result = await cloudinary.uploader.upload(req.file.path);
            }

            let dataToUpdate = req.body;
            if (result.secure_url.length) {
                dataToUpdate.commentImage = result.secure_url;
                dataToUpdate.cloudinaryId = result.public_id;
            }

            const updatingComment = await Comment.findByIdAndUpdate(
                { _id: commentId },
                { $set: dataToUpdate }
            );

            if (result.secure_url.length) {
                if (updatingComment.cloudinaryId.length) {
                    await cloudinary.uploader.destroy(
                        updatingComment.cloudinaryId
                    );
                }
            }

            const updatedComment = await Comment.findOne({
                _id: commentId,
            }).populate("commentAuthor");

            res.status(200).json({
                updatedComment: updatedComment,
            });
        } catch (e) {
            res.status(500).json({
                message: "Some problem occurred",
            });
        }
    }
);

router.delete("/posts/:postId/comments/:commentId", async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        const deletedComment = await Comment.findByIdAndDelete({
            _id: commentId,
        });

        if (deletedComment.cloudinaryId.length) {
            await cloudinary.uploader.destroy(deletedComment.cloudinaryId);
        }

        await Post.findByIdAndUpdate(
            { _id: postId },
            { $pull: { postComments: commentId } }
        );

        res.status(200).json({
            message: "Comment deleted successfully...",
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.get("/posts/:postId/comments/:commentId", auth, async (req, res) => {
    try {
        const { commentId } = req.params;

        const { liked } = req.query;

        if (liked === "true") {
            await Comment.findByIdAndUpdate(
                { _id: commentId },
                { $push: { commentLikes: req.id } }
            );
            res.status(200).json({
                message: "Comment like has been added",
            });
        } else if (liked === "false") {
            await Comment.findByIdAndUpdate(
                { _id: commentId },
                { $pull: { commentLikes: req.id } }
            );
            res.status(200).json({
                message: "Comment like has been removed",
            });
        }
    } catch (e) {
        res.status(500).json({
            message: "Post like has been removed",
        });
    }
});

module.exports = router;
