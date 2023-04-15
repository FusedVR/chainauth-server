process.env.NODE_ENV = "dev";

const assert = require('assert');
const server = require('../../app/server.js');
const supertest = require('supertest');
const requestWithSupertest = supertest(server);

const UserTestUtil = require('../TestResources/userUtil');

const jwt = require('jsonwebtoken');

const TEST_EMAIL = "test15654161@fa634513ke-dom1253ain.com";

const AppController = require("../../app/controller/apps").default;

describe('App Auth APIs Endpoints', async function() {
	let appId;
	let appName = "Hello App Auth";
	let testUser = new UserTestUtil(TEST_EMAIL, requestWithSupertest);

    before(async function() {
		this.timeout(30000);
		await testUser.userSignUp();

		const decoded = jwt.verify(testUser.token, process.env.JWT_MAIN_SECRET_KEY); //TODO determine why secret key null
		appId = await AppController.createApp(decoded.sessionid, appName, null);
	});

	describe('App Authentication - no email', async function() { 
		let code = "";
		let token = "";

		it('App Client Register /fused/register - non-email', async () => {
			const registerRes = await requestWithSupertest
				.post('/api/fused/register')
				.send({appId : appId, email: "123"});
				
			assert.equal(registerRes.status, 200);
			assert.equal(registerRes.type, "application/json");
			assert.equal(registerRes.body.code.length , 6);

			code = registerRes.body.code;
		});

		it('App Client Register /fused/register', async () => {
			const registerRes = await requestWithSupertest
				.post('/api/fused/register')
				.send({appId : appId});
				
			assert.equal(registerRes.status, 200);
			assert.equal(registerRes.type, "application/json");
			assert.equal(registerRes.body.code.length , 6);

			code = registerRes.body.code;
		});

		it('Get Magic Link /fused/getMagicLink', async () => {
			const registerRes = await requestWithSupertest
				.post('/api/fused/getMagicLink')
				.send({appId : appId, code : code});
				
			assert.equal(registerRes.status, 200);
			assert.equal(registerRes.type, "application/json");
			assert.ok(registerRes.body.magicLink.includes("/api/fused/link/"));
			assert.ok(registerRes.body.magicLink.includes(code));
		});

		it('Get Redirect /api/fused/link', async () => {
			const linkRes = await requestWithSupertest
				.get('/api/fused/link/' + code);
				
			assert.equal(linkRes.status, 301);
		});

		it('App Prove Ownership /fused/authorizeWallet', async () => {
			const nonceRes = await requestWithSupertest
						.post('/api/auth/getNonce')
						.send({"address": testUser.wallet.address});

			assert.equal(nonceRes.status, 200);
			assert.equal(nonceRes.type, "application/json");
			assert.ok("nonce" in nonceRes.body);

			let message = nonceRes.body["nonce"];
			let flatSig = await testUser.wallet.signMessage(message);

			const authorizeWalletRes = await requestWithSupertest
				.post('/api/fused/authorizeWallet')
				.send({"code": code, "address" : testUser.wallet.address , signedNonce : flatSig});
				
			assert.equal(authorizeWalletRes.status, 200);
			assert.equal(authorizeWalletRes.type, "application/json");
			assert.ok("token" in authorizeWalletRes.body);

			token = authorizeWalletRes.body.token;
		}).timeout(4000);

		it('2nd App Prove Ownership /fused/authorizeWallet - fail', async () => {
			const nonceRes = await requestWithSupertest
						.post('/api/auth/getNonce')
						.send({"address": testUser.wallet.address});

			assert.equal(nonceRes.status, 200);
			assert.equal(nonceRes.type, "application/json");
			assert.ok("nonce" in nonceRes.body);

			let message = nonceRes.body["nonce"];
			let flatSig = await testUser.wallet.signMessage(message);

			const authorizeWalletRes = await requestWithSupertest
				.post('/api/fused/authorizeWallet')
				.send({"code": code, "address" : testUser.wallet.address , signedNonce : flatSig});
				
			assert.equal(authorizeWalletRes.status, 400);
			assert.equal(authorizeWalletRes.type, "application/json");
			assert.ok("error" in authorizeWalletRes.body);
		}).timeout(4000);

		it('App Client Login /fused/login', async () => {
			const loginRes = await requestWithSupertest
				.post('/api/fused/login')
				.send({appId : appId, code: code});
				
			assert.equal(loginRes.status, 200);
			assert.equal(loginRes.type, "application/json");

			const oldToken = jwt.verify(token, process.env.JWT_APP_SECRET_KEY); 
			const newToken = jwt.verify(loginRes.body.token, process.env.JWT_APP_SECRET_KEY);

			assert.equal(oldToken.appId , newToken.appId);
			assert.equal(oldToken.address , newToken.address);
			assert.equal(oldToken.signature , newToken.signature);
		});

		it('App Client 2nd Login Reuse Fail /fused/login', async () => { 
			const failedLoginRes = await requestWithSupertest
				.post('/api/fused/login')
				.send({appId : appId, code: code});
				
			assert.equal(failedLoginRes.status, 400);
			assert.equal(failedLoginRes.type, "application/json");
			assert.ok("error" in failedLoginRes.body);
		});
	});

	describe('App Authentication - with email', async function() { 
		let code = "";
		let token = "";

		it('App Client Register /fused/register', async () => {
			const registerRes = await requestWithSupertest
				.post('/api/fused/register')
				.send({appId : appId, email : TEST_EMAIL});
				
			assert.equal(registerRes.status, 200);
			assert.equal(registerRes.type, "application/json");
			assert.equal(registerRes.body.code.length , 6);

			code = registerRes.body.code;
		});

		it('App Prove Ownership /fused/authorizeWallet', async () => {
			const nonceRes = await requestWithSupertest
						.post('/api/auth/getNonce')
						.send({"address": testUser.wallet.address});

			assert.equal(nonceRes.status, 200);
			assert.equal(nonceRes.type, "application/json");
			assert.ok("nonce" in nonceRes.body);

			let message = nonceRes.body["nonce"];
			let flatSig = await testUser.wallet.signMessage(message);

			const authorizeWalletRes = await requestWithSupertest
				.post('/api/fused/authorizeWallet')
				.send({"code": code, "address" : testUser.wallet.address , signedNonce : flatSig});
				
			assert.equal(authorizeWalletRes.status, 200);
			assert.equal(authorizeWalletRes.type, "application/json");
			assert.ok("token" in authorizeWalletRes.body);

			token = authorizeWalletRes.body.token;
		}).timeout(4000);

		it('App Client Login /fused/login', async () => {
			const loginRes = await requestWithSupertest
				.post('/api/fused/login')
				.send({appId : appId, code: code});
				
			assert.equal(loginRes.status, 200);
			assert.equal(loginRes.type, "application/json");

			const oldToken = jwt.verify(token, process.env.JWT_APP_SECRET_KEY); 
			const newToken = jwt.verify(loginRes.body.token, process.env.JWT_APP_SECRET_KEY);

			assert.equal(oldToken.appId , newToken.appId);
			assert.equal(oldToken.address , newToken.address);
			assert.equal(oldToken.signature , newToken.signature);
		});

		
		it('App Client 2nd Login Reuse Fail /fused/login', async () => {
			const failedLoginRes = await requestWithSupertest
				.post('/api/fused/login')
				.send({appId : appId, code: code});
				
			assert.equal(failedLoginRes.status, 400);
			assert.equal(failedLoginRes.type, "application/json");
			assert.ok("error" in failedLoginRes.body);
		});
	});

	describe('App Authenticaiton - failure', async function() { 
		it('App Auth /fused/register - fake app id', async () => {
			const failedRegisterRes = await requestWithSupertest
				.post('/api/fused/register')
				.send({appId : "FAKE ID"});
				
			assert.equal(failedRegisterRes.status, 422);
			assert.equal(failedRegisterRes.type, "application/json");
			assert.ok("errors" in failedRegisterRes.body); //plural because this is a validation error that was caught
		}); 

		it('App Auth /fused/login - fake app id & code', async () => {
			const failedLoginRes = await requestWithSupertest
				.post('/api/fused/login')
				.send({appId : "FAKE ID", code : "123456"});
				
			assert.equal(failedLoginRes.status, 422);
			assert.equal(failedLoginRes.type, "application/json");
			assert.ok("errors" in failedLoginRes.body); //plural because this is a validation error that was caught
		}); 

		it('App Auth /fused/login - fake code', async () => {
			const failedLoginRes = await requestWithSupertest
				.post('/api/fused/login')
				.send({appId : appId, code : ""});
				
			assert.equal(failedLoginRes.status, 400);
			assert.equal(failedLoginRes.type, "application/json");
			assert.ok("error" in failedLoginRes.body); //plural because this is a validation error that was caught
		}); 
	});

	after(async function() {
		const decoded = jwt.verify(testUser.token, process.env.JWT_MAIN_SECRET_KEY); //TODO determine why secret key null
		await AppController.deleteApp(decoded.sessionid, appId);

		await testUser.userDelete(); // must be last
	});
});
