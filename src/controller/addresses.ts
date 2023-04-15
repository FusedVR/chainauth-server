import Moralis from 'moralis-v1/node';
import utils from '../utilities/utils';
import crypto from 'crypto';

const UserAddresses = Moralis.Object.extend("UserAddresses");
const EthAddress = Moralis.Object.extend("EthAddress");

export default class Addresses {

	static async registerKey(sessionID : string, public_key : string, signed_message : string) {
		let address = await Addresses.getEthAddressDB(public_key);
		var original_message = address?.get("message");

		if ( utils.verifyMessage(public_key, signed_message, original_message) ) {
			try {
				var user = await Moralis.User.me(sessionID, {useMasterKey : true});
				await address?.save({signature: signed_message}, {useMasterKey: true});
				await Addresses.saveUserAddress(user, address as Moralis.Object);
				Addresses.nonceRequest(public_key);
				return true;
			} catch (err) {
				console.log(err);
				let error : any = new Error("Unable to Link User at this time"); error.code = 500; throw error;
			}
		} else {
			let error : any = new Error("Invalid Signature"); error.code = 400; throw error;
		}
	}

	//TODO this can be optimized to 1 query
	static async getAddresses(sessionID : string ) {
		var user = await Moralis.User.me(sessionID, {useMasterKey : true}); //this is a bug with types

		let uaQuery = new Moralis.Query(UserAddresses);
		uaQuery.equalTo("user", user);
		var userAddresses = await uaQuery.find({useMasterKey : true});
		
		let queries : Moralis.Query<Moralis.Object>[] = []
		for (let ua in userAddresses){
			let addrQ = new Moralis.Query(EthAddress);
			addrQ.equalTo( "objectId", userAddresses[ua].get("address").toJSON().objectId );
			queries.push( addrQ );
		}

		let addressQuery = Moralis.Query.or.apply(this, queries);
		var addresses = await addressQuery.find( { useMasterKey : true } );

		let accounts : string[] = [];
		for (let i in addresses){
			accounts.push( addresses[i].get("address") );
		}

		return accounts;
	}

	static async deleteAddresses(sessionID:string, public_key:string) {
		try {
			var user = await Moralis.User.me(sessionID, {useMasterKey : true});
			var address = await Addresses.getEthAddressDB(public_key);

		    const query = new Moralis.Query(UserAddresses);
		    query.equalTo("user", user); query.equalTo("address", address);
		    const records = await query.find({useMasterKey: true});
		    for (let i in records){
		    	records[i].destroy({useMasterKey : true});
		    }
		    return true;
		} catch (err) {
			console.log(err);
			let error :any = new Error(err.message); error.code = 400; throw error;
		}
	}
	
	static async nonceRequest(public_key: string) {
		const query = new Moralis.Query(EthAddress);
		query.equalTo("address", public_key.toLowerCase());
		const results = await query.find();
		
		var key = new EthAddress();
		var message = "Please Sign the FusedVR Random Message to Prove Ownership of Assets : " + crypto.randomBytes(32).toString('hex');

		if (results.length == 0) { //empty data
			key.set("address", public_key.toLowerCase());
		} else {
			key = results[0];
		}

		key.set("message", message);

		await key.save();
		return message;
	}

	static async getEthAddressDB(public_key : string){
		try {
			let pairQuery = new Moralis.Query(EthAddress);
			pairQuery.equalTo("address", public_key.toLowerCase());
			return await pairQuery.first({useMasterKey : true});
		} catch (err) {
			let error :any = new Error("Get Nonce (/auth/getNonce) for the Address First"); error.code = 400; throw error;
		}
	}

	static async saveUserAddress(user : Moralis.User, address: Moralis.Object){
		try {
			let pairQuery = new Moralis.Query(UserAddresses);
			pairQuery.equalTo("user", user);
			pairQuery.equalTo("address", address);
			let ua = await pairQuery.first({useMasterKey : true}); //ideally only one saved in DB

			if(ua == null){{
				ua = new UserAddresses(); //TODO keep only one
				await ua?.save({user : user, address : address} , {useMasterKey : true}); 
			}};
		} catch (err) {
			let error :any = new Error("Internal Saving Error"); error.code = 500; throw error;
		}
	}
}