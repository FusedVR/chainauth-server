# FusedVR ChainAuth APIs

This project is the open source backend that powers the FusedVR ChainAuth APIs, which provides a simplified solution to Game Developers for one of the many difficulties when developing a Web 3 standalone game : **authenticating a player's non-custodial wallet to prove ownership of the tokens, NFTs, or other digital assets a player owns**

The code base is written in Typescript / NodeJS with an Express server that powers the authentication and app management APIs that are exposed at [https://crypto.fusedvr.com](https://crypto.fusedvr.com).

## Requirements

- npm
- nodejs

## Directory Overview

```
  ├── src                   # typescript source code
  │   ├── controller
  │   ├── routes
  │   ├── utilities
  │   ├── server.js
  ├── .github\workflows     # github workflows
  │   ├── build.yml
  │   ├── tests.yml
  ├── tests                 # test cases for the project
  ├── ├── ControllerTests 
  ├── ├── RoutesTests
  ├── ├── TestResources
  ├── ├── UtilitiesTests
  ├── moralis-cloud-function # functions to be deployed to moralis parse server
  ├── package.json           
  ├── package-lock.json 
  ├── Dockerfile     
  └── .gitignore
  └── .env.template
```

All the core typescript code is located in the src folder is broken into :
- Controller : for all core logic is responsible for power the APIs
- Routes : using Express, APIs are opened and documented in these files
- Utilities : utility functions that support the routes and controller
- server.js : main entry point for the backend server

## Installation

All commands to build and run the backend are located in the **package.json** file. Install all the dependencies with **npm install**

To build the project, run **npm run prod:build**. This will create the Javascript build in the app folder of the project. 

Once the project has been built, create a **env** folder in the newly created **app** folder. Copy the **.env.template** into the env folder. Rename the copy to **.env.dev** or **.env.prod**, depending on the production or development settings you would like to use. 

The environment file should contain information about a Moralis server, a Postmark API for sending e-mails, and random values for secret keys. If you are using Github actions, these values should be included in your Github Secrets. 

Once the environment file is setup, you can run the included Unit Tests with **npm run tests**

To run in development mode with a dev env file, you may use **npm run dev:start** or **npm run dev:build:start** to run the API server.
To run in production mode with a prod env file, you may use **npm run prod:start** or **npm run prod:build:start** to run the API server.

Once the backend is up, you can start calling the APIs. If you would like to connect this to a front end, please refer to the chainauth-console : [https://github.com/FusedVR/chainauth-console](https://github.com/FusedVR/chainauth-console). 

## Environment variables

The following is the template that is used to set the environment variables. 

```
MORALIS_APP_ID = YOUR KEY HERE
MORALIS_URL = YOUR URL HERE
MORALIS_MASTER_KEY = YOUR KEY HERE

PORT = 3000
HOST = http://localhost

EMAIL_SENDER = noreply@fusedvr.com
POSTMARK_API_KEY = KEY HERE

JWT_MAIN_SECRET_KEY = RANDOM KEY HERE
JWT_EXPIRATION = TIME IN SECONDS HERE

JWT_EMAIL_SECRET_KEY = RANDOM KEY HERE
JWT_EMAIL_EXPIRATION = TIME IN SECONDS HERE

JWT_APP_SECRET_KEY = RANDOM KEY HERE
```

The first section contains variables for your Moralis server. You will need to setup a Moralis server, which can be self hosted following [their documentation](https://v1docs.moralis.io/moralis-dapp/getting-started/self-hosting-moralis-server)

The second section contains variables for which PORT and Domain is the node js server hosted on. 

The third section contains variables for using Postmark to send emails for the magic link and authentication

The following sections are variables for Keys you would like to set up for making sure data you pass with the server using JWT is secured. 

## Github Actions CI/CD
 
The CI/CD pipelin will run tests and build the docker image, which can be deployed to Google Cloud. This requires a GCloud Service Key, which is created in an IAM like so [https://cloud.google.com/iam/docs/creating-managing-service-account-keys](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)

The Key needs to be base64 encoded, which can be done with the following command:

`cat <json private key file> | base64 -w 0`

For the environment to be setup from the CI/CD you must add Github Secrets such as PROD_ENV_FILE which contain the JSON values for the environment variable. 

Once the Docker image has been built and pushed to Google Cloud. It will be stored in the Docker Registry. It is then recommended to deploy that container in a serverless environment like Google Cloud Run. 

## Moralis Jobs & Syncs (optional)

In order to run automated tasks for updating the database, we have a few set jobs that are setup with Moralis

- Moralis Syncs enables us to listen for events from Cask to which we can update our database and application plans
- Clean up automation is setup as a job in order to ensure the database does not have lingering codes

In order to push these tasks to Moralis automation, we need to use the [Moralis CLI](https://v1docs.moralis.io/moralis-dapp/cloud-code/cloud-functions#ide-setup). This document then illustrates what needs to happen in order to push code to our specific application. Eventually pushing the code should be integrated with our CI / CD.

However, there will always be a manual step in production to setup the Syncs to the specific smart contract and set the schedule for when Jobs run. 
