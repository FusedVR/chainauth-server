import { Request, Response, NextFunction } from "express";
import { Result } from "express-validator";

import * as ethutil from 'ethereumjs-util';
import web3 from 'web3';
import jwt, { Secret } from 'jsonwebtoken';
import { validationResult } from 'express-validator';

import nodemailer from 'nodemailer';
import postmarkTransport from 'nodemailer-postmark-transport';
import Apps from "../controller/apps";

export default class Utils {
	static SuportedChains : {[key: string]: string} = { 'eth' : '0x1' , 'goerli' : '0x5', 'sepolia' : '0xaa36a7', 'polygon' : '0x89', 'mumbai' : '0x13881',
					'bsc' : '0x38', 'bsc testnet' : '0x61', 'avalanche' : '0xa86a', 'avalanche testnet' : '0xa869', 'fantom' : '0xfa',
					'cronos' : '0x19', 'cronos testnet' : '0x152', 'arbitrum' : '0xa4b1'};

	//API sleeps for ms number of seconds 
	static sleep (ms:number) : Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	//sends an email based on parameters and env variables
	static sendEmail( toAddress:string, subject:string, content:string ) : void {
		const transporter = nodemailer.createTransport(postmarkTransport({
			auth: {
			  apiKey: process.env.POSTMARK_API_KEY as string
			}
		}));

		const mailOptions = {
			from: process.env.EMAIL_SENDER,
			to: toAddress,
			subject: subject,
			html: content
		  };
	
		transporter.sendMail(mailOptions, function(error:Error, info:any){
		  if (error) {
			console.log("Sending Email Error :" + error);
		  }
		});
	}

	//sends an email based on parameters and env variables
	static sendTemplateEmail( toAddress:string, templateAlias:string, variables:object ) : void {
		const transporter = nodemailer.createTransport(postmarkTransport({
			auth: {
			  apiKey: process.env.POSTMARK_API_KEY as string
			}
		}));

		const mailOptions = {
			from: process.env.EMAIL_SENDER,
			to: toAddress,
			templateAlias: templateAlias,
			templateModel: variables
		  };
	
		transporter.sendMail(mailOptions, function(error:Error, info:any){
		  if (error) {
			console.log(error);
		  } else {
			console.log('Email sent: ' + info.response);
		  }
		});
	}


	//verifies if public key would have signed the message
	static verifyMessage (public_key:string, signed_message:string, original_message:string) : boolean {
		original_message = "\x19Ethereum Signed Message:\n" + original_message.length + original_message; //this is because this gets prefixed to the message signature
		try {
			const sig = ethutil.fromRpcSig(signed_message); //requires 0x leading
			const publicKey = ethutil.ecrecover( Buffer.from( web3.utils.soliditySha3(original_message)?.substring(2) as string, 'hex' )
				, sig.v, sig.r, sig.s);
			const address = "0x" + ethutil.pubToAddress(publicKey).toString('hex');
	
			const isVerified = public_key.toLowerCase() === address.toLowerCase();
			return isVerified;
		} catch {
			return false; //error parsing signature
		}
	}

	static verifySession (req:any, res:Response, next:NextFunction) : Response<any, Record<string, any>> | null{
		//Auth header value = > send token into header
		try {
			const decoded = jwt.verify(req.token, process.env.JWT_MAIN_SECRET_KEY as Secret);
			req.user = decoded; //cannot add user to Request unless req is marked as any
			next();
			return null;
		} catch (err) {
			console.log("From Utils Verify Session : " + err.message);
			return res.status(401).send("Invalid Token");
		  }   
	}

	static verifyAppSession (req:any, res:Response, next:NextFunction) : Response<any, Record<string, any>> | null {
		//Auth header value = > send token into header
		try {
			const decoded = jwt.verify(req.token, process.env.JWT_APP_SECRET_KEY as Secret);
			req.user = decoded; //includes sessionID,  App Id, and verified public key //TODO update JWT and rename to player
			next();
			return null;
		} catch (err) {
			console.log("From Utils Verify App Session : " + err.message);
			return res.status(401).send("Invalid Token");
		}   
	}

	static async incrementAppAPIs (req:any, res:Response, next:NextFunction) : Promise <Response<any, Record<string, any>> | null> {
		try {
			await Apps.incrementAppApi(req.user.appId);
			next();
			return null;
		} catch (err) {
			console.log("From Increment App APIs : " + err.message);
			return res.status(401).send("Max API Limit Reached for " + req.user.appId);
		}   
	}

	static validAddress (public_key:string) : boolean{
		return ethutil.isValidAddress(public_key);
	}
	
	static validContract (contract:string) : boolean{
		//TODO check if contract actually a contract instead of an address
		return ethutil.isValidAddress(contract);
	}

	//moralis chains :  eth, 0x1, ropsten, 0x3, rinkeby, 0x4, goerli, 0x5, kovan, 0x2a, polygon, 0x89, mumbai, 0x13881, bsc, 0x38, bsc testnet, 0x61, avalanche, 0xa86a, avalanche testnet, 0xa869, fantom, 0xfa
	static validChain (chain:string) : boolean {
		var allChains = Object.values(Utils.SuportedChains).concat(Object.keys(Utils.SuportedChains));
		return allChains.includes(chain);
	}

	static convertChain (chain:string) {
		if (chain in Utils.SuportedChains) {
			return Utils.SuportedChains[chain];
		} else {
			return chain;
		}
	}

	//catches validation errors from a request and if any, it will return those errors back 
	static catchValidation(req:Request, res:Response, next:NextFunction) {
		const errors:Result = validationResult(req);
		if (errors.isEmpty()) {
		  return next();
		}
		const extractedErrors:any[] = [];
		errors.array().map( (err :any) => extractedErrors.push({ [err.param]: err.msg }));
	  
		console.log("Extracted Errors : " + JSON.stringify(extractedErrors));
		return res.status(422).json({
		  errors: extractedErrors,
		});
	}

	// Returns a random uniquie id
	static uuidv4() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		  var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		  return v.toString(16);
		});
	}

	// Returns a random number between min (inclusive) and max (inclusive)
	static random(min : number, max : number) {  
		return Math.floor(
			Math.random() * (max - min + 1) + min
		)
	}
}