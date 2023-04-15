import Moralis from 'moralis-v1/node';
import utils from '../utilities/utils';
import JWT from './jwt';
import Addresses from './addresses';

import crypto from 'crypto';

const UserAddresses = Moralis.Object.extend("UserAddresses");

export default class Auth {
	static async nonceRequest(public_key : string) {
		return await Addresses.nonceRequest(public_key);
	}

	static async loginWeb3(email : string, public_key : string, signed_message : string) {
		try { //TODO this can be optimized
			let userQuery = new Moralis.Query(Moralis.User);
			userQuery.equalTo("email", email);
			var user = await userQuery.first({useMasterKey : true});
			var address = await Addresses.getEthAddressDB(public_key);

			let uaQuery = new Moralis.Query(UserAddresses);
			uaQuery.equalTo("user", user); uaQuery.equalTo("address", address);
			var userAddr = await uaQuery.first({useMasterKey: true});
		} catch(err) {
			let error : any = new Error("Internal Error"); error.code = 500; throw error;
		}

		if (user == null) {
			let error : any= new Error("User Not Found"); error.code = 218; throw error;
		}

		if (userAddr == null){
			let error : any = new Error("Address Not Registered For User"); error.code = 400; throw error;
		}

		//to login you need a verified email
		if ( !user.get("emailVerified") ) { //TODO may need a way to have someone re-register if email was inputted already
			let error : any = new Error("Please Verify Your Email"); error.code = 400; throw error;
		}

		return await JWT.getLoginToken(user, address as Moralis.Object, signed_message);
	}
	
	static async registerWeb3(email : string, public_key : string, signed_message : string, verifiedEmail=false) {
		var address = await Addresses.getEthAddressDB(public_key); //should have been created by nonce

		//for now assume the user has not been registered since that is how this is called in connect
		let randomID = crypto.randomBytes(20).toString('hex'); //email code
		let attributes = {email: email, emailVerified : verifiedEmail, emailcode : randomID};
		const user = new Moralis.User(attributes);
		let token = await JWT.getLoginToken(user, address as Moralis.Object, signed_message);

		if (!verifiedEmail)
			Auth.sendVerification(user);

		return token;
	}

	static sendVerification(user : Moralis.User) {
		var url = process.env.HOST + (process.env.PORT ? ":" + process.env.PORT : "") +
			"/api/auth/verifyEmail/" + user.get("email") + "/" + user.get("emailcode");

		utils.sendTemplateEmail(user.get("email"), "verify-email" , {
			"verify_url": url
		});
	}

	static async verifyEmail(email : string, code : string) {
		const userQuery = new Moralis.Query(Moralis.User);
		userQuery.equalTo("email", email);
		userQuery.equalTo("emailcode", code);
		try {
			var user = await userQuery.first({useMasterKey : true});
			user?.save({emailVerified : true}, {useMasterKey : true});
			return null;
		} catch (err) {
			let error : any = new Error("Verification Doesn't Match"); error.code = 400; throw error;
		}
	}
}