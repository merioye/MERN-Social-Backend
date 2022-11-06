const router = require("express").Router();
const ObjectId = require("mongoose").Types.ObjectId;
const auth = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const Message = require("../models/message");
const Chat = require("../models/chat");
const User = require("../models/user");
const cloudinary = require("../utils/cloudinary");

router.post("/chats", auth, upload.single("grpAvatar"), async (req, res) => {
    try {
        const { user, isGrp, grpSubject, grpDesc, users, grpCreatorName } =
            req.body;

        if (isGrp === "true") {
            if (!grpSubject) {
                return res.status(400).json({
                    message: "Subject is required",
                });
            }

            // converting users string into array of individual user and then changing each user id data type(string) to ObjectId
            let usersInArray = users.split(",");
            if (usersInArray.length && usersInArray[0]) {
                usersInArray = usersInArray.map((userInArray) => {
                    return new ObjectId(userInArray);
                });
            } else {
                usersInArrary = [];
            }

            // formating grpCreatorName
            let formatedGrpCreatorName = grpCreatorName
                .split(" ")
                .map((item) => {
                    return item[0].toUpperCase() + item.slice(1);
                })
                .join(" ");

            let result = {
                secure_url: "",
                public_id: "",
            };
            if (req.file) {
                result = await cloudinary.uploader.upload(req.file.path);
            }

            const message = new Message({
                text: `${formatedGrpCreatorName} created group "${grpSubject}"`,
                messageMedia: "",
                messageMediaType: "notification",
                cloudinaryId: "",
            });

            const savedMessage = await message.save();

            // creating new chat
            let usrs;
            if (usersInArray.length && usersInArray[0]) {
                usrs = [req.id, ...usersInArray];
            } else {
                usrs = [req.id];
            }
            const chat = new Chat({
                users: usrs,
                messages: [savedMessage._id],
                lastMessage: savedMessage.text,
                lastMessageDate: savedMessage.createdAt,
                isGrp: true,
                grpAvatar: result.secure_url,
                grpAvatarCloudinaryId: result.public_id,
                grpSubject: grpSubject,
                grpDesc: grpDesc,
                grpAdmins: [req.id],
                grpCreator: req.id,
            });

            const savedChat = await chat.save();
            await savedChat.populate("users", {
                _id: 1,
                name: 1,
                profileImage: 1,
            });

            return res.status(201).json({
                savedChat: savedChat,
            });
        }
        // if chat is of not group type means individual chat
        else {
            const chat = new Chat({
                users: [new ObjectId(user), req.id],
            });

            const savedChat = await chat.save();
            await savedChat.populate("users", {
                _id: 1,
                name: 1,
                profileImage: 1,
            });

            return res.status(201).json({
                savedChat: savedChat,
            });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.get("/chats", auth, async (req, res) => {
    try {
        const chats = await Chat.find({
            users: { $elemMatch: { $eq: req.id } },
        })
            .populate("grpCreator", { _id: 1, name: 1 })
            .populate("users", { _id: 1, name: 1, profileImage: 1 })
            .sort({ updatedAt: -1 });

        res.status(200).json({
            chats: chats,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.put(
    "/chats/:chatId",
    upload.single("grpAvatar"),
    auth,
    async (req, res) => {
        try {
            const { chatId } = req.params;
            const { type } = req.query;

            const {
                changedBy,
                grpSubject,
                grpDesc,
                grpEditInfo,
                grpSendMessages,
                newParticipants,
                addAdminId,
                addAdminName,
                removeAdminId,
                removeAdminName,
                removeParticipantId,
                removeParticipantName,
                exitParticipantId,
                exitParticipantName,
            } = req.body;

            if (type === "grpIcon" && req.file) {
                const result = await cloudinary.uploader.upload(req.file.path);

                const updatingChat = await Chat.findByIdAndUpdate(
                    { _id: chatId },
                    {
                        grpAvatar: result.secure_url,
                        grpAvatarCloudinaryId: result.public_id,
                    }
                );

                if (updatingChat.grpAvatarCloudinaryId.length) {
                    await cloudinary.uploader.destroy(
                        updatingChat.grpAvatarCloudinaryId
                    );
                }

                const message = new Message({
                    text: `${changedBy} changed this group's icon`,
                    messageMedia: "",
                    messageMediaType: "notification",
                    cloudinaryId: "",
                });

                const savedMessage = await message.save();

                const updatedChat = await Chat.findByIdAndUpdate(
                    { _id: chatId },
                    {
                        $push: { messages: savedMessage._id },
                        lastMessage: savedMessage.text,
                        lastMessageDate: savedMessage.createdAt,
                    },
                    { new: true }
                );
                await updatedChat.populate("users", {
                    _id: 1,
                    name: 1,
                    profileImage: 1,
                });

                res.status(200).json({
                    updatedChat: updatedChat,
                });
            } else if (type === "grpSubject") {
                if (!grpSubject) {
                    return res.status(400).json({
                        message: "Group subject should not be empty",
                    });
                }

                const message = new Message({
                    text: `${changedBy} changed the subject to "${grpSubject}"`,
                    messageMedia: "",
                    messageMediaType: "notification",
                    cloudinaryId: "",
                });

                const savedMessage = await message.save();

                const updatedChat = await Chat.findByIdAndUpdate(
                    { _id: chatId },
                    {
                        $push: { messages: savedMessage._id },
                        lastMessage: savedMessage.text,
                        lastMessageDate: savedMessage.createdAt,
                        grpSubject: grpSubject,
                    },
                    { new: true }
                );

                res.status(200).json({
                    updatedChat: updatedChat,
                });
            } else if (type === "grpDesc") {
                const message = new Message({
                    text: `${changedBy} changed the group description`,
                    messageMedia: "",
                    messageMediaType: "notification",
                    cloudinaryId: "",
                });

                const savedMessage = await message.save();

                const updatedChat = await Chat.findByIdAndUpdate(
                    { _id: chatId },
                    {
                        $push: { messages: savedMessage._id },
                        lastMessage: savedMessage.text,
                        lastMessageDate: savedMessage.createdAt,
                        grpDesc: grpDesc,
                    },
                    { new: true }
                );

                res.status(200).json({
                    updatedChat: updatedChat,
                });
            } else if (type === "grpEditInfo") {
                let permissions;
                if (grpEditInfo === "all") {
                    permissions = "all participants";
                } else if (grpEditInfo === "admins") {
                    permissions = "only admins";
                }

                const message = new Message({
                    text: `${changedBy} changed this group's settings to allow ${permissions} to edit this group's info.`,
                    messageMedia: "",
                    messageMediaType: "notification",
                    cloudinaryId: "",
                });

                const savedMessage = await message.save();

                const updatedChat = await Chat.findByIdAndUpdate(
                    { _id: chatId },
                    {
                        $push: { messages: savedMessage._id },
                        lastMessage: savedMessage.text,
                        lastMessageDate: savedMessage.createdAt,
                        grpEditInfo: grpEditInfo,
                    },
                    { new: true }
                );

                res.status(200).json({
                    updatedChat: updatedChat,
                });
            } else if (type === "grpSendMessages") {
                let permissions;
                if (grpSendMessages === "all") {
                    permissions = "all participants";
                } else if (grpSendMessages === "admins") {
                    permissions = "only admins";
                }

                const message = new Message({
                    text: `${changedBy} changed this group's settings to allow ${permissions} to send messages to this group.`,
                    messageMedia: "",
                    messageMediaType: "notification",
                    cloudinaryId: "",
                });

                const savedMessage = await message.save();

                const updatedChat = await Chat.findByIdAndUpdate(
                    { _id: chatId },
                    {
                        $push: { messages: savedMessage._id },
                        lastMessage: savedMessage.text,
                        lastMessageDate: savedMessage.createdAt,
                        grpSendMessages: grpSendMessages,
                    },
                    { new: true }
                );

                res.status(200).json({
                    updatedChat: updatedChat,
                });
            } else if (type === "addNewParticipants") {
                // converting new participants string into array of individual participant string id
                let newParticipantsInArray = newParticipants.split(",");
                // changing each participant id data type(string) to ObjectId
                newParticipantsInArray = newParticipantsInArray.map(
                    (newParticipantInArray) => {
                        return new ObjectId(newParticipantInArray);
                    }
                );

                if (!newParticipantsInArray.length) {
                    return res.status(400).json({
                        message: "No participant found to add",
                    });
                }

                const savedMessagesIds = [];

                // creating messages for all participants who will be added to the group(e.g Faheem added Junaid)
                newParticipantsInArray.forEach(async (newPrt, index) => {
                    const user = await User.findOne({ _id: newPrt }).select(
                        "name"
                    );

                    const formatedName = user.name
                        .split(" ")
                        .map((item) => {
                            return item[0].toUpperCase() + item.slice(1);
                        })
                        .join(" ");

                    const message = new Message({
                        text: `${changedBy} added ${formatedName}`,
                        messageMedia: "",
                        messageMediaType: "notification",
                        cloudinaryId: "",
                    });

                    const savedMessage = await message.save();
                    savedMessagesIds.push(savedMessage._id);

                    // when the last participant reaches then updating the db and sending response with updated data
                    if (index === newParticipantsInArray.length - 1) {
                        const updatedChat = await Chat.findByIdAndUpdate(
                            { _id: chatId },
                            {
                                $push: {
                                    users: { $each: newParticipantsInArray },
                                    messages: { $each: savedMessagesIds },
                                },
                                lastMessage: savedMessage.text,
                                lastMessageDate: savedMessage.createdAt,
                            },
                            { new: true }
                        );
                        await updatedChat.populate("users", {
                            _id: 1,
                            name: 1,
                            profileImage: 1,
                        });

                        res.status(200).json({
                            updatedChat: updatedChat,
                        });
                    }
                });
            } else if (type === "makeGrpAdmin") {
                const formatedName = addAdminName
                    .split(" ")
                    .map((item) => {
                        return item[0].toUpperCase() + item.slice(1);
                    })
                    .join(" ");

                const message = new Message({
                    text: `${formatedName} now an admin`,
                    messageMedia: "",
                    messageMediaType: "notification",
                    cloudinaryId: "",
                });

                const savedMessage = await message.save();

                const updatedChat = await Chat.findByIdAndUpdate(
                    { _id: chatId },
                    {
                        $push: {
                            grpAdmins: addAdminId,
                            messages: savedMessage._id,
                        },
                        lastMessage: savedMessage.text,
                        lastMessageDate: savedMessage.createdAt,
                    },
                    { new: true }
                );

                res.status(200).json({
                    updatedChat: updatedChat,
                });
            } else if (type === "dismissGrpAdmin") {
                const formatedName = removeAdminName
                    .split(" ")
                    .map((item) => {
                        return item[0].toUpperCase() + item.slice(1);
                    })
                    .join(" ");

                const message = new Message({
                    text: `${formatedName} no longer an admin`,
                    messageMedia: "",
                    messageMediaType: "notification",
                    cloudinaryId: "",
                });

                const savedMessage = await message.save();

                const updatedChat = await Chat.findByIdAndUpdate(
                    { _id: chatId },
                    {
                        $push: { messages: savedMessage._id },
                        $pull: { grpAdmins: removeAdminId },
                        lastMessage: savedMessage.text,
                        lastMessageDate: savedMessage.createdAt,
                    },
                    { new: true }
                );

                res.status(200).json({
                    updatedChat: updatedChat,
                });
            } else if (type === "removeGrpParticipant") {
                const formatedName = removeParticipantName
                    .split(" ")
                    .map((item) => {
                        return item[0].toUpperCase() + item.slice(1);
                    })
                    .join(" ");

                const message = new Message({
                    text: `${changedBy} removed ${formatedName}`,
                    messageMedia: "",
                    messageMediaType: "notification",
                    cloudinaryId: "",
                });

                const savedMessage = await message.save();

                const updatedChat = await Chat.findByIdAndUpdate(
                    { _id: chatId },
                    {
                        $push: { messages: savedMessage._id },
                        $pull: {
                            users: removeParticipantId,
                            grpAdmins: removeParticipantId,
                        },
                        lastMessage: savedMessage.text,
                        lastMessageDate: savedMessage.createdAt,
                    },
                    { new: true }
                );

                res.status(200).json({
                    updatedChat: updatedChat,
                });
            } else if (type === "exitGrpParticipant") {
                const formatedName = exitParticipantName
                    .split(" ")
                    .map((item) => {
                        return item[0].toUpperCase() + item.slice(1);
                    })
                    .join(" ");

                const message = new Message({
                    text: `${formatedName} left`,
                    messageMedia: "",
                    messageMediaType: "notification",
                    cloudinaryId: "",
                });

                const savedMessage = await message.save();

                const updatedChat = await Chat.findByIdAndUpdate(
                    { _id: chatId },
                    {
                        $push: { messages: savedMessage._id },
                        $pull: {
                            users: exitParticipantId,
                            grpAdmins: exitParticipantId,
                        },
                        lastMessage: savedMessage.text,
                        lastMessageDate: savedMessage.createdAt,
                    },
                    { new: true }
                );

                res.status(200).json({
                    updatedChat: updatedChat,
                });
            }
        } catch (e) {
            console.log(e);
            res.status(500).json({
                message: "Some problem occurred",
            });
        }
    }
);

router.delete("/chats/:chatId", auth, async (req, res) => {
    try {
        const { chatId } = req.params;

        const deletedChat = await Chat.findByIdAndDelete({ _id: chatId });
        const msgsToDelete = deletedChat.messages;

        msgsToDelete.forEach(async (msgId) => {
            const deletedMsg = await Message.findByIdAndDelete({ _id: msgId });
            if (deletedMsg.cloudinaryId.length) {
                if (deletedMsg.messageMediaType === "img") {
                    await cloudinary.uploader.destroy(deletedMsg.cloudinaryId);
                } else {
                    await cloudinary.uploader.destroy(deletedMsg.cloudinaryId, {
                        resource_type: "video",
                    });
                }
            }
        });

        res.status(200).json({
            message: "Chat deleted successfully...",
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.post(
    "/messages",
    auth,
    upload.single("messageMedia"),
    async (req, res) => {
        try {
            const { chatId } = req.query;

            const { text, messageMediaType, recordedMin, recordedSec } =
                req.body;
            if (!text && !req.file) {
                return res.status(400).json({
                    message: "Message is empty",
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

            const message = new Message({
                text: text,
                messageMedia: result.secure_url,
                messageMediaType: messageMediaType,
                cloudinaryId: result.public_id,
                messageSender: req.id,
            });

            const savedMessage = await message.save();

            let lastMessage = savedMessage.text;
            let lastMessageDate = savedMessage.createdAt;
            if (messageMediaType === "img") {
                lastMessage =
                    '<i className="fas fa-camera"></i>&nbsp;&nbsp;Photo';
            }
            if (messageMediaType === "aud") {
                lastMessage = `<i className="fas fa-microphone"></i>&nbsp;&nbsp;${recordedMin}:${
                    Number(recordedSec) < 10 ? "0" + recordedSec : recordedSec
                }`;
            }

            await Chat.findByIdAndUpdate(
                { _id: chatId },
                {
                    $push: { messages: savedMessage._id },
                    lastMessage: lastMessage,
                    lastMessageDate: lastMessageDate,
                }
            );

            res.status(201).json({
                savedMessage: savedMessage,
            });
        } catch (e) {
            console.log(e);
            res.status(500).json({
                message: "Some problem occurred",
            });
        }
    }
);

router.get("/messages/:chatId", auth, async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({ _id: chatId }).populate({
            path: "messages",
            populate: { path: "messageSender", select: { name: 1 } },
        });

        res.status(200).json({
            chat: chat,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

module.exports = router;
