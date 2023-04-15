import express from "express";
import { check, body } from 'express-validator';
const router = express.Router();

import utils from '../utilities/utils';
import Addresses from "../controller/addresses";

 /**
  * @swagger 
  * tags:
  *   name: Wallet Management
  *   description: APIs for managing public keys / wallet addresses that are associated with a user
  */

/**
 * @swagger
 * /addresses:
 *   post:
 *     summary: Get all public keys / addresses associated with an authenticated user's account
 *     tags: [Wallet Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of wallet addresses associated with the user's account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetAddresses'  
 */
router.post("/", utils.catchValidation, async function (req : any, res ) {
    try {
        var keys = await Addresses.getAddresses(req.user.sessionid);
        res.status(200).send({addresses : keys});
    } catch(error) {
        console.log("Addresses Error : " + error.message);
        res.status(error.code).send({error : error.message});
    }
});

/**
 * @swagger
 * /addresses/linkKey:
 *   post:
 *     summary: Links a new public key / wallet address to the user's account
 *     tags: [Wallet Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Add a new authenticated key to the user's account
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LinkKeyBody'
 *     responses:
 *       200:
 *         description: Key successfully added
 */
router.post("/linkKey", 
    body('address').custom(utils.validAddress),
    check('signedNonce').exists(),
    utils.catchValidation,
    async function (req : any, res) {
    try {
        var result : boolean = await Addresses.registerKey(req.user.sessionid, req.body.address , req.body.signedNonce);
        res.sendStatus(200);
    } catch(error) {
        res.status(error.code).send({error : error.message});
    }
});

/**
 * @swagger
 * /addresses/unlinkKey:
 *   post:
 *     summary: Unlinks an existing authenticated public key / wallet address from the user's account
 *     tags: [Wallet Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Delete an authenticated key from the user's account
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressBody'
 *     responses:
 *       200:
 *         description: Key successfully deleted
 */
router.post("/unlinkKey", body('address').custom(utils.validAddress), utils.catchValidation,
    async function (req : any, res) {
    try {
        var result : boolean = await Addresses.deleteAddresses(req.user.sessionid, req.body.address);
        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(error.code).send({error : error.message});
    }
});

module.exports = router;
