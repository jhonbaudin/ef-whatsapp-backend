import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "EF Whatsapp API Documentation",
      version: "2.1.2",
      description: "API Documentation for EF Whatsapp",
    },
    components: {
      securitySchemes: {
        JWT: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "JWT authorization header",
        },
        APIKeyHeader: {
          type: "apiKey",
          in: "header",
          name: "x-ef-Perfumes",
          description: "Custom header for front-end validation",
        },
      },
    },
    security: [
      {
        JWT: [],
        APIKeyHeader: [],
      },
    ],
  },
  apis: ["routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
export default swaggerSpec;
