//NFT ID is not currently being used

/*
process.env.NODE_ENV = "dev";

const assert = require('assert');
const server = require('../../app/server.js');
const supertest = require('supertest');
const requestWithSupertest = supertest(server);

const Moralis = require('moralis-v1/node');
const jwt = require('jsonwebtoken');

const UserTestUtil = require('../TestResources/userUtil');

const AppController = require("../../app/controller/apps").default;
const NftController = require("../../app/controller/nfts").default;

const TEST_EMAIL = "test14689562@fa68413ke-dom1893ain.com";

describe('NFT APIs Endpoints', async function() {
	let testUser = new UserTestUtil(TEST_EMAIL, requestWithSupertest);
    before(async function() { //setup a user with a wallet
		this.timeout(20000);
		await testUser.userSignUp();
	});

	describe('Verify NFT End Point', async function() {
		var appId;
		var nftId = "1";
		var appName = "Test App";
		before(async function() { //create app for user
			const decoded = jwt.verify(testUser.token, process.env.JWT_MAIN_SECRET_KEY); //TODO determine why null
			appId = await AppController.createApp(decoded.sessionid, appName, null);

			let appQuery = new Moralis.Query("Apps");
			let app = await appQuery.get(appId);

			await NftController.createNFT(nftId, app);
		});

		describe('Verify NFT ID', async function() {
			it('Get NFT Metadata', async () => {
				let res = await requestWithSupertest
					.get('/api/nfts/meta/' + nftId);

				assert.equal(res.status, 200);
				assert.equal(res.type, "application/json");
				assert.equal(res.body.name , appName);
				assert.equal(res.body.external_url , "crypto.fusedvr.com");
			});
		});
	});

	after(async function() {
		await testUser.userDelete();

		let nftQuery = new Moralis.Query("FusedNFTS");
		nftQuery.equalTo("NftID", "1");
		var nftMap = await nftQuery.first({useMasterKey : true});
		if (nftMap) {
			await nftMap.destroy({useMasterKey : true});
		}
	});
});
*/