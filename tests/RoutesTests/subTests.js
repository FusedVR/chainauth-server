// REQUIRES CLOUD FUNCTION
process.env.NODE_ENV = "dev";

const assert = require('assert');
const server = require('../../app/server.js');
const supertest = require('supertest');
const requestWithSupertest = supertest(server);

const UserTestUtil = require('../TestResources/userUtil');

const Moralis = require('moralis-v1/node');
const jwt = require('jsonwebtoken');

const TEST_EMAIL = "test26d2454561@fa68413ke-dom1893ain.com";

const SubController = require("../../app/controller/subscription").default;
const AppController = require("../../app/controller/apps").default;
const PlanLimits = require("../../app/controller/planLimits").default;

describe('Subscriptions APIs Endpoints', async function() {
	let appId;
	let appName = "Hello Subscription";
	let testUser = new UserTestUtil(TEST_EMAIL, requestWithSupertest);
	let SubDef = Moralis.Object.extend("Subscriptions");

	const subscriptionId = "unittest-324685353468";
	const planId = "unittest-xyz123";
	const emailLimit = 1000;
	const apiLimit = 10000;

    before(async function() { //setup a user with a wallet
		this.timeout(30000);
		await testUser.userSignUp();
		await PlanLimits.createPlan(planId, emailLimit, apiLimit);

		const decoded = jwt.verify(testUser.token, process.env.JWT_MAIN_SECRET_KEY); //TODO determine why secret key null
		appId = await AppController.createApp(decoded.sessionid, appName, null);
	});

	
	describe('Test Free Tier before Subscription', async function() {

		it('Verify Free Tier Limit before Burn', async () => {
			let sub = await SubController.getSubDataByUser(testUser.user);

			assert.equal(sub.apiCalls, 0);
			assert.equal(sub.emailCalls, 0);
			assert.equal(sub.emailLimit, 100);
			assert.equal(sub.apiLimit, 100);
		}).timeout(5000);

		it('Test Email Enforcement', async () => {
			await requestWithSupertest
				.post('/api/fused/register')
				.send({"email": TEST_EMAIL, "appId" : appId});
			
				await new Promise(resolve => setTimeout(resolve, 500)); //wait 0.5 seconds to avoid database caching 
			let subData = await SubController.getSubDataByUser(testUser.user);

			assert.equal(subData.emailCalls, 1);
			assert.equal(subData.emailLimit, 100);
			assert.equal(subData.apiCalls, 0);
			assert.equal(subData.apiLimit, 100);
		}).timeout(5000);


		it('Test API Enforcement', async () => {
			let appToken = jwt.sign({ sessionid : testUser.user.getSessionToken(), appId : appId , address : testUser.wallet.address }, 
				process.env.JWT_APP_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRATION });
			
			let result = await requestWithSupertest //call account api and check for increment
				.post('/api/account')
				.set("Authorization", "Bearer " + appToken)
				.send({});

			assert.equal(result.status, 200); //error for code
			let subData = await SubController.getSubDataByUser(testUser.user);

			assert.equal(subData.emailCalls, 1);
			assert.equal(subData.emailLimit, 100);
			assert.equal(subData.apiCalls, 1);
			assert.equal(subData.apiLimit, 100);
			
		}).timeout(10000);
	});

	describe('Create Sub Moralis', async function() {
		let CaskCreateDef = Moralis.Object.extend("CaskSubCreateLogs");
		it('Create CaskSub', async () => {
			var attributes = { 
				"planId" : planId , 
				"subscriptionId" : subscriptionId,
				"consumer" : testUser.wallet.address,
				"ref" : "0x"+ Buffer.from(testUser.user.id).toString("hex"),
				"confirmed" : true
			};

			var caskCreate = new CaskCreateDef(attributes);
			await caskCreate.save(null, {useMasterKey : true});

			//check 3 times if subscriptions have been created from Cloud function
			let sub = null;
			for (let i = 0; i < 3; i++) {
				await new Promise(resolve => setTimeout(resolve, 1000)); //wait 5 seconds for 
				sub = await SubController.getSubDataByUser(testUser.user);
				if (sub) {
					assert.equal(sub.subId, subscriptionId);
					assert.equal(sub.planId, planId);
					assert.equal(sub.apiCalls, 0);
					assert.equal(sub.emailCalls, 0);
					assert.equal(sub.emailLimit, emailLimit);
					assert.equal(sub.apiLimit, apiLimit);
					continue;
				}
			}

			assert.ok(sub != null , "Subscription never created by Moralis");
		}).timeout(20000);
	});

	describe('Show Plans Routes /plans', async function() {

		it('Show All Plans /plans/all', async () => {
			let res = await requestWithSupertest
				.post('/api/plans/all')
				.set("Authorization", "Bearer " + testUser.token);

			assert.equal(res.status, 200);
			assert.equal(res.type, "application/json");
			var foundCount = 0;
			for (var i = 0; i < res.body.length; i++) {
				var plan = res.body[i];
				if (plan["planId"] == "free") {
					assert.equal(plan["emailLimit"], 100);
					assert.equal(plan["apiLimit"], 100);
					foundCount++;
				}

				if (plan["planId"] == planId) {
					assert.equal(plan["emailLimit"], emailLimit);
					assert.equal(plan["apiLimit"], apiLimit);
					foundCount++;
				}
			}
			assert.equal(foundCount, 2); //found free tier and unit test plan
		}).timeout(5000);

		it('Show My Plans /plans/mine - Subscribed to Unit Test Plan', async () => {
			let res = await requestWithSupertest
				.post('/api/plans/mine')
				.set("Authorization", "Bearer " + testUser.token);

			assert.equal(res.status, 200);
			assert.equal(res.body.subId, subscriptionId);
			assert.equal(res.body.planId, planId);
			assert.equal(res.body.apiCalls, 0);
			assert.equal(res.body.emailCalls, 0);
			assert.equal(res.body.emailLimit, emailLimit);
			assert.equal(res.body.apiLimit, apiLimit);
		}).timeout(5000);

	});

	describe('Limit Enforcement', async function() {
		before(async function() { //call login function to fake email address call
			let stats = (await SubController.getAppSubStats(await AppController.getApp(appId))).subStat;
			await stats.save( {apiCalls : apiLimit, emailCalls : emailLimit} , {useMasterKey : true});
		});

		it('Test Email Enforcement', async () => {
			await requestWithSupertest
				.post('/api/fused/register')
				.send({"email": TEST_EMAIL, "appId" : appId});
			
			let subData = await SubController.getSubDataByUser(testUser.user);

			assert.equal(subData.emailCalls, emailLimit);
			assert.equal(subData.emailLimit, emailLimit);
			assert.equal(subData.apiCalls, apiLimit);
			assert.equal(subData.apiLimit, apiLimit);
		}).timeout(30000);


		it('Test API Enforcement', async () => {
			let appToken = jwt.sign({ sessionid : testUser.user.getSessionToken(), appId : appId , address : testUser.wallet.address }, 
				process.env.JWT_APP_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRATION });
			
			let result = await requestWithSupertest //call account api and check for increment
				.post('/api/account')
				.set("Authorization", "Bearer " + appToken)
				.send({});

			assert.equal(result.status, 401); //error for code
			let subData = await SubController.getSubDataByUser(testUser.user);

			assert.equal(subData.emailCalls, emailLimit);
			assert.equal(subData.emailLimit, emailLimit);
			assert.equal(subData.apiCalls, apiLimit);
			assert.equal(subData.apiLimit, apiLimit);
			
		}).timeout(10000);
	});

	describe('Renew Subscription', async function() {
		let CaskRenewDef = Moralis.Object.extend("CaskSubRenewalLogs");
		it('Renew Subscription with Cask', async () => {
			let stats = (await SubController.getAppSubStats(await AppController.getApp(appId))).subStat;
			await stats.save( {apiCalls : 101, emailCalls : 101} , {useMasterKey : true});

			var attributes = { 
				"planId" : planId , 
				"subscriptionId" : subscriptionId,
				"consumer" : testUser.wallet.address,
				"confirmed" : true
			};

			var caskRenew = new CaskRenewDef(attributes);
			await caskRenew.save(null, {useMasterKey : true});

			//check 3 times if subscriptions have been created
			var verified = false;
			for (let i = 0; i < 3; i++) {
				await new Promise(resolve => setTimeout(resolve, 1000)); //wait 5 seconds for 
				let sub = await SubController.getSubDataByUser(testUser.user);
				if (sub) {
					if (sub.apiCalls == 101 || sub.emailCalls == 101) {
						continue;
					}

					assert.equal(sub.apiCalls, 0);
					assert.equal(sub.emailCalls, 0);
					assert.equal(sub.emailLimit, emailLimit);
					assert.equal(sub.apiLimit, apiLimit);
					verified = true;
					break;
				}
			}

			assert.ok(verified, "Stats did not reset on Subscription Renewal");
		}).timeout(20000);
	});

	describe('Delete Sub Moralis', async function() {
		let CaskBurnDef = Moralis.Object.extend("CaskSubCanceledLogs");
		it('Burn CaskSub', async () => {
			var attributes = { 
				"planId" : planId , 
				"subscriptionId" : subscriptionId,
				"consumer" : testUser.wallet.address,
				"confirmed" : true
			};

			var caskBurn = new CaskBurnDef(attributes);
			await caskBurn.save(null, {useMasterKey : true});

			//check 3 times if subscriptions have been created
			let sub = null;
			for (let i = 0; i < 3; i++) {
				await new Promise(resolve => setTimeout(resolve, 1000)); //wait 5 seconds for 
				let subQuery = new Moralis.Query(SubDef);
				subQuery.equalTo("subscriptionId", subscriptionId);
				subQuery.equalTo("subscribed", false); //must be set to false
				sub = await subQuery.first({useMasterKey : true});
				if (sub != null) {
					break; //it is now unsubscribed
				}
			}

			assert.ok(sub != null , "Subscription never deleted by Moralis");
		}).timeout(20000);
	});

	describe('Test Free Tier after Subscription', async function() {
		before(async function() { //call login function to fake email address call
			let stats = (await SubController.getAppSubStats(await AppController.getApp(appId))).subStat;
			await stats.save( {apiCalls : 100, emailCalls : 100} , {useMasterKey : true});
		});

		it('Verify Free Tier Limit after Burn', async () => {
			let sub = await SubController.getSubDataByUser(testUser.user);

			assert.equal(sub.apiCalls, 100);
			assert.equal(sub.emailCalls, 100);
			assert.equal(sub.emailLimit, 100);
			assert.equal(sub.apiLimit, 100);
		}).timeout(5000);

		it('Test Email Enforcement', async () => {
			await requestWithSupertest
				.post('/api/fused/register')
				.send({"email": TEST_EMAIL, "appId" : appId});
			
			let subData = await SubController.getSubDataByUser(testUser.user);

			assert.equal(subData.emailCalls, 100);
			assert.equal(subData.emailLimit, 100);
			assert.equal(subData.apiCalls, 100);
			assert.equal(subData.apiLimit, 100);
		}).timeout(30000);


		it('Test API Enforcement', async () => {
			let appToken = jwt.sign({ sessionid : testUser.user.getSessionToken(), appId : appId , address : testUser.wallet.address }, 
				process.env.JWT_APP_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRATION });
			
			let result = await requestWithSupertest //call account api and check for increment
				.post('/api/account')
				.set("Authorization", "Bearer " + appToken)
				.send({});

			assert.equal(result.status, 401); //error for code
			let subData = await SubController.getSubDataByUser(testUser.user);

			assert.equal(subData.emailCalls, 100);
			assert.equal(subData.emailLimit, 100);
			assert.equal(subData.apiCalls, 100);
			assert.equal(subData.apiLimit, 100);
			
		}).timeout(10000);
	});

	after(async function() {
		await PlanLimits.removePlan(planId);
		await SubController.removeSub(testUser.user);

		const decoded = jwt.verify(testUser.token, process.env.JWT_MAIN_SECRET_KEY); //TODO determine why secret key null
		await AppController.deleteApp(decoded.sessionid, appId);

		await testUser.userDelete(); // must be last
	});
});
