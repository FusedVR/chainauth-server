const assert = require('assert');
const server = require('../../app/server.js');
const supertest = require('supertest');
const requestWithSupertest = supertest(server);

const UserTestUtil = require('../TestResources/userUtil');

const crypto = require('crypto');
const ethers = require('ethers');  

const TEST_EMAIL = "test68431658@fa68413ke-dom1893ain.com";

describe('Wallet APIs Endpoints', async function() {
	let testUser = new UserTestUtil(TEST_EMAIL, requestWithSupertest);
    before(async function() { //setup a user with a wallet
		this.timeout(20000);
		await testUser.userSignUp();
	});

	describe('POST /addresses', async function() {
		it('Verify Sign On Address Is Valid', async () => {
			let res = await requestWithSupertest
				.post('/api/addresses')
				.set("Authorization", "Bearer " + testUser.token);

			assert.equal(res.status, 200);
			assert.equal(res.type, "application/json");
			assert.ok("addresses" in res.body);
			assert.ok( res.body["addresses"].includes(testUser.wallet.address.toLowerCase()) );
		});
	});

	describe('Add and Remove Key', async function() {
		let newWallet;
		before(async function() {
			var id = crypto.randomBytes(32).toString('hex');
			privateKey = "0x" + id;
			newWallet = new ethers.Wallet(privateKey);
		});

		it('Add Key /addresses/linkKey', async () => {
			const nonceRes = await requestWithSupertest
				.post('/api/auth/getNonce')
				.send({"address": newWallet.address});
			let message = nonceRes.body["nonce"];
			let flatSig = await newWallet.signMessage(message);

			let res = await requestWithSupertest
				.post('/api/addresses/linkKey')
				.set("Authorization", "Bearer " + testUser.token)
				.send({address : newWallet.address, signedNonce : flatSig});

			assert.equal(res.status, 200);
		}).timeout(3000);

		it ('Confirm new wallet has been added')

		it('Remove Key /addresses/unlinkKey', async () => {
			let res = await requestWithSupertest
				.post('/api/addresses/unlinkKey')
				.set("Authorization", "Bearer " + testUser.token)
				.send({address : newWallet.address});

			assert.equal(res.status, 200);
		});
	});

	after(async function() {
		await testUser.userDelete();
	});


});
