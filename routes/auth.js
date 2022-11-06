const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4 } = require("uuid");
const upload = require("../middlewares/upload");
const auth = require("../middlewares/auth");
const cloudinary = require("../utils/cloudinary");
const sendEmail = require("../utils/sendEmail");
const {
    signupSchemaValidation,
    resetPasswordSchemaValidation,
} = require("../validationSchemas");
const User = require("../models/user");
const ResetPassword = require("../models/resetPassword");

// Checking username available or not
router.post("/username", async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user) {
            return res.status(406).json({
                message: "Username not available",
            });
        }
        res.status(200).json({
            message: "Username available",
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.post("/signup", upload.single("profileImage"), async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            cpassword,
            username,
            bio,
            facebook,
            instagram,
            twitter,
        } = req.body;

        // validating request
        const isValid = signupSchemaValidation({
            name,
            email,
            password,
            cpassword,
            username,
            file: req.file,
        });
        if (!isValid) {
            return res.status(400).json({
                message: "Please fill out the required fields",
            });
        }

        const user = await User.findOne({ email: email });
        if (user) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        const result = await cloudinary.uploader.upload(req.file.path);

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            profileImage: result.secure_url,
            cloudinary_id: result.public_id,
            name,
            email,
            password: hashedPassword,
            username,
            bio,
            socialLinks: { facebook, instagram, twitter },
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully...",
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        const user = await User.findOne({ email: email }).select("+password");
        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        const isMatched = await bcrypt.compare(password, user.password);
        if (!isMatched) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        const accessToken = await jwt.sign(
            { id: user._id },
            process.env.TOKEN_SECRET
        );
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            expires: new Date(Date.now() + 86400000),
        });

        res.status(200).json({
            message: "Login successful",
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.get("/logout", auth, (req, res) => {
    res.cookie("accessToken", null, {
        httpOnly: true,
        expires: new Date(Date.now()),
    });

    res.status(200).json({
        message: "Logged out",
    });
});

router.post("/forgotpassword", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                message: "Email is required",
            });
        }

        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({
                message: "User does not exist with the provided email",
            });
        }

        const token = v4().toString().replace(/-/g, "");

        await ResetPassword.updateOne(
            { user: user._id },
            { $set: { token: token, user: user._id } },
            { upsert: true }
        );

        const resetLink = `${process.env.CLIENT_APP_URL}/resetpassword/${token}`;
        sendEmail(user.name, user.email, resetLink);

        res.status(200).json({
            message: "Check your email address for password reset link!",
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.post("/resetpassword/:token", async (req, res) => {
    try {
        const { password } = req.body;
        const { token } = req.params;
        if (!token) {
            return res.status(403).json({
                message: "You are not eligible for making this request",
            });
        }

        // validating request
        const isValid = resetPasswordSchemaValidation(req.body);
        if (!isValid) {
            return res.status(400).json({
                message: "Please match the fields crieteria",
            });
        }

        const isValidToken = await ResetPassword.findOne({ token: token });
        if (!isValidToken) {
            return res.status(404).json({
                message:
                    "It seems that the reset password link has been expired",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.findByIdAndUpdate(
            { _id: isValidToken.user },
            { $set: { password: hashedPassword } }
        );

        await ResetPassword.findByIdAndDelete({ _id: isValidToken._id });

        res.status(200).json({
            message: "Password Updated successfully",
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

router.get("/authenticate", auth, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.id }).select(
            "-email -password -cloudinary_id"
        );
        res.status(200).json({
            user: user,
        });
    } catch (e) {
        res.status(500).json({
            message: "Some problem occurred",
        });
    }
});

module.exports = router;
