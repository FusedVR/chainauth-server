import express, { Response, NextFunction } from "express";
const router = express.Router();

import { check } from 'express-validator';
import utils from '../../utilities/utils';

import NFTs from "../../controller/nfts";

 /**
  * @swagger 
  * tags:
  *   name: NFT Metadata
  *   description: JSON Metadata APIs for Paid NFTs on the Platform
  */

 /**
 * @swagger
 * components:
 *   schemas:
 *     NFTID:
 *       type: string
 *       description: The NFT ID for a FusedVR NFT
 *       example: 1
 *       format: string
 */

/**
 * @swagger
 * /nfts/meta/{id}:
 *   get:
 *     summary: Metadata associated with given FusedVR NFT
 *     tags: [NFT Metadata]
 *     parameters:
 *      - in: path
 *        name: id
 *        description: The id for the NFT
 *        required: true
 *        schema:
 *          $ref: '#/components/schemas/NFTID'
 *     responses:
 *       200:
 *         description: JSON Meta Data in the Opensea Metadata JSON Standard. 
 */
router.get("/meta/:id", 
	check('id').exists(),
	utils.catchValidation,
	async function (req, res) {
		try {
			var metaData = await NFTs.getNFT(req.params?.id);
			res.status(200).send(metaData)
		} catch(error) {
			res.status(error.code).send({error : error.message})
		}
});

module.exports = router;
