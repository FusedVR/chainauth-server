import { UploadedFile } from 'express-fileupload';
import Moralis from 'moralis-v1/node';
import utils from '../utilities/utils';
import Subscription from './subscription';

//columns
enum AppColumns {
	user = "user",
	name = "name",
	description = "description",
	profile = "profile",
	secret = "secret",
	apiCalls = "apiCalls",
	emailCalls = "emailCalls"
}

export interface AppMeta {
	id: string;
	name :string;
	profile : string;
}

//TODO consider an organization and RBAC structure instead of linking to users
// instead of an organization, it can be multiple users for an app
export default class Apps {

	static readonly DB_TABLE = "Apps";
	static readonly AppDefinition = Moralis.Object.extend(Apps.DB_TABLE);

	static async createApp(sessionID :string, name :string, profile: UploadedFile | null, description : string) {
		let user = await Moralis.User.me(sessionID, {useMasterKey : true});

		try {
			var file = (profile != null) ? new Moralis.File(profile?.name, Array.from(profile?.data), profile?.mimetype) : null;
			var attributes = { [AppColumns.user] : user, [AppColumns.name] : name, 
				[AppColumns.description] : description, [AppColumns.profile] : file , [AppColumns.secret]  : utils.uuidv4(),
				[AppColumns.emailCalls] : 0, [AppColumns.apiCalls] : 0
			};
			var app = new Apps.AppDefinition(attributes);
			await app.save(null, {useMasterKey : true});
			return app.id;
		} catch (err) {
			let error :any = new Error("Unable to save App : " + err.message ); error.code = 500; throw error;
		}
	}

	static async showApp(sessionID :string , id :string) {
		let user = await Moralis.User.me(sessionID, {useMasterKey : true});
		let app = await Apps.getApp(id);

		if (app.get(AppColumns.user).id == user.id) { //check if app belongs to the user
			return { id : id, [AppColumns.name] : app.get(AppColumns.name) , [AppColumns.description] : app.get(AppColumns.description) , [AppColumns.profile] : app.get(AppColumns.profile),
				[AppColumns.emailCalls] : app.get(AppColumns.emailCalls), [AppColumns.apiCalls] : app.get(AppColumns.apiCalls)
			};
		} else {
			// for now let's assume only the owner can view their app
			let error :any = new Error("Invalid App Id"); error.code = 400; throw error;
		}
	}

	static async showMyApps(sessionID :string) {
		try {
			let user = await Moralis.User.me(sessionID, {useMasterKey : true});
			let appQuery = new Moralis.Query(Apps.AppDefinition);
			appQuery.equalTo(AppColumns.user, user);
			const apps = await appQuery.find(); //find all apps for user
			let appReturn : AppMeta [] = [];
			for(let i in apps) {
				let app = apps[i];
				appReturn.push( { id : app.id , name : app.get(AppColumns.name) , profile : app.get(AppColumns.profile) });
			}
			return appReturn;
		} catch (err) {
			let error :any = new Error(err.message); error.code = 400; throw error;
		}
	}

	static async updateApp(sessionID :string, id:string, name:(string | null) =null, profile: (UploadedFile| null) =null, description:(string | null) =null) {
		try {
			let user = await Moralis.User.me(sessionID, {useMasterKey : true});
			let app = await Apps.getApp(id);
			let updatedDetails : any = {}; //marked as any to assign dynamically

			if (app.get(AppColumns.user).id == user.id) {
				if (name) {
					app.set(AppColumns.name, name);
					updatedDetails[AppColumns.name] = name;
				}
				if (description) {
					app.set(AppColumns.description, description);
					updatedDetails[AppColumns.description] = description;
				}
				if (profile) {
					const file = new Moralis.File(profile.name, Array.from(profile.data), profile.mimetype);
					app.set(AppColumns.profile, file);
				}

				await app.save(null, {useMasterKey: true});
				//set file after save
				if (profile) updatedDetails[AppColumns.profile] = app.get(AppColumns.profile); 
			}

			return updatedDetails;
		} catch (err ) {
			let error :any = new Error(err.message); error.code = 400; throw error;
		}
	}

	static async deleteApp(sessionID :string, appId :string) {
		try {
			//TODO need to mark these apps with a delete flag instead of perma delete and then similarlly mark app stats
			let user = await Moralis.User.me(sessionID, {useMasterKey : true});
			let app = await Apps.getApp(appId);

			if (app.get(AppColumns.user).id == user.id) {
				await app.destroy();
				return true;
			}
			return false;
		} catch (err) {
			let error :any = new Error(err.message); error.code = 400; throw error;
		}
	}

	static getMoralisAppValidation(appId : string, { req } : any ) : Promise<void | never>{
		return new Promise( async ( resolve, reject ) => {
			try {
				let app = await Apps.getApp(appId);
				if (req) req.app = app; 
				resolve();
			} catch (err) {
				reject("App ID (" + appId + ") Invalid")
				//let error :any = new Error("App ID (" + appId + ") Invalid"); error.code = 400; throw error;
			}
		} );
	}

	//profile is not used for express-validator
	static validProfilePic(profile : string, { req } : any ) : boolean {
		if(req.files.profile.mimetype === 'image/png' || req.files.profile.mimetype === 'image/jpeg'){
            return true; // return "non-falsy" value to indicate valid data"
        } else{
            return false; // return "falsy" value to indicate invalid data
        }
	}

	static async incrementAppApi(appId : string) { //called when account apis are called (from utils)
		//update sub stats and only if updated then update app
		let app = await Apps.getApp(appId);
		app.set( AppColumns.apiCalls, app.get(AppColumns.apiCalls) + 1);
		await app.save(null, {useMasterKey : true});

		await Subscription.incrementAppApi(app); //if max is hit then error is thrown
	}

	static async incrementEmail(appId : string) { //called when email are called (from magic link)
		let app = await Apps.getApp(appId);
		app.set( AppColumns.emailCalls, app.get(AppColumns.emailCalls) + 1);
		await app.save(null, {useMasterKey : true});

		await Subscription.incrementEmail(app);
	}

	static async getApp(appId : string) {
		let appQuery = new Moralis.Query(Apps.AppDefinition);
		return await appQuery.get(appId);
	}
}

/*
// DEPRECATED: THIS WAS THE ORIGINAL MEANS FOR CREATING AN APP WITH AN NFT

	static async createNFTApp(sessionID :string, contract :string, nftId:string, chain:string) {
		let user = await Moralis.User.me(sessionID, {useMasterKey : true});
		let appQuery = new Moralis.Query(AppDefinition);
		appQuery.equalTo("user", user); 	appQuery.equalTo("contract", contract.toLowerCase()); 
		appQuery.equalTo("nftId", nftId); appQuery.equalTo("chain", chain);

		let userApp = await appQuery.first();
		if (userApp) {
			let error :any = new Error("App Already Exists"); error.code = 400; throw error;
		}

		try {
			const options = { address: contract.toLowerCase(), token_id: nftId, chain: chain as any };
			const tokenIdMetadata = await Moralis.Web3API.token.getTokenIdMetadata(options);
		} catch (err) {
			let error :any = new Error("Invalid Contract"); error.code = 400; throw error;
		}

		//NFT has been validated
		try {
			var attributes = { user : user, contract : contract, nftId : nftId, chain : chain };
			var app = new AppDefinition(attributes);
			await app.save(null, {useMasterKey : true});
			return app.id;
		} catch (err) {
			let error :any = new Error("Unable to save App at this time" ); error.code = 500; throw error;
		}
	}
*/