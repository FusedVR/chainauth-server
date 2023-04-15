import Moralis from 'moralis-v1/node';
import utils from '../utilities/utils';
import Addresses from './addresses';

import JWTController from './jwt';

const PlayerAppAuth = Moralis.Object.extend("PlayerApp");
const AppDefinition = Moralis.Object.extend("Apps");

export default class AppAuth {

	//then it will sign and send exactly the same way as regsiter with code. only difference is register with email also sends email
	//TODO we could also enable passing a wallet connect ID (or any metadata) from Unity to the website so that developers can create use cases where it is dynamic

	static async appRegisterClient(appId: string, email : string | null = null) { //called from Unity client
		let sixCode = utils.random(100000, 999999) + ""; //todo this code should be a lot more robust i.e. self referencing with 4 digit code + 2 digits for self validation
		let playerApp = new PlayerAppAuth({appId : appId , code : sixCode, email : email}); //TODO validate this is a correct appId
		await playerApp.save({}, {useMasterKey : true});

		if (email) {
			let appQuery = new Moralis.Query(AppDefinition);
			let app = await appQuery.get(appId);

			var url = AppAuth.getMagicLink(sixCode, appId);

			utils.sendTemplateEmail(email, "login" , {
				"profile_image": app.get("profile")?.url(),
				"app_name": app.get("name"),
				"verify_url": url
			});
		}

		return sixCode;
	}

	static async appAuthorize(public_key : string, signed_message : string, code : string ) { //called from link.fusedvr.com
		let codeQuery = new Moralis.Query(PlayerAppAuth);
		codeQuery.equalTo("code", code); codeQuery.equalTo("address", undefined); codeQuery.descending("createdAt"); //check if code registered and has not been used by address
		var playerApp = await codeQuery.first({useMasterKey : true});
		if (playerApp) { //check if code exists
			var address = await Addresses.getEthAddressDB(public_key); //should have been created by nonce //TODO consider using include function from Queries doc
			if (address && await JWTController.validateSignature(address, signed_message)) {
				public_key = address.get("address"); //to get the correct format
				await playerApp.save({ address : public_key}, {useMasterKey : true} ); //save address
				return await JWTController.getAppLoginToken(playerApp.get("appId"), public_key);
			} else {
				let error : any = new Error("Invalid Signature"); error.code = 400; throw error;
			}
		} else {
			let error : any = new Error("Invalid Code"); error.code = 400; throw error;
		}
	}

	//TODO consider a longer timeout - node js doesnt enforce a time limit (despite documentation suggestions about 2 mins, but google cloud enforced a default of 5 mins)
	static async appLogin(appId : string, code : string) { //to be called from Unity Client after register
		let codeQuery = new Moralis.Query(PlayerAppAuth);
		codeQuery.equalTo("code", code); codeQuery.equalTo("appId", appId); //appId requried to avoid collision
		var playerApp = await codeQuery.first({useMasterKey : true});
		if (playerApp) {
			let playerAddress : string = playerApp.get("address"); 
			while ( playerAddress == null ) { //await signature from link site
				await utils.sleep(5000); //poll until receive signature or request cancels after two minutes
				playerApp = await codeQuery.first({useMasterKey : true}); //refresh player app
				playerAddress = playerApp?.get("address");
			}

			playerApp?.destroy({useMasterKey : true}); //delete so code cannot be used again after returning JWT
			return await JWTController.getAppLoginToken(appId, playerAddress);
		} else {
			let error : any = new Error("Invalid Code"); error.code = 400; throw error;
		}
	} 

	//TODO consider adding appId to link requirements. when added, this ideally should be encrypted so that users don't see the app id. alternatively use something like the app name
	static getMagicLink(code : string, appId : string) : string {
		return process.env.HOST + (process.env.PORT ? ":" + process.env.PORT : "") + 
			"/api/fused/link/" + code;
	}
}