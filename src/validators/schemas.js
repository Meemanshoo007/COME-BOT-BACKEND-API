const Joi = require('joi');

const loginSchema = Joi.object({
    telegram_id: Joi.number().integer().positive().required(),
    secret: Joi.string().min(1).required(),
});

const configUpdateSchema = Joi.object({
    spam_limit: Joi.number().integer().min(1).max(100),
    mute_duration_minutes: Joi.number().integer().min(1).max(1440),
    maintenance_mode: Joi.boolean(),
    maintenance_message: Joi.string().min(1).max(1000),
}).min(1); // At least one field required

const spamAddSchema = Joi.object({
    keyword: Joi.string().min(1).max(255).required(),
});

const interestAddSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
});

const broadcastCreateSchema = Joi.object({
    message_text: Joi.string().min(1).max(4096).required(),
    interest_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    scheduled_time: Joi.string().isoDate().required(),
});

module.exports = {
    loginSchema,
    configUpdateSchema,
    spamAddSchema,
    interestAddSchema,
    broadcastCreateSchema,
};
