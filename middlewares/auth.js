const jwt = require("jsonwebtoken");

const auth = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;
        if (!accessToken) {
            return res.status(401).json({
                message: "User is not authenticated",
            });
        }

        const isValid = await jwt.verify(accessToken, process.env.TOKEN_SECRET);

        req.id = isValid.id;
        next();
    } catch (e) {
        return res.status(401).json({
            message: "User is not authenticated",
        });
    }
};

module.exports = auth;
