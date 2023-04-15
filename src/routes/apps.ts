import express, { Response } from "express";
import { check, body } from 'express-validator';
const router = express.Router();

import utils from '../utilities/utils';
import Apps from "../controller/apps";

 /**
  * @swagger 
  * tags:
  *   name: App / Game Management
  *   description: View and manage your application
  */

/**
 * @swagger
 * components:
 *   schemas:
 *     AppName:
 *       type: string
 *       description: The Name of Application on the FusedVR Platform
 *       example: Hello World
 *     AppDescription:
 *       type: string
 *       description: The description for the application and receipt NFTs
 *       example: My App Description
 *     ProfilePic:
 *       type: string
 *       format : binary
 *       description: The profile picture associate with the application
 *       example: png or img binary file
 *     ProfilePicUrl:
 *       type: string
 *       description: The profile picture URL associate with the application
 *       example: https://...
 *     AppId:
 *       type: string
 *       description: App Id created by Developers for their game from /apps/create
 *       example: App ID from /apps/create
 *     EmailCalls:
 *       type: string
 *       description: The Number of Emails sent by the App for the current period
 *       example: 1
 *     MaxEmail:
 *       type: string
 *       description: The Maximum Number of Emails that can be sent for the Application for the current Period
 *       example: 100
 *     ApiCall:
 *       type: string
 *       description: The Number of APIs that can be called by the App for the current period
 *       example: 2
 *     ApiLimit:
 *       type: string
 *       description: The Maximum Number of APIs that can be called by the App for the current period
 *       example: 100
 *     CreateAppBody:
 *       type: object
 *       properties:
 *         name:
 *           $ref: '#/components/schemas/AppName'
 *         description:
 *           $ref: '#/components/schemas/AppDescription'
 *         profile:
 *           $ref: '#/components/schemas/ProfilePic'
 *     UpdateAppBody:
 *       type: object
 *       properties:
 *         id:
 *           $ref: '#/components/schemas/AppId'
 *         name:
 *           $ref: '#/components/schemas/AppName'
 *         description:
 *           $ref: '#/components/schemas/AppDescription'
 *         profile:
 *           $ref: '#/components/schemas/ProfilePic'
 *     ShowAppsResponse:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           id:
 *             $ref: '#/components/schemas/AppId'
 *           name:
 *             $ref: '#/components/schemas/AppName'
 *           profile:
 *             $ref: '#/components/schemas/ProfilePicUrl'
 *     ShowAppRequest:
 *       type: object
 *       properties:
 *         id:
 *           $ref: '#/components/schemas/AppId'
 *     ShowAppResponse:
 *       type: object
 *       properties:
 *         id:
 *           $ref: '#/components/schemas/AppId'
 *         name:
 *           $ref: '#/components/schemas/AppName'
 *         description:
 *           $ref: '#/components/schemas/AppDescription'
 *         profile:
 *           $ref: '#/components/schemas/ProfilePicUrl'
 *         emailCalls:
 *           $ref: '#/components/schemas/EmailCalls'
 *         apiCalls:
 *           $ref: '#/components/schemas/ApiCall'
 */

/**
 * @swagger
 * /apps:
 *   post:
 *     summary: Show all applications associated with an authenticated user
 *     tags: [App / Game Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Provide an optional app id to view a specific app
 *     responses:
 *       200:
 *         description: List all of the app associated with the user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShowAppsResponse'  
 */

router.post("/", async function (req : any, res : Response) {
    try {
        var apps = await Apps.showMyApps(req.user.sessionid);
        res.status(200).send(apps);
    } catch(error) {
        res.status(error.code).send({error : error.message});
    }
});

/**
 * @swagger
 * /apps/show:
 *   post:
 *     summary: Show application with the given id associated with an authenticated user
 *     tags: [App / Game Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Provide an app id to view a specific app
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShowAppRequest'
 *     responses:
 *       200:
 *         description: Application Details for the specified App Id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShowAppResponse'  
 */

 router.post("/show", check('id').exists(),
     async function (req : any, res : Response) {
        try {
            var metadata = await Apps.showApp(req.user.sessionid, req.body.id);
            res.status(200).send(metadata);
        } catch(error) {
            res.status(error.code).send({error : error.message});
        }
});

/**
 * @swagger
 * /apps/create:
 *   post:
 *     summary: Create an application for the authenticated user
 *     tags: [App / Game Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Create an application for the authenticated user
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateAppBody'
 *     responses:
 *       200:
 *         description: App successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppIDObject'  
 */
router.post("/create", 
    check('name').exists(),
    body('profile').custom(Apps.validProfilePic),
    utils.catchValidation,
    async function (req : any, res : Response) {
    try {
        var appId = await Apps.createApp(req.user.sessionid, req.body.name, req.files.profile, req.body.description);
        res.status(200).send({id : appId});
    } catch(error) {
        console.log(error);
        res.status(error.code).send({error : error.message});
    }
});

/**
 * @swagger
 * /apps/update:
 *   post:
 *     summary: Updates an application from app id
 *     tags: [App / Game Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Updates an application for the authenticated user based on the given app id
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAppBody'
 *     responses:
 *       200:
 *         description: App successfully updated
 */
router.post("/update", 
    check('id').custom(Apps.getMoralisAppValidation),
    utils.catchValidation,
    async function (req : any, res : Response) {
    try {
        if (req.files?.profile && !Apps.validProfilePic("", { req } )) { // valiate profile pic if it is there
            res.status(401).send({error : "Profile should be jpeg or png"});
        } else {
            var result = await Apps.updateApp(req.user.sessionid, req.body.id, req.body.name, req.files?.profile, req.body.description );
            res.status(200).send(result);
        }
    } catch(error) {
        console.log(error);
        res.status(error.code).send({error : error.message});
    }
});

/**
 * @swagger
 * /apps/delete:
 *   post:
 *     summary: Deletes an application id associated with the authenticated user's account
 *     tags: [App / Game Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Deletes an application id associated with the authenticated user's account
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppIDObject'
 *     responses:
 *       200:
 *         description: App successfully deleted
 */
router.post("/delete", check('id').custom(Apps.getMoralisAppValidation), utils.catchValidation,
    async function (req : any, res : Response) {
    try {
        var result = await Apps.deleteApp(req.user.sessionid, req.body.id);
        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(error.code).send({error : error.message});
    }
});

module.exports = router;