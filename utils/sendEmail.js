const Mailgen = require("mailgen");
const sgMail = require("@sendgrid/mail");

const sendEmail = (name, email, resetLink) => {
    const mailGenerator = new Mailgen({
        theme: "default",
        product: {
            name: "Social Dude",
            link: process.env.CLIENT_APP_URL,
        },
    });

    const emailContent = {
        body: {
            name: name,
            intro: "You have received this email because a password reset request for your account was received.",
            action: {
                instructions: "Click the button below to reset your password:",
                button: {
                    color: "#22BC66",
                    text: "Reset your Password",
                    link: resetLink,
                },
            },
            outro: "If you did not request a password reset, no further action is required on your part.",
        },
    };

    const emailTemplate = mailGenerator.generate(emailContent);

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
        to: email,
        from: process.env.SENDER_EMAIL,
        subject: "Hello from SocialDude",
        html: emailTemplate,
    };

    sgMail
        .send(msg)
        .then((response) => console.log("Email sent..."))
        .catch((error) => {
            console.log(error.message);
            throw new Error(error);
        });
};

module.exports = sendEmail;
