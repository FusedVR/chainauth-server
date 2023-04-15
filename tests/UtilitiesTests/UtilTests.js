var assert = require('assert');

const utils = require("../../app/utilities/utils").default;

const jwt = require('jsonwebtoken');

describe('Utility Tests', function() {
	describe('Utilities - verifyMessage',  function() {

    	it('Valid Verification of Public Key', async function() {
    		let public_key = "0x74BAA21278E661eCea04992d5e8fBE6c29cF6f64";
    		let signed_message = "0x4033422781e2d44713c2dfdc6f8c5ecc92f8530bea27608e0723bd284d4132f3382b7a1d2efff45ce4a7de5677722bbbe4978bbcfa2c88aed36180e7729a59a91c";
    		let original = "eab4209e4759188d734b6495059c9862051b1c9c";
    		let verified = utils.verifyMessage(public_key , signed_message, original);
      		assert.ok(verified);
    	});

    	it('Invalid Original Message', async function() {
    		let public_key = "0x74BAA21278E661eCea04992d5e8fBE6c29cF6f64";
    		let signed_message = "0x4033422781e2d44713c2dfdc6f8c5ecc92f8530bea27608e0723bd284d4132f3382b7a1d2efff45ce4a7de5677722bbbe4978bbcfa2c88aed36180e7729a59a91c";
    		let original = "dummy";
    		let verified = utils.verifyMessage(public_key , signed_message, original);
      		assert.ok(!verified);
    	});
  	});

	describe('Utilities - verifySession',  function() {
    	it('Valid JWT Token Signature', async function() {
			process.env.JWT_MAIN_SECRET_KEY = "Unit Testing Key";

			let validJWT = jwt.sign({ test : "hello world"}, process.env.JWT_MAIN_SECRET_KEY)
			let token = { token : validJWT };
			var result = false;
			let next = function() { result = true; };
    		utils.verifySession(token , {}, next);

      		assert.ok(result);
    	});

		it('Invalid JWT Token', async function() {
    		let token = { token : "Bad Token" };
			let res = { status : function() { return {send : function() { return true; } } }};
    		let result = utils.verifySession(token , res, null);
      		assert.ok(result != null);
    	});

  	});

	describe('Utilities - verifyAppSession',  function() {

    	it('Valid JWT Token Signature', async function() {
			process.env.JWT_APP_SECRET_KEY = "Unit Testing Key";

			let validJWT = jwt.sign({ test : "hello world"}, process.env.JWT_MAIN_SECRET_KEY)
			let token = { token : validJWT };
			var result = false;
			let next = function() { result = true; };
    		utils.verifyAppSession(token , {}, next);

      		assert.ok(result);
    	});

		it('Invalid JWT Token', async function() {
			process.env.JWT_APP_SECRET_KEY = "Unit Testing Key";
    		let token = { token : "Bad Token" };
			let res = { status : function() { return {send : function() { return true; } } }};
    		let result = utils.verifyAppSession(token , res, null);
      		assert.ok(result != null);
    	});
  	});  

	  
	describe('Utilities - validAddress',  function() {

    	it('Valid Ethereum Address', async function() {
			let public_key = "0x74BAA21278E661eCea04992d5e8fBE6c29cF6f64";
      		assert.ok(utils.validAddress(public_key));
    	});

		it('Invalid Ethereum Address', async function() {
			let public_key = "Random Key";
      		assert.ok(!utils.validAddress(public_key));
    	});
  	});  

	describe('Utilities - validContract',  function() {

    	it('Valid Ethereum Address', async function() {
			let public_key = "0x74BAA21278E661eCea04992d5e8fBE6c29cF6f64";
      		assert.ok(utils.validContract(public_key));
    	});

		it('Invalid Ethereum Address', async function() {
			let public_key = "Random Key";
      		assert.ok(!utils.validContract(public_key));
    	});
  	});

	describe('Utilities - validChain',  function() {

    	it('Valid Supported Chains', async function() {
			let chains = [ 'eth' , '0x1' , 'goerli' , '0x5', 'sepolia' , '0xaa36a7', 'polygon' , '0x89', 'mumbai' , '0x13881',
			'bsc' , '0x38', 'bsc testnet' , '0x61', 'avalanche' , '0xa86a', 'avalanche testnet' , '0xa869', 'fantom' , '0xfa',
			'cronos' , '0x19', 'cronos testnet' , '0x152', 'arbitrum' , '0xa4b1' ];
			for (let id in chains) {
				assert.ok(utils.validChain(chains[id]));
			}
    	});

		it('Is Sol a Supported Chain', async function() {
			assert.ok(!utils.validChain("sol"));
    	});
  	});

	describe('Utilities - convertChain',  function() {

    	it('Convert Chains Supported Chains', async function() {
			let chains = { 'eth' : '0x1' , 'goerli' : '0x5', 'sepolia' : '0xaa36a7', 'polygon' : '0x89', 'mumbai' : '0x13881',
					'bsc' : '0x38', 'bsc testnet' : '0x61', 'avalanche' : '0xa86a', 'avalanche testnet' : '0xa869', 'fantom' : '0xfa',
					'cronos' : '0x19', 'cronos testnet' : '0x152', 'arbitrum' : '0xa4b1'};

			for (let id in chains) {
				assert.ok(utils.convertChain(id) == chains[id]);
			}
    	});

  	});


	describe('Utilities - random',  function() {

    	it('uuidv4 Length Check', async function() {
			assert.equal(utils.uuidv4().length, 36);
    	});

		it('random range test', async function() {
			assert.equal((utils.random(0, 9) + "").length, 1);
			assert.equal((utils.random(0, 9) + "").length, 1);
			assert.equal((utils.random(0, 9) + "").length, 1);
			assert.equal((utils.random(0, 9) + "").length, 1);
    	});
  	});  
});