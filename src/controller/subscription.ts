import Moralis from 'moralis-v1/node';
import utils from '../utilities/utils';

import PlanLimits, { PlanColumns } from './planLimits';

//columns
enum SubColumns {
	subscriptionId = "subscriptionId",
	address = "address",
	subscribed = "subscribed",
	user = "user",
	plan = "plan"
}

enum SubStatsColumns {
	sub = "sub",
	apiCalls = "apiCalls",
	emailCalls = "emailCalls"
}

export default class Subs {

	static readonly SUB_DB_TABLE = "Subscriptions";
	static readonly SubDefinition = Moralis.Object.extend(Subs.SUB_DB_TABLE);

	static readonly SUB_STAT_DB_TABLE = "SubStats";
	static readonly SubStatsDefinition = Moralis.Object.extend(Subs.SUB_STAT_DB_TABLE);

	static async mySubscription(sessionID : string) {
		var user = await Moralis.User.me(sessionID, {useMasterKey : true});
		let subData = await Subs.getSubDataByUser(user);
		if (subData){
			delete subData.subStat;
			return subData; //TODO consider adding plan metadata from subStat
		} else {
			let error :any = new Error("Internal Error: No Subscription for Account"); error.code = 500; throw error;
		}
	}

	static async getAppSubStats(app : Moralis.Object<Moralis.Attributes>) {
		let user = app.get("user");
		let subData = await Subs.getSubDataByUser(user);

		if (subData) {
			return subData
		} else {
			let error :any = new Error("Internal Error: No Subscription for Account"); error.code = 500; throw error;
		}
	}

	static async incrementAppApi(app : Moralis.Object<Moralis.Attributes>) {
		let data = await Subs.getAppSubStats(app);
		let subStat = data.subStat;
		
		let newLimit = data[SubStatsColumns.apiCalls] + 1;
		if ( newLimit <= data[PlanColumns.apiLimit] ) {
			subStat.set( SubStatsColumns.apiCalls, newLimit);
			await subStat.save(null, {useMasterKey : true});
		} else {
			let error :any = new Error("Max API Limit Reached"); error.code = 400; throw error;
		}
	}

	static async incrementEmail(app : Moralis.Object<Moralis.Attributes>) {
		let data = await Subs.getAppSubStats(app);
		let subStat = data.subStat;

		let newLimit = data[SubStatsColumns.emailCalls] + 1;
		if ( newLimit <= data[PlanColumns.emailLimit] ) {
			subStat.set( SubStatsColumns.emailCalls, newLimit);
			console.log("New Limit " + newLimit);
			await subStat.save(null, {useMasterKey : true});
		} else {
			let error :any = new Error("Max E-mail Limit Reached"); error.code = 400; throw error;
		}
	}

	private static async getSubDataByUser(user : Moralis.User) : Promise<any> {
		let subQuery = new Moralis.Query(Subs.SubDefinition);
		subQuery.equalTo(SubColumns.user, user);
		subQuery.equalTo(SubColumns.subscribed, true);
		subQuery.descending("createdAt"); //get the latest

		let subStatsQuery = new Moralis.Query(Subs.SubStatsDefinition);
		subStatsQuery.include("sub.user");
		subStatsQuery.include("sub.plan");
		subStatsQuery.descending("createdAt"); //get the latest
		subStatsQuery.matchesQuery("sub", subQuery);

		let subStats = await subStatsQuery.find({useMasterKey : true});

		if (subStats.length > 0) {
			let subStat = subStats[0];
			return	{
				subId : subStat?.get(SubStatsColumns.sub).get(SubColumns.subscriptionId),
				planId : subStat?.get(SubStatsColumns.sub).get(SubColumns.plan).get(PlanColumns.planId), 
				apiCalls : subStat?.get(SubStatsColumns.apiCalls), emailCalls : subStat?.get(SubStatsColumns.emailCalls),
				apiLimit : subStat?.get(SubStatsColumns.sub).get(SubColumns.plan).get(PlanColumns.apiLimit), 
				emailLimit : subStat?.get(SubStatsColumns.sub).get(SubColumns.plan).get(PlanColumns.emailLimit),
				subStat : subStat
			}
		} 

		//if subscription doesn't exisit, create a free tier option - TODO create a monthly refresh job
		let planQuery = new Moralis.Query(PlanLimits.PlansDefinition);
		planQuery.equalTo("planId", "free");
		let plan = await planQuery.first();

		var attributes = { subscriptionId : "free-" + utils.uuidv4(), "plan" : plan , address : "N/A", subscribed : true , user : user};
		var subscription = new Subs.SubDefinition(attributes);
		await subscription.save(null, {useMasterKey : true}); //only need to save subscription since it needs to be assigned to app

		return await Subs.getSubDataByUser(user); //recurse now that the free plan is setup
	}

	//used ONLY in unit tests 
	static async removeSub(user : Moralis.User) {
		let subQuery = new Moralis.Query(Subs.SubDefinition);
		subQuery.equalTo(SubColumns.user, user);

		let subStatsQuery = new Moralis.Query(Subs.SubStatsDefinition);
		subStatsQuery.descending("createdAt"); //get the latest
		subStatsQuery.matchesQuery("sub", subQuery);

		let subStats = await subStatsQuery.find({useMasterKey : true});

		for (var i = 0; i < subStats.length; i++){
			try {
				await subStats[i].get(SubStatsColumns.sub).destroy(); //as this may not exist anymore
			}catch(error) {}

			await subStats[i].destroy();
		}
	}
}
