process.env.NODE_ENV = "dev";

const assert = require('assert');
const server = require('../../app/server.js');
const supertest = require('supertest');
const requestWithSupertest = supertest(server);

const UserTestUtil = require('../TestResources/userUtil');

const Moralis = require('moralis-v1/node');
const path = require('path');
const jwt = require('jsonwebtoken');

const AppStats = require('../../app/controller/appStats.js').default;

const TEST_EMAIL = "test981357@fa68413ke-dom1893ain.com";

describe('Apps APIs Endpoints', async function() {
	let testUser = new UserTestUtil(TEST_EMAIL, requestWithSupertest);
    before(async function() { //setup a user with a wallet
		this.timeout(20000);
		await testUser.userSignUp();
	});

	describe('Verify App Management End Point', async function() {
		var appId;
		var appName = "Test App";
		var appDescription = "Hello World";
		describe('Create App /apps/create', async function() {
			it('Invaid Create');

			it('Add Example App', async () => {
				let res = await requestWithSupertest
					.post('/api/apps/create')
					.set("Authorization", "Bearer " + testUser.token)
					.attach( 'profile' , path.join(__dirname, '..', 'TestResources' , 'pixel.png') )
					.field("name", appName);

				assert.equal(res.status, 200);
				assert.equal(res.type, "application/json");
				assert.ok("id" in res.body);
				appId = res.body["id"];
			});
		});

		describe('Update App /apps/update', async function() {
			it('Update Example App Name', async () => {
				appName = "New App Name";
				let res = await requestWithSupertest
					.post('/api/apps/update')
					.set("Authorization", "Bearer " + testUser.token)
					.field("id", appId)
					.field("name", appName);

				assert.equal(res.status, 200);
				assert.equal(res.type, "application/json");
				assert.equal(res.body.name, appName);
			});

			it('Update Example App Description', async () => {
				appName = "New App Name";
				let res = await requestWithSupertest
					.post('/api/apps/update')
					.set("Authorization", "Bearer " + testUser.token)
					.field("id", appId)
					.field("description", appDescription);

				assert.equal(res.status, 200);
				assert.equal(res.type, "application/json");
				assert.equal(res.body.description, appDescription);
			});

			it('Update Example App Profile', async () => {
				appName = "New App Name";
				let res = await requestWithSupertest
					.post('/api/apps/update')
					.set("Authorization", "Bearer " + testUser.token)
					.field("id", appId)
					.attach( 'profile' , path.join(__dirname, '..', 'TestResources' , 'pixel.png') ); // just exercising the code even if same pic

				assert.equal(res.status, 200);
				assert.equal(res.type, "application/json");
				assert.ok("profile" in res.body);
			});

			it('Invaid Update');
		});


		describe('Show App /apps', async function() {
			it('Show All Apps', async () => {
				let res = await requestWithSupertest
					.post('/api/apps')
					.set("Authorization", "Bearer " + testUser.token);

				assert.equal(res.status, 200);
				assert.equal(res.type, "application/json");
				assert.equal(res.body.length, 1);
				assert.equal(res.body[0].id, appId);
				assert.equal(res.body[0].name, appName);
				assert.ok("profile" in res.body[0]);
			});

			it('Show our App with id', async () => {
				let res = await requestWithSupertest
					.post('/api/apps/show')
					.set("Authorization", "Bearer " + testUser.token)
					.send({id : appId});

				assert.equal(res.status, 200);
				assert.equal(res.type, "application/json");
				assert.equal(res.body.name, appName);
				assert.equal(res.body.description, appDescription);
				assert.equal(res.body.emailCalls, 0);
				assert.equal(res.body.apiCalls, 0);
				assert.ok("profile" in res.body);
			});
		});

		describe('Stats Tracking ', async function() {

			before(async function() { //setup a user with a wallet
				this.timeout(20000);
				await new Promise(resolve => setTimeout(resolve, 1000)); //wait 1 seconds for 
			});

			it('Test Email Increment', async () => {
				await requestWithSupertest
					.post('/api/fused/register')
					.send({"email": TEST_EMAIL, "appId" : appId});

				let res = await requestWithSupertest
					.post('/api/apps/show')
					.set("Authorization", "Bearer " + testUser.token)
					.send({id : appId});

				assert.equal(res.status, 200);
				assert.equal(res.type, "application/json");
				assert.equal(res.body.name, appName);
				assert.equal(res.body.emailCalls, 1); // should now be 1
				assert.equal(res.body.apiCalls, 0); // should start with 0
			}).timeout(10000);

			it('Test API Increment' , async () => {
				let appToken = jwt.sign({ sessionid : testUser.user.getSessionToken(), appId : appId , address : testUser.wallet.address }, 
					process.env.JWT_APP_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRATION });
				
				await requestWithSupertest //call account api and check for increment
					.post('/api/account')
					.set("Authorization", "Bearer " + appToken)
					.send({});


				let res = await requestWithSupertest
					.post('/api/apps/show')
					.set("Authorization", "Bearer " + testUser.token)
					.send({id : appId});

				assert.equal(res.status, 200);
				assert.equal(res.type, "application/json");
				assert.equal(res.body.name, appName);
				assert.equal(res.body.apiCalls, 1); // should now be 1
				
			}).timeout(10000);

		});

		describe('Delete App /apps/delete', async function() {
			it('Invalid Delete');

			it('Delete our App', async () => {
				let res = await requestWithSupertest
					.post('/api/apps/delete')
					.set("Authorization", "Bearer " + testUser.token)
					.send({id : appId});

				assert.equal(res.status, 200);
			});
		});
	});

	after(async function() {
		await testUser.userDelete();
	});
});
