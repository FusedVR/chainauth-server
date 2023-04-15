import express, { Response, NextFunction } from "express";
const router = express.Router();
import jwt from 'jsonwebtoken';

import AppAuth from "../../controller/appAuth";

import { check, body } from 'express-validator';
import utils from '../../utilities/utils';

import Apps from "../../controller/apps";

 /**
  * @swagger 
  * tags:
  *   name: Magic Fused Link
  *   description: APIs for Authenticating Player's Wallets via a link sent to their email. Player's will be able to sign a random message to prove their identity
  */

 /**
 * @swagger
 * components:
 *   schemas:
 *     Email:
 *       type: string
 *       description: The email associated with the user
 *       example: noreply@fusedvr.com
 *       format: email
 *     AppId:
 *       type: string
 *       description: App Id created by Developers for their game from /apps/create
 *       example: App ID from /apps/create
 *     Code:
 *       type: string
 *       description: A six digit code that is used to associate a client to their wallet
 *       example: 123456
 *     AppRegisterBody:
 *       type: object
 *       required: [ "appId" ]
 *       properties:
 *         appId:
 *           $ref: '#/components/schemas/AppId'
 *         email:
 *           $ref: '#/components/schemas/Email'
 *     AppRegisterResponse:
 *       type: object
 *       required: true
 *       properties:
 *         code:
 *           $ref: '#/components/schemas/Code'
 *     AppLoginBody:
 *       type: object
 *       required: true
 *       properties:
 *         code:
 *           $ref: '#/components/schemas/Code'
 *         appId:
 *           $ref: '#/components/schemas/AppId'
 *     Token:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: A JWT Token authorizing API usage
 *           example: JWT Token
 *     MagicLinkRequest:
 *       type: object
 *       properties:
 *         code:
 *           $ref: '#/components/schemas/Code'
 *         appId:
 *           $ref: '#/components/schemas/AppId'
 *     MagicLinkResponse:
 *       type: object
 *       properties:
 *         magicLink:
 *           type: string
 *           description: The verification magic link that is inlcuded in the email
 *           example: https://crypto.fusedvr.com/api/fused/link/email/jwt/encodedUri
 */

/**
 * @swagger
 * /fused/register:
 *   post:
 *     summary: Registers the client to your application and returns a code, which can be manually input by the user to authenticate their wallet. You can also register an e-mail address, which will be send to the client and allow authentication. The codes are only valid for 10 minutes.
 *     tags: [Magic Fused Link]
 *     requestBody:
 *       description: Request includes email and developer's application id
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppRegisterBody'
 *     responses:
 *       200:
 *         description: Returns the code for the client to use to login and authenticate their wallet. Codes are valid for 10 minutes.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppRegisterResponse' 
 */
router.post("/register", 
	body('appId').custom(Apps.getMoralisAppValidation),
	utils.catchValidation,
	async function (req, res) {
	try { //requires app id
		incrementEmailAPIs(req.body.appId); 	
		var code = await AppAuth.appRegisterClient( req.body.appId, req.body.email );
		res.status(200).send({code : code})
	} catch(error) {
		console.log(error);
		res.status(error.code).send({error : error.message})
	}
});

/**
 * @swagger
 * /fused/login:
 *   post:
 *     summary: Logs in client based on registration code and returns back a JWT after client authenticates their wallet. Requires Long Polling to wait for user to authenticate
 *     tags: [Magic Fused Link]
 *     requestBody:
 *       description: Request includes email and developer's application id
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppLoginBody'
 *     responses:
 *       200:
 *         description: Returns a JWT Token once user authenticates from email, which can be used for any of the account APIs.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Token' 
 */
 router.post("/login", 
 	body('appId').custom(Apps.getMoralisAppValidation),
	check('code').exists(),
	utils.catchValidation,
	async function (req, res) {
	try { //requires app id
		incrementEmailAPIs(req.body.appId); 	
		var token = await AppAuth.appLogin(req.body.appId, req.body.code);
		res.status(200).send({token : token})
	} catch(error) {
		console.log(error);
		res.status(error.code).send({error : error.message})
	}
});

/**
FOR NOW HIDING authorize Wallet API - we want to add in the future to the API docs we can do so
THIS API is intended to be called by the client with the email verification code and a signed message from the client
 */
 router.post("/authorizeWallet",
	body('address').custom(utils.validAddress),
	check('signedNonce').exists(),
	check('code').exists(),
	utils.catchValidation,
	async function (req : any, res) {
		try {
			var token = await AppAuth.appAuthorize(req.body.address, req.body.signedNonce, req.body.code);
			res.status(200).send({token: token});
		} catch(error) {
			console.log(error);
			res.status(error.code).send({error : error.message});
		}
});

/**
 * @swagger
 * /fused/getMagicLink:
 *   post:
 *     summary: This will return the magic link that is included in the email. You may display this magic link within your game to redirect to a user's wallet. 
 *     tags: [Magic Fused Link]
 *     requestBody:
 *       description: Request includes email and app id that were used for the login function call. App Id must match the one used in login
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MagicLinkRequest'
 *     responses:
 *       200:
 *         description: Returns the URL, which will redirect a user to their wallet depending on the platform (Metamask wallet for iOS / Android or Browser for Desktop). 
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MagicLinkResponse' 
 */
 router.post("/getMagicLink", 
	check('code').exists(), 
	body('appId').custom(Apps.getMoralisAppValidation),
	utils.catchValidation,
	async function (req, res) {
		//requires app id
		try {
			var verifyUrl = await AppAuth.getMagicLink(req.body.code, req.body.appId);
			res.status(200).send({magicLink : verifyUrl})
		} catch(error) {
			res.status(error.code).send({error : error.message})
		}
});

/**
 * @swagger
 * /fused/link/{code}:
 *   get:
 *     summary: Enables users to authenticate from a mobile or browser based wallet through their email address.
 *     tags: [Magic Fused Link]
 *     parameters:
 *      - in: path
 *        name: code
 *        description: The code returned from registering the client to your application
 *        required: true
 *        schema:
 *          type: string
 *     responses:
 *       301:
 *         description: On success, will redirect to device specific wallet. 
 */
router.get("/link/:code", 
	check('code').exists(),
	utils.catchValidation,
	async function (req, res) {
		res.redirect(301, "https://link.fusedvr.com/?code=" + req.params?.code); //TODO consider moving to env file
});

async function incrementEmailAPIs (appId : string) : Promise <null> {
	try {
		await Apps.incrementEmail(appId);
	} catch (err) {
		console.log("From Increment App Email : " + err.message);
		let error :any = new Error("Max E-Mail Limit Reached for " + appId); error.code = 400; throw error;
	}   

	return null;
}

module.exports = router;
