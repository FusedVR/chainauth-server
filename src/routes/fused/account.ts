import Moralis from 'moralis-v1/node';
import express from "express";
const router = express.Router();

import { body } from 'express-validator';
import utils from '../../utilities/utils';

 /**
  * @swagger 
  * tags:
  *   name: Account Information
  *   description: APIs for users authenticated by fused/login to view balances for the wallet
  */

 /**
 * @swagger
 * components:
 *   schemas:
 *     Chain: 
 *	     type: string
 *	     description: Which Blockchain does this contract live on
 *	     example: i.e. eth, polygon, bsc, ropsten, mumbai
 *	     enum: [eth, ropsten, rinkeby, goerli, polygon, mumbai, bsc,  bsc testnet]
 *     Balance: 
 *	     type: integer
 *	     description: The Native Balance from the given blockchain for the user
 *	     example: 1000000000000
 *     ChainBody: 
 *       type: object
 *       properties:
 *         chain:
 *           $ref : '#/components/schemas/Chain'
 *     AccountResponse: 
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *           description: The address of the authenticated player
 *           example: 0x74BAA21278E661eCea04992d5e8fBE6c29cF6f64
 *     BalanceResponse: 
 *       type: object
 *       properties:
 *         balance:
 *           $ref : '#/components/schemas/Balance'
 *     ERC20Response:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           token_address:
 *             type: string
 *             description: The address of the erc-20 token smart contract
 *             example: 0x466dd1e48570faa2e7f69b75139813e4f8ef75c2
 *           name:
 *             type: string
 *             description: The name of the erc-20 token smart contract
 *             example: Circle USDC
 *           symbol:
 *             type: string
 *             description: The symbol of the erc-20 token smart contract
 *             example: USDC
 *           logo:
 *             type: string
 *             description: The logo URL of the erc-20 token smart contract
 *             example: ipfs://logo-url.png
 *           thumbnail:
 *             type: string
 *             description: The thumbnail logo URL of the erc-20 token smart contract
 *             example: ipfs://thumbnail-logo-url.png
 *           decimals:
 *             type: number
 *             description: The number of decimals supported by the erc-20 token smart contract
 *             example: 6
 *           balance:
 *             type: string
 *             description: The total balanced owned by the player of the erc-20 token smart contract
 *             example: 101
 *     NFTResponse:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           token_address:
 *             type: string
 *             description: The address of the NFT token smart contract
 *             example: 0x466dd1e48570faa2e7f69b75139813e4f8ef75c2
 *           token_id:
 *             type: string
 *             description: The id of the token on the smart contract
 *             example: token1
 *           owner_of:
 *             type: string
 *             description: The owner of the NFT
 *             example: 0x74BAA21278E661eCea04992d5e8fBE6c29cF6f64
 *           block_number:
 *             type: string
 *             description: The block number at which point the latest owner obtained the NFT
 *             example: 27529244
 *           block_number_minted:
 *             type: string
 *             description: The block number at which point the NFT was minted
 *             example: 22171688
 *           amount:
 *             type: string
 *             description: The total supply for the given NFT (1 for ERC-721 NFTs and potentially more than 1 for ERC-1155)
 *             example: 1
 *           contract_type:
 *             type: string
 *             description: The type of NFT smart contract (721 or 1155)
 *             example: ERC1155
 *           name:
 *             type: string
 *             description: The name of the NFT token smart contract
 *             example: Axie
 *           symbol:
 *             type: string
 *             description: The symbol of the NFT token smart contract
 *             example: AXS
 *           token_uri:
 *             type: string
 *             description: The uri address that points to the metadata associated with the NFT
 *             example: https://raw.githubusercontent.com/FusedVR/nft.games/master/1/meta.json
 *           metadata:
 *             type: string
 *             description: The metadata associated with the NFT that is stored at the location of token_uri
 *             example: {\n  \"name\": \"FusedVR Token\",\n  \"description\": \"This token is an example ERC-1155 asset that can be used to trigger streaming with FusedVR Render Streaming. In other words, think of this as token representation of purchasing a game.\",\n  \"image\": \"https://raw.githubusercontent.com/FusedVR/nft.games/master/1/FusedVR.png\",\n  \"external_url\": \"https://fusedvr.com/rendering\"\n}
 */


/**
 * @swagger
 * /account:
 *   post:
 *     summary: Get the Wallet Address of the User Authenticated to your App
 *     tags: [Account Information]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the address of the user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountResponse'  
 */
router.post("/", 
	async function (req : any, res) {
	try {
		res.status(200).send({address : req.user.address}); // just return address from JWT token
	} catch(error) {
		console.log(error);
		res.status(error.code).send({error : error.message})
	}
});

/**
 * @swagger
 * /account/balance:
 *   post:
 *     summary: Get Balance associated with the User on the given chain
 *     tags: [Account Information]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Specify chain to query against
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChainBody'
 *     responses:
 *       200:
 *         description: Returns the native balance of the user in the native currency i.e. Wei for Ethereum
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BalanceResponse'  
 */
router.post("/balance", 
	body('chain').custom(utils.validChain), utils.catchValidation,
	async function (req : any, res) {
	try {
		const options : any = { address: req.user.address, chain: utils.convertChain( req.body.chain ) };
		res.status(200).send(await Moralis.Web3API.account.getNativeBalance(options))
	} catch(error) {
		console.log(error);
		res.status(error.code).send({error : error.message})
	}
});

/**
 * @swagger
 * /account/erc20:
 *   post:
 *     summary: Get Balance for the authenticated user based on the erc20 token address on the given chain
 *     tags: [Account Information]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Specify chain & token to query against
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChainBody'
 *     responses:
 *       200:
 *         description: Returns the balance of the user for the token and token information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ERC20Response'  
 */
router.post("/erc20", 
	body('chain').custom(utils.validChain), utils.catchValidation,
	async function (req : any, res) {
	try {
		const options : any = { address: req.user.address, chain: utils.convertChain( req.body.chain ) };
		let results = await Moralis.Web3API.account.getTokenBalances(options);
		res.status(200).send(results);
	} catch(error) {
		console.log(error);
		res.status(error.code).send({error : error.message});
	}
});

/**
 * @swagger
 * /account/nfts:
 *   post:
 *     summary: Get NFT addresses for the authenticated user based on the given chain
 *     tags: [Account Information]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Specify chain to query against
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChainBody'
 *     responses:
 *       200:
 *         description: Returns the list of nfts the user holds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NFTResponse'  
 */
router.post("/nfts", 
	body('chain').custom(utils.validChain), utils.catchValidation,
	async function (req : any, res) {
	try {
		const options : any = { address: req.user.address, chain: utils.convertChain( req.body.chain ) };
		let results = await Moralis.Web3API.account.getNFTs(options)
		res.status(200).send(results["result"]);
	} catch(error) {
		console.log(error);
		res.status(error.code).send({error : error.message})
	}
});

module.exports = router;
