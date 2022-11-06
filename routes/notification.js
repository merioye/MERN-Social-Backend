const router = require("express").Router();
const Notification = require("../models/notification");
const auth = require("../middlewares/auth");

router.post("/notifications", auth, async (req, res) => {
    try {
        const newNotification = new Notification(req.body);
        const savedNotification = await newNotification.save();

        res.status(201).json({
            savedNotification: savedNotification,
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
        console.log(e);
    }
});

// Get all notification of particular user(in the form of pagination)
router.get("/notifications", auth, async (req, res) => {
    try {
        const { pageNo, moreNotificationsToSkip, type } = req.query;

        let notifications;
        if (type === "other") {
            let skips;
            if (Number(pageNo) === 1) {
                skips = 0 + Number(moreNotificationsToSkip);
            } else {
                skips = (pageNo - 1) * 10 + Number(moreNotificationsToSkip);
            }

            notifications = await Notification.find({
                $and: [
                    { notifiedUser: req.id },
                    { notificationType: { $ne: "message" } },
                ],
            })
                .skip(skips)
                .limit(10)
                .sort({ createdAt: -1 });
        } else if (type === "message") {
            notifications = await Notification.find({
                $and: [
                    { messageNotificationReceivers: { $in: req.id } },
                    { notificationType: "message" },
                    { isNotificationViewed: false },
                ],
            });
        }

        res.status(200).json({
            notifications: notifications,
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
        console.log(e);
    }
});

// Get latest(one) notification of particular user
router.get("/notifications/:userId", auth, async (req, res) => {
    try {
        // userId is the id of the user of whom lastest(one) notification is to find
        const { userId } = req.params;
        const { type } = req.query;

        let notification;
        if (type === "other") {
            notification = await Notification.findOne({
                notifiedUser: userId,
            }).sort({ createdAt: -1 });
        } else if (type === "message") {
            notification = await Notification.findOne({
                $and: [
                    { messageNotificationReceivers: { $in: userId } },
                    { notificationType: "message" },
                ],
            }).sort({ createdAt: -1 });
        }

        res.status(200).json({
            notification: notification,
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
        console.log(e);
    }
});

router.put("/notifications", auth, async (req, res) => {
    try {
        const { type } = req.query;

        let lastNotification;
        if (type === "other") {
            lastNotification = await Notification.findOne({
                $and: [
                    { notifiedUser: req.id },
                    { notificationType: { $ne: "message" } },
                ],
            }).sort({ createdAt: -1 });
        } else if (type === "message") {
            lastNotification = await Notification.findOne({
                $and: [
                    { messageNotificationReceivers: { $in: req.id } },
                    { notificationType: "message" },
                ],
            }).sort({ createdAt: -1 });
        }

        if (lastNotification) {
            await Notification.findByIdAndUpdate(
                { _id: lastNotification._id },
                { isNotificationOpened: true },
                { new: true }
            );
        }

        res.status(200).json({
            message: "Successfull",
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
        console.log(e);
    }
});

router.put("/notifications/:notificationId", auth, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { type } = req.query;

        if (type === "other") {
            await Notification.findByIdAndUpdate(
                { _id: notificationId },
                { isNotificationViewed: true }
            );

            res.status(200).json({
                message: "Successful",
            });
        } else if (type === "message") {
            await Notification.updateMany(
                {
                    $and: [
                        { notificationChatId: notificationId },
                        { messageNotificationReceivers: { $in: req.id } },
                    ],
                },
                { $pull: { messageNotificationReceivers: req.id } }
            );

            res.status(200).json({
                message: "Successful",
            });
        }
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
        console.log(e);
    }
});

router.delete("/notifications/:notificationId", async (req, res) => {
    try {
        const { notificationId } = req.params;

        await Notification.findByIdAndDelete({ _id: notificationId });

        res.status(200).json({
            message: "Notification deleted successfully",
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
        console.log(e);
    }
});

module.exports = router;
