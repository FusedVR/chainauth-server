const assert = require('assert');
const server = require('../../app/server.js');
const supertest = require('supertest');
const requestWithSupertest = supertest(server);

const Moralis = require('moralis-v1/node');
const crypto = require('crypto');
const ethers = require('ethers');  

const TEST_EMAIL = "test781658161@fa68413ke-dom1893ain.com";

describe('Auth APIs Endpoints', async function() {
	var wallet;
    before(function() {
		var id = crypto.randomBytes(32).toString('hex');
		let privateKey = "0x" + id;

		wallet = new ethers.Wallet(privateKey);
	});

	describe('POST /auth/getNonce', async function() {
		it('with Valid Address', async () => {
			const res = await requestWithSupertest
						.post('/api/auth/getNonce')
						.send({"address": wallet.address});
				
			assert.equal(res.status, 200);
			assert.equal(res.type, "application/json");
			assert.ok("nonce" in res.body);
		});

		it('with no Body', async () => {
			const res = await requestWithSupertest
						.post('/api/auth/getNonce')
						.send({});
				
			assert.equal(res.status, 422);
			assert.equal(res.type, "application/json");
			assert.ok(!("nonce" in res.body));
		});
	});

	describe('New User Authenticaiton', async function() {
		it('New User Test /auth/connectWeb3', async () => {
			const nonceRes = await requestWithSupertest
				.post('/api/auth/getNonce')
				.send({"address": wallet.address});
			let message = nonceRes.body["nonce"];
			let flatSig = await wallet.signMessage(message);

			const res = await requestWithSupertest
						.post('/api/auth/connectWeb3')
						.send({"email": TEST_EMAIL, "address" : wallet.address , signedNonce : flatSig});
				
			assert.equal(res.status, 202);
		}).timeout(15000); //requires creating a fake email for testing
		
		it('Verify New User Code /auth/verifyEmail', async () => {
			let userQuery = new Moralis.Query(Moralis.User);
			userQuery.equalTo("email", TEST_EMAIL);
			var user = await userQuery.first({useMasterKey : true});

			const res = await requestWithSupertest
						.get('/api/auth/verifyEmail/' + TEST_EMAIL + "/" + user.get("emailcode"));
				
			assert.equal(res.status, 302); //succesful redirect obtained
		}).timeout(5000);

		it('Verified User Test /auth/connectWeb3', async () => {
			const nonceRes = await requestWithSupertest
				.post('/api/auth/getNonce')
				.send({"address": wallet.address});
			let message = nonceRes.body["nonce"];
			let flatSig = await wallet.signMessage(message);

			const res = await requestWithSupertest
						.post('/api/auth/connectWeb3')
						.send({"email": TEST_EMAIL, "address" : wallet.address , signedNonce : flatSig});
				
			assert.equal(res.status, 200);
			assert.equal(res.type, "application/json");
			assert.ok("token" in res.body);
		}).timeout(5000); //requires creating a fake email for testing

		after(async function() {
			let userQuery = new Moralis.Query(Moralis.User);
			userQuery.equalTo("email", TEST_EMAIL);
			var user = await userQuery.first({useMasterKey : true});
			if (user != null) {
				await user.destroy({useMasterKey : true});
			}
		});
	});
});
