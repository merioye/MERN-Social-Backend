const Joi = require("joi");

const signupSchemaValidation = (body) => {
    const schema = Joi.object({
        name: Joi.string()
            .regex(/^[A-Za-z]{3,16}$/)
            .required(),
        email: Joi.string().email().required(),
        password: Joi.string()
            .regex(
                /^(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,20}$/
            )
            .required(),
        cpassword: Joi.string().valid(Joi.ref("password")).required().strict(),
        username: Joi.string()
            .regex(/^[A-Za-z0-9]{3,16}$/)
            .required(),
        file: Joi.object().required(),
    });

    // validating request body with the provided schema
    const result = schema.validate(body);
    const { error } = result;
    const isValid = !Boolean(error);
    return isValid;
};

const resetPasswordSchemaValidation = (body) => {
    const schema = Joi.object({
        password: Joi.string()
            .regex(
                /^(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,20}$/
            )
            .required(),
        cpassword: Joi.string().valid(Joi.ref("password")).required().strict(),
    });

    // validating request body with the provided schema
    const result = schema.validate(body);
    const { error } = result;
    const isValid = !Boolean(error);
    return isValid;
};

module.exports = { signupSchemaValidation, resetPasswordSchemaValidation };
