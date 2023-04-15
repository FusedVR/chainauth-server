import utils from '../utilities/utils';
import jwt from 'jsonwebtoken';
import Addresses from './addresses';
import Moralis from 'moralis-v1/types';

const jwtMainKey = process.env.JWT_MAIN_SECRET_KEY as string; 
const jwtEmailKey = process.env.JWT_EMAIL_SECRET_KEY as string; 
const jwtAppKey = process.env.JWT_APP_SECRET_KEY as string; 

export default class JWTController {

	//user and address are Moralis objects with Moralis types
	static async getLoginToken(user : Moralis.User, address : Moralis.Object, signed_message : string) {
		let key = address.get("address"); //shorthand
		if ( await JWTController.validateSignature(address, signed_message) ) {
			try {
				try { //try login first
					user.set("username", user.get("email")); user.set("password", "N/A"); //TODO remove hack to override
					user.set("lastAddress", key);
					await user.logIn({useMasterKey : true}); //should create new session
				} catch (err) { //else try signup
					await user.save({username : user.get("email"), password : "N/A" , "lastAddress" : key}, {useMasterKey : true}); //should create new session
				}

				await Addresses.saveUserAddress(user, address);

				return jwt.sign({ sessionid : user.getSessionToken(), address : key, signature : signed_message, uid : user.id }, 
					jwtMainKey, { expiresIn: process.env.JWT_EXPIRATION });
			} catch(err) {
				console.log(err);
				let error : any = new Error("Login Error"); error.code = 400; throw error;
			}
		} else {
			let error : any= new Error("Invalid signature"); error.code = 400; throw error;
		}
	}

	static async getAppLoginToken(appId : string, key : string){
		try {
			let address = await Addresses.getEthAddressDB(key);
			return jwt.sign({ appId : appId , address : key, signature : address?.get("signature")}, 
				jwtAppKey, { expiresIn: process.env.JWT_EXPIRATION }); //TODO : use app secret to sign the message
		} catch (err) {
			let error :any = new Error("Address Doesn't Seem to Exist..."); error.code = 400; throw error;
		}
	}
	
	static getVerifyEmailJWT(email : string, appId : string){
		// TODO encrypt for secruity of app ID - also not currently used....
		return jwt.sign({ email: email , appId : appId}, jwtEmailKey, { expiresIn: process.env.JWT_EMAIL_EXPIRATION });
	}

	static async validateSignature(address : Moralis.Object, signed_message : string) {
		let key = address.get("address"); //shorthand
		if ( utils.verifyMessage(key, signed_message, address.get("message")) ) {
			await address.save({signature: signed_message}, {useMasterKey: true});
			await Addresses.nonceRequest(key); // reset the nonce after this request
			return true;
		}

		return false;
	}

}