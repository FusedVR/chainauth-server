import Moralis from 'moralis-v1/node';

//columns
export const enum PlanColumns {
	planId = "planId",
	emailLimit = "emailLimit",	
	apiLimit = "apiLimit"
}

export default class PlanLimits {

	static readonly INIT_MAX_EMAILS: number = 100;
	static readonly INIT_MAX_APIS: number = 100;

	static readonly PLAN_TABLE = "PlanLimits";
	static readonly PlansDefinition = Moralis.Object.extend(PlanLimits.PLAN_TABLE);

	//called from plans
	static async getAllPlans() {
		let planQuery = new Moralis.Query(PlanLimits.PlansDefinition);
		const results = await planQuery.find();
		var plans : object[] = [];
		for (let i = 0; i < results.length; i++) {
			plans.push( { planId : results[i].get(PlanColumns.planId), 
				emailLimit : results[i].get(PlanColumns.emailLimit), 
				apiLimit : results[i].get(PlanColumns.apiLimit)} );
		}

		return plans;
	}

	static async getPlanLimitsForSub(sub : Moralis.Object<Moralis.Attributes>) {
		return await PlanLimits.getPlan( sub.get("planId") );
	}

	static async getPlan(planId : string) {
		let planQuery = new Moralis.Query(PlanLimits.PlansDefinition);
		planQuery.equalTo(PlanColumns.planId, planId);
		return await planQuery.first();
	}
	
	//called from server.ts
	static async initPlans() {
		const query = new Moralis.Query(PlanLimits.PlansDefinition);
		const count = await query.count();
		if (count == 0){
			//TODO fill from a file
			await PlanLimits.createPlan("free", 100, 100);
		}
	}

	//BELOW FUNCTIONS ARE USED FOR UNIT TESTS 
	static async createPlan(planId : string, emailLmit : number, apiLimit : number){
		var attributes = { 
			[PlanColumns.planId] : planId , 
			[PlanColumns.emailLimit] : emailLmit, 
			[PlanColumns.apiLimit] : apiLimit
		};
		var appStats = new PlanLimits.PlansDefinition(attributes);
		await appStats.save(null, {useMasterKey : true});
		return appStats;
	}

	//to be used primarily for removing plan in test cases
	static async removePlan(planId : string) {
		let plan = await PlanLimits.getPlan(planId);
		await plan?.destroy();
	}

}