import express from "express";
const router = express.Router();

import Auth from "../controller/authentication";

import { check, body } from 'express-validator';
import utils from '../utilities/utils';

 /**
  * @swagger 
  * tags:
  *   name: FusedVR Auth
  *   description: APIs for Authenticating Users on the FusedVR Website
  */

/**
 * @swagger
 * /auth/getNonce:
 *   post:
 *     summary: Generate Nonce (random message) to be signed by /auth/connectWeb3 associated with the given address to prove ownership of the address
 *     tags: [FusedVR Auth]
 *     requestBody:
 *       description: Request requires the Public Key / Wallet Address requesting API authentication access for the user
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressBody'
 *     responses:
 *       200:
 *         description: Returns a random nonce to be signed by the given address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Nonce'  
 */
router.post("/getNonce", body('address').custom(utils.validAddress), utils.catchValidation,
	async function (req, res) {
	var message = await Auth.nonceRequest(req.body.address);
	res.status(200).send({nonce : message})
});

/**
 * @swagger
 * /auth/connectWeb3:
 *   post:
 *     summary: Login / Register with Signed Nonce from /auth/getNonce and email address
 *     tags: [FusedVR Auth]
 *     requestBody:
 *       description: Request includes email, public key, and signed nonce message, which together ensure the user is correctly authenticated and is eligible to use the authenticated APIs
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConnectWeb3Body'
 *     responses:
 *       200:
 *         description: Returns a JWT Token if signedNonce is verfied to be owned by the provided address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Token' 
 *       202:
 *         description: Account Registered successfully and now needs email to be verfied
 */
router.post("/connectWeb3", 
	body('email').isEmail().normalizeEmail(),
	body('address').custom(utils.validAddress),
	check('signedNonce').exists(),
	utils.catchValidation,
	async function (req , res) {
		//first attempt login
		try {
			var token = await Auth.loginWeb3(req.body.email, req.body.address , req.body.signedNonce);
			res.status(200).send({token: token});
			return;
		} catch(error) {
			console.log("Error on Connnect Web 3 Login : " + error.message);
			if (error.code != 218) { // this is indication for signup instead
				res.status(error.code).send({error : error.message});
				return;
			}
		}
		
		// if user is not registered, then this is a sign up request and we setup the user and send a verification email 
		try {
			var success = await Auth.registerWeb3(req.body.email, req.body.address, req.body.signedNonce);
			res.sendStatus(202);
			return;
		} catch(error) {
			console.log("Error on Connnect Web 3 Register : " + error.message);
			res.status(error.code).send({error : error.message});
			return;
		}
});

/**
 * @swagger
 * /auth/verifyEmail:
 *   get:
 *     summary: Verify email based on random code sent from /auth/connectWeb3
 *     tags: [FusedVR Auth]
 *     parameters:
 *      - in: path
 *        name: email
 *        description: The email of a user to be linked to their account
 *        required: true
 *        schema:
 *          $ref: '#/components/schemas/Email'
 *      - in: path
 *        name: code
 *        description: Random code sent to email from /auth/connectWeb3 on registration
 *        required: true
 *        schema:
 *          type: string
 *     responses:
 *       301:
 *         description: On success, will redirect to index page
 */
router.get("/verifyEmail/:email/:code", 
	check('email').isEmail().normalizeEmail(),
	check('code').exists(),
	utils.catchValidation,
	async function (req, res) {
	try {
		await Auth.verifyEmail(req.params?.email , req.params?.code);
		res.status(302).redirect("https://crypto.fusedvr.com");
	} catch(error) {
		res.status(error.code).send({error : error.message});
	}
});

module.exports = router;
