//MAKING A NOTE HERE WHY I AM DOING AN EXPRESS SERVER
//CURRENTLY CLOUD FUNCTIONS ONLY SUPPORT GET REQUESTS WHICH IS NOT SECURE FOR PASSWORDS
//ALSO NEED SUPPORT FOR MULTI REGION, which MORALIS doesnt do
//IDEALLY ALSO WANT BEARER TOKEN
//LOCK INTO THEIR EMAIL

import path from "path";
require('dotenv').config({ path: path.join(__dirname, 'env', '.env.' + process.env.NODE_ENV) });

import express, { Request, Response, NextFunction } from 'express';
import fileUpload from 'express-fileupload';
import bodyParser from "body-parser";
import bearerToken from "express-bearer-token";
import winston from "winston";
import expressWinston from "express-winston";

import PlanLimits from './controller/planLimits';
import utils from './utilities/utils';

import Moralis from 'moralis-v1/node';
const serverUrl = process.env.MORALIS_URL;
const appId = process.env.MORALIS_APP_ID;
const masterKey = process.env.MORALIS_MASTER_KEY;

Moralis.start({ serverUrl, appId, masterKey });

const app = express();
app.use(fileUpload({  
  limits: { 
    fileSize: 4 * 1024 * 1024 * 1024 //4MB max file(s) size
  },
  abortOnLimit: true
}));
app.use(bearerToken());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(expressWinston.logger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
  expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
}));


var corsOptions = {
  origin: [/\.fusedvr\.com$/ , /localhost:5000/ ]
}

var cors = require('cors');
app.use(cors(corsOptions)) // include before other routes

app.use("/api/auth", require("./routes/auth"));
app.use("/api/addresses", utils.verifySession, require("./routes/keys"));
app.use("/api/apps", utils.verifySession, utils.catchValidation, require("./routes/apps"));
app.use("/api/plans", utils.verifySession, utils.catchValidation, require("./routes/plans"));

app.use("/api/fused", require("./routes/fused/magiclink"));
app.use("/api/nfts", require("./routes/fused/nfts"));
app.use("/api/account", utils.verifyAppSession, utils.incrementAppAPIs, require("./routes/fused/account"));

var devAPI = require("./routes/fused/dev-docs");
app.use("/", devAPI);
app.use("/api", devAPI);

app.get('*', function(req : Request, res : Response){
  res.sendStatus(404);
});


// Custom server error handler
app.use((err: any, req : Request, res: Response, next: NextFunction) => {
  if (err) {
    console.error(err.message)
    if (!err.statusCode) {err.statusCode = 500} // Set 500 server code error if statuscode not set
    return res.status(err.statusCode).send({
      statusCode: err.statusCode,
      message: err.message
    })
  }

  next();
  return null;
});

PlanLimits.initPlans(); //initalize plans if missing

const PORT = process.env.PORT || 443;
module.exports = app.listen(PORT);

console.debug("Server listening on port: " + PORT);