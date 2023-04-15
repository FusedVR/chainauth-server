process.env.NODE_ENV = "dev";

const assert = require('assert');
const server = require('../../app/server.js');
const supertest = require('supertest');

const requestWithSupertest = supertest(server);

const UserTestUtil = require('../TestResources/userUtil');
const jwt = require('jsonwebtoken');

const AppController = require("../../app/controller/apps").default;

const TEST_EMAIL = "test981357@fa68413ke-dom1893ain.com";

describe('Apps Controller Endpoints', async function() {
	let testUser = new UserTestUtil(TEST_EMAIL, requestWithSupertest);
    before(async function() { //setup a user with a wallet
		this.timeout(15000);
		await testUser.userSignUp();
	});

	describe('Verify App Controller', async function() {
		var appId;
		describe('Create App /apps/create', async function() {
			it('Add Example App', async () => {
				const decoded = jwt.verify(testUser.token, process.env.JWT_MAIN_SECRET_KEY);
				appId = await AppController.createApp(decoded.sessionid, "Test App", null);

				assert.ok(appId != null);
			});

			it('Invalid Create App');
		});

		describe('Verify App Id', async function() {
			it('getMoralisAppValidation - Is Valid', async () => {
				var validApp = AppController.getMoralisAppValidation(appId , { req : null} );
				assert.ok(validApp);
			});
		});

		describe('Delete App /apps/delete', async function() {
			it('Invalid Delete App');

			it('Delete our App', async () => {
				const decoded = jwt.verify(testUser.token, process.env.JWT_MAIN_SECRET_KEY);
				var deleted = AppController.deleteApp(decoded.sessionID, appId);

				assert.ok(deleted);
			});
		});
	});

	after(async function() {
		await testUser.userDelete();
	});
});
