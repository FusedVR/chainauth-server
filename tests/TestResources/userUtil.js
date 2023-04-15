const Moralis = require('moralis-v1/node');
const crypto = require('crypto');
const ethers = require('ethers');

module.exports = class UserTestUtil {
	constructor(test_email, supertest) { 
		this.TEST_EMAIL = test_email;
		this.requestWithSupertest = supertest;

		return this;
	}

	setMessage = async function(){
		let nonceRes = await this.requestWithSupertest
			.post('/api/auth/getNonce')
			.send({"address": this.wallet.address});
		this.message = nonceRes.body["nonce"];
		this.signedMessage = await this.wallet.signMessage(this.message);
	}

	async userSignUp() { //setup a user with a wallet
		var id = crypto.randomBytes(32).toString('hex');
		let privateKey = "0x" + id;
	
		this.wallet = new ethers.Wallet(privateKey); //save wallet
	
		await this.setMessage();
	
		await this.requestWithSupertest
			.post('/api/auth/connectWeb3')
			.send({"email": this.TEST_EMAIL, "address" : this.wallet.address , signedNonce : this.signedMessage});
	
		let userQuery = new Moralis.Query(Moralis.User);
		userQuery.equalTo("email", this.TEST_EMAIL);
		this.user = await userQuery.first({useMasterKey : true});
		await this.user.save({emailVerified : true}, {useMasterKey : true});
	
		await this.setMessage();
	
		let res = await this.requestWithSupertest
			.post('/api/auth/connectWeb3')
			.send({"email": this.TEST_EMAIL, "address" : this.wallet.address , signedNonce : this.signedMessage});

		this.token = res.body.token; //set token on class
	}

	async userDelete() {
		let userQuery = new Moralis.Query(Moralis.User);
		userQuery.equalTo("email", this.TEST_EMAIL);
		var user = await userQuery.first({useMasterKey : true});
		if (user != null) {
			await user.destroy({useMasterKey : true});
		}
	}
}

