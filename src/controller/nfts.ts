import Moralis from 'moralis-v1/node';

import Apps from "../controller/apps";

enum NFTColumns {
	nftID = "NftID",
	app = "app"
}

//TODO write cloud function script to manage createNFT on EVENT
export default class NFTController {

	static readonly DB_TABLE = "FusedNFTS";
	static readonly NFTDefinition = Moralis.Object.extend(NFTController.DB_TABLE);

	// app are Moralis objects with Moralis type for apps
	//we can assume for now that plans can also be stored as an app
	static async createNFT(nftid : string, app : Moralis.Object) {
		try {
			var attributes = { [NFTColumns.nftID] : nftid, [NFTColumns.app] : app, };
			var nftData = new NFTController.NFTDefinition(attributes);
			await nftData.save(null, {useMasterKey : true});
			return attributes;
		} catch (err) {
			let error :any = new Error("Unable to save NFT : " + err.message ); error.code = 500; throw error;
		}
	}

	//app are Moralis objects with Moralis type for apps
	static async getNFT(nftid : string) {
		try {
			let nftQuery = new Moralis.Query(NFTController.NFTDefinition);
			nftQuery.equalTo(NFTColumns.nftID, nftid);
			var nftMap = await nftQuery.first({useMasterKey : true});

			let appId = nftMap?.get(NFTColumns.app).toJSON().objectId; //TODO this can be optimized
			let appQuery = new Moralis.Query(Apps.AppDefinition);
			var app = await appQuery.get(appId);

			var metaData = { 
				name : app.get("name"), 
				descriptiop : app.get("description"), 
				external_url : "crypto.fusedvr.com", //TODO not HARDCODE
				image : app.get("profile")
			};
			return metaData;
		} catch (err) {
			let error :any = new Error("Unable to find NFT : " + err.message); error.code = 500; throw error;
		}
	}

}