import express, { Request, Response } from 'express';
const app = express();
const router = express.Router();
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
		  title: 'FusedVR NFT Authentication',
		  version: '0.3.0',
		  description: "REST API for connecting and managing play to earn apps by authenticating user wallet's via a magic link in their email. Users will be able to prove their ownership of a wallet by signing a random nonce token, which verifies that they indeed have ownership of the wallet and thus assets associated with it",
		},
		servers: [
		{
			url: process.env.HOST + (process.env.PORT ? ":" + process.env.PORT : "") + "/api",
		},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT"
				}
			}
		}
	},
	apis: ['./app/routes/fused/magiclink.js', './app/routes/fused/account.js'], // files containing annotations as above
};

const openapiSpecification = swaggerJsdoc(options);

router.use('/', swaggerUI.serve, swaggerUI.setup(openapiSpecification));

module.exports = router;