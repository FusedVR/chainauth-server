process.env.NODE_ENV = "dev";
const assert = require('assert');
const server = require('../../app/server.js');
const supertest = require('supertest');

const requestWithSupertest = supertest(server);

const jwtLogin = require("../../app/controller/jwt").default;
const Addresses = require("../../app/controller/addresses").default;
const UserTestUtil = require('../TestResources/userUtil');

const jwt = require('jsonwebtoken');

const TEST_EMAIL = "test26177@fa68413ke-dom1893ain.com";

describe('JWT Controller Tests', function() {
	let testUser = new UserTestUtil(TEST_EMAIL, requestWithSupertest);
    before(async function() {
		this.timeout(20000);
		await testUser.userSignUp();
	});

	describe('JWT - getAppLoginToken',  function() { 
    	it('Valid JWT Token Signature', async function() { 
			let appId = "FakeAppId"; //not validated by this function
			let token = await jwtLogin.getAppLoginToken(appId, testUser.wallet.address);
			let decoded = jwt.verify(token, process.env.JWT_APP_SECRET_KEY);

			assert.equal(decoded["appId"], appId); 
			assert.equal(decoded["address"].toLowerCase(), testUser.wallet.address.toLowerCase());
			assert.equal(decoded["signature"].toLowerCase(), testUser.signedMessage.toLowerCase()); //only works if called immediataly after BEFORE
    	});

		it('Invalid JWT Token Signature');
  	});

	describe('JWT - getLoginToken',  function() {
    	it('Test Valid Login Token - No AppId', async function() {
			await testUser.setMessage();
			let moralisAddress = await Addresses.getEthAddressDB(testUser.wallet.address);
			let token = await jwtLogin.getLoginToken(testUser.user, moralisAddress, testUser.signedMessage);
			let decoded = jwt.verify(token, process.env.JWT_MAIN_SECRET_KEY);

			assert.ok("sessionid" in decoded);
			assert.ok(!("appId" in decoded)); //because not specified in login
			assert.equal(decoded["address"].toLowerCase(), testUser.wallet.address.toLowerCase());
			assert.equal(decoded["signature"].toLowerCase(), testUser.signedMessage.toLowerCase());
		});

		it('Test Invalid Login Token', async function() {
			let moralisAddress = await Addresses.getEthAddressDB(testUser.wallet.address);
			try {
				let token = await jwtLogin.getLoginToken(testUser.user, moralisAddress, "FAKE SIGNATURE");
				assert.fail();
			} catch (err) {
				assert.equal(err.message, "Invalid signature");
			}
		});
  	});

	describe('JWT - getVerifyEmailJWT (deprecated)',  function() {
    	it('Valid JWT Token Signature', async function() {
			let token = jwtLogin.getVerifyEmailJWT("email");
      		assert.ok(jwt.verify(token, process.env.JWT_EMAIL_SECRET_KEY));
    	});
  	});

	after(async function() {
		await testUser.userDelete();
	});
});