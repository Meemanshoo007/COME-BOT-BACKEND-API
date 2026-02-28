const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'COME Bot Admin API',
            version: '1.0.0',
            description: 'API Documentation for the COME Bot Administration Panel',
            contact: {
                name: 'Developer Support',
            },
        },
        servers: [
            {
                url: '/api',
                description: 'Vercel / Production Server',
            },
            {
                url: 'http://localhost:3000/api',
                description: 'Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);
module.exports = specs;
