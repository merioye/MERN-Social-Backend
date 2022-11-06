require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { Server } = require("socket.io");
const dbConnection = require("./utils/dbConnection");
const User = require("./models/user");

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 8000;
const corsOptions = {
    origin: process.env.CLIENT_APP_URL,
    credentials: true,
    optionSuccessStatus: 200,
};
const io = new Server(httpServer, corsOptions);

dbConnection();

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

// routes
const authRoute = require("./routes/auth");
const postRoute = require("./routes/post");
const profileRoute = require("./routes/profile");
const chatRoute = require("./routes/chat");
const notificationRoute = require("./routes/notification");

app.use(authRoute);
app.use(postRoute);
app.use(profileRoute);
app.use(chatRoute);
app.use(notificationRoute);

httpServer.listen(port, () => console.log(`Server is running on port ${port}`));

// object that will contain online users data in the form of socket id as key and user id as its value
let onlineUsers = {};

io.on("connection", (socket) => {
    socket.on("newConnection", (userId) => {
        if (!Object.values(onlineUsers).includes(userId)) {
            onlineUsers[socket.id] = userId;

            io.emit("onlineUsers", Object.values(onlineUsers));
            console.log(onlineUsers);
        }
    });

    socket.on("join-chat", (room) => {
        socket.join(room);
    });

    socket.on("send-message", (message, room, recordedTime, notification) => {
        console.log("hello");

        socket
            .to(room)
            .emit("receive-message", message, room, recordedTime, notification);
    });

    socket.on("typing", (room, name) => {
        socket.to(room).emit("typing", room, name);
    });

    socket.on("startRecording", (room, name) => {
        socket.to(room).emit("startRecording", room, name);
    });

    socket.on("stopRecording", (room, name) => {
        socket.to(room).emit("stopRecording", room, name);
    });

    socket.on("grpIconUpdate", (room, updatedChat, newMessage) => {
        socket.to(room).emit("grpIconUpdate", room, updatedChat, newMessage);
    });

    socket.on("grpSubjectUpdate", (room, updatedChat, newMessage) => {
        socket.to(room).emit("grpSubjectUpdate", room, updatedChat, newMessage);
    });

    socket.on("grpDescUpdate", (room, updatedChat, newMessage) => {
        socket.to(room).emit("grpDescUpdate", room, updatedChat, newMessage);
    });

    socket.on("grpEditInfoUpdate", (room, updatedChat, newMessage) => {
        socket
            .to(room)
            .emit("grpEditInfoUpdate", room, updatedChat, newMessage);
    });

    socket.on("grpSendMessagesUpdate", (room, updatedChat, newMessage) => {
        socket
            .to(room)
            .emit("grpSendMessagesUpdate", room, updatedChat, newMessage);
    });

    socket.on("addNewParticipantToGrp", (room, updatedChat, newMessages) => {
        socket
            .to(room)
            .emit("addNewParticipantsToGrp", room, updatedChat, newMessages);
    });

    socket.on(
        "grpAddAdminsUpdate",
        (room, updatedChat, newMessage, updatedSelectedConversationInfo) => {
            socket
                .to(room)
                .emit(
                    "grpAddAdminsUpdate",
                    room,
                    updatedChat,
                    newMessage,
                    updatedSelectedConversationInfo
                );
        }
    );

    socket.on(
        "grpDismissAdminsUpdate",
        (room, updatedChat, newMessage, updatedSelectedConversationInfo) => {
            socket
                .to(room)
                .emit(
                    "grpDismissAdminsUpdate",
                    room,
                    updatedChat,
                    newMessage,
                    updatedSelectedConversationInfo
                );
        }
    );

    socket.on(
        "removeParticipantUpdate",
        (
            room,
            updatedChat,
            newMessage,
            updatedSelectedConversationInfo,
            userId
        ) => {
            socket
                .to(room)
                .emit(
                    "removeParticipantUpdate",
                    room,
                    updatedChat,
                    newMessage,
                    updatedSelectedConversationInfo,
                    userId
                );
        }
    );

    socket.on(
        "exitParticipantUpdate",
        (room, updatedChat, newMessage, updatedSelectedConversationInfo) => {
            socket
                .to(room)
                .emit(
                    "exitParticipantUpdate",
                    room,
                    updatedChat,
                    newMessage,
                    updatedSelectedConversationInfo
                );
        }
    );

    socket.on("deleteGrpUpdate", (room, chatId) => {
        socket.to(room).emit("deleteGrpUpdate", room, chatId);
    });

    socket.on("commentNotification", (notification) => {
        const socketId = Object.keys(onlineUsers).find(
            (id) => onlineUsers[id] === notification.notifiedUser
        );

        io.to(socketId).emit("commentNotification", notification);
    });

    socket.on("likeNotification", (notification) => {
        const socketId = Object.keys(onlineUsers).find(
            (id) => onlineUsers[id] === notification.notifiedUser
        );

        io.to(socketId).emit("likeNotification", notification);
    });

    socket.on("followNotification", (notification) => {
        const socketId = Object.keys(onlineUsers).find(
            (id) => onlineUsers[id] === notification.notifiedUser
        );

        io.to(socketId).emit("followNotification", notification);
    });

    socket.on("newPostUpdate", async (postAuthorId) => {
        const user = await User.findOne({ _id: postAuthorId }).select(
            "followers"
        );

        let usersToUpdate = [...user.followers];

        const onlineUsersIds = Object.values(onlineUsers);
        const onlineUsersSocketIds = Object.keys(onlineUsers);

        usersToUpdate.forEach((userId) => {
            if (onlineUsersIds.includes(String(userId))) {
                let index = onlineUsersIds.indexOf(String(userId));
                io.to(onlineUsersSocketIds[index]).emit("newPostUpdate");
            }
        });
    });

    socket.on(
        "likePostUpdate",
        async (postId, postAuthorId, newLike, isLiked) => {
            const user = await User.findOne({ _id: postAuthorId }).select(
                "followers"
            );

            let usersToUpdate = [...user.followers, postAuthorId];
            usersToUpdate = usersToUpdate.filter((userToUpdate) => {
                return String(userToUpdate) !== String(newLike._id);
            });

            const onlineUsersIds = Object.values(onlineUsers);
            const onlineUsersSocketIds = Object.keys(onlineUsers);

            usersToUpdate.forEach((userId) => {
                if (onlineUsersIds.includes(String(userId))) {
                    let index = onlineUsersIds.indexOf(String(userId));
                    io.to(onlineUsersSocketIds[index]).emit(
                        "likePostUpdate",
                        postId,
                        newLike,
                        isLiked
                    );
                }
            });
        }
    );

    socket.on(
        "newCommentUpdate",
        async (postId, postAuthorId, commentAuthorId, newComment) => {
            const user = await User.findOne({ _id: postAuthorId }).select(
                "followers"
            );

            let usersToUpdate = [...user.followers, postAuthorId];
            usersToUpdate = usersToUpdate.filter((userToUpdate) => {
                return String(userToUpdate) !== String(commentAuthorId);
            });

            const onlineUsersIds = Object.values(onlineUsers);
            const onlineUsersSocketIds = Object.keys(onlineUsers);

            usersToUpdate.forEach((userId) => {
                if (onlineUsersIds.includes(String(userId))) {
                    let index = onlineUsersIds.indexOf(String(userId));
                    io.to(onlineUsersSocketIds[index]).emit(
                        "newCommentUpdate",
                        postId,
                        newComment
                    );
                }
            });
        }
    );

    socket.on(
        "likePostCommentUpdate",
        async (postId, postAuthorId, commentId, newLike, isLiked) => {
            const user = await User.findOne({ _id: postAuthorId }).select(
                "followers"
            );

            let usersToUpdate = [...user.followers, postAuthorId];
            usersToUpdate = usersToUpdate.filter((userToUpdate) => {
                return String(userToUpdate) !== String(newLike._id);
            });

            const onlineUsersIds = Object.values(onlineUsers);
            const onlineUsersSocketIds = Object.keys(onlineUsers);

            usersToUpdate.forEach((userId) => {
                if (onlineUsersIds.includes(String(userId))) {
                    let index = onlineUsersIds.indexOf(String(userId));
                    io.to(onlineUsersSocketIds[index]).emit(
                        "likePostCommentUpdate",
                        postId,
                        commentId,
                        newLike,
                        isLiked
                    );
                }
            });
        }
    );

    socket.on("disconnect", () => {
        delete onlineUsers[socket.id];
        io.emit("onlineUsers", Object.values(onlineUsers));
    });
});
