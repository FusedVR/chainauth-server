const express = require('express');
const app = express();
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
		  title: 'FusedVR Test',
		  version: '0.3.0',
		  description: "A simple API for authenticating users to NFT play to earn games via e-mail",
		},
		servers: [
		{
			url: "http://localhost:3000/api", //"https://crypto-stage.fusedvr.com/api"
		},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT"
				}
			},
  			schemas : {
  				AddressBody: {
				    type: "object",
				    required: true,
				    properties: {
				   		address: { "$ref": '#/components/schemas/Address' }
				    }
				},
				Nonce: {
					type: "object",
				    properties: {
				   		nonce: { type: "string", description: "A random nonce to be signed by the input address for authentication ", example: "A random nonce to be signed by the input address for authentication" }
				    }
				},
				ConnectWeb3Body: {
				    type: "object",
				    required: true,
				    properties: {
				   		email: { "$ref": '#/components/schemas/Email' },
				   		address: { "$ref": '#/components/schemas/Address' },
				   		signedNonce: { "$ref": '#/components/schemas/SignedNonce' },
				    }
				},
				Email: {
				    type: "string", description: "The email associated with the user", example: "vasanth.mohan@fusedvr.com", format: "email"
				},
				Address: {
				    type: "string", description: "The Public Key / Wallet Address to be authenticated", example: "0x74BAA21278E661eCea04992d5e8fBE6c29cF6f64"
				},
				SignedNonce: {
				    type: "string", description: "The user's signed nonce from the /auth/getNonce API associated with the provided address", example: "Nonce signed by public key via wallet i.e. Metamask. Must start with 0x"
				},
				LinkKeyBody: {
				    type: "object",
				    required: true,
				    properties: {
				   		address: { "$ref": '#/components/schemas/Address' },
				   		signedNonce: { "$ref": '#/components/schemas/SignedNonce' }
				    }
				},
				GetAddresses: {
				    type: "object",
				    required: true,
				    properties: {
				   		addresses: { type: "array", description: "An Array of Public Addresses associated with the user", 
				   		items: { "$ref": '#/components/schemas/Address' } }
				    }
				},
				ContractAddress: {
				    type: "string", description: "Smart Contract Address - typically for an ERC 1155 or 721 token", example: "0x4d66898952d879c27bdadb5876f38e38a083eff8"
				}
  			}
		}
	},
	apis: ['./app/routes/auth.js', './app/routes/apps.js', './app/routes/keys.js', './app/routes/subs.js',
		'./app/routes/fused/magiclink.js', './app/routes/fused/account.js', './app/routes/fused/nfts.js'], // files containing annotations as above
};

const openapiSpecification = swaggerJsdoc(options);
//console.log(JSON.stringify(openapiSpecification, null, 2));

app.use('/', swaggerUI.serve, swaggerUI.setup(openapiSpecification));

app.listen(5000, () => console.log("listening on 5000"));