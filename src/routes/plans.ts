import express, { Response } from "express";
import { check, body } from 'express-validator';
const router = express.Router();

import Subscription from "../controller/subscription";
import PlanLimits from "../controller/planLimits";

 /**
  * @swagger 
  * tags:
  *   name: Billing Plans for FusedVR ChainAuth
  *   description: View all the plans that are avaliable and their limits and view the subscription plan you are on
  */

 /**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionId:
 *       type: string
 *       description: Subscription Id from a Cask.fi subscription
 *       example: Sub ID from Cask.Fi
 *     PlanId:
 *       type: string
 *       description: Subscription Plan Id from a Cask.fi subscription
 *       example: Plan ID from Cask.Fi
 *     Address:
 *       type: string
 *       description: Public Key Address for wallet
 *     EmailCalls:
 *       type: number
 *       description: The number of emails that have been sent within the subscription period
 *       example: 42
 *     ApiCalls:
 *       type: number
 *       description: The number of api calls that have been made within the subscription period
 *       example: 357
 *     EmailLimit:
 *       type: number
 *       description: The number of emails that are allowed to be sent for the given plan per month
 *       example: 100
 *     ApiLimit:
 *       type: number
 *       description: The number of api calls that are allowed to be made for the given plan per month
 *       example: 1000
 *     AllPlansResponse:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           planId:
 *             $ref: '#/components/schemas/PlanId'
 *           emailLimit:
 *             $ref: '#/components/schemas/EmailLimit'
 *           apiLimit:
 *             $ref: '#/components/schemas/ApiLimit'
 *     MyPlanResponse:
 *       type: object
 *       properties:
 *         emailCalls:
 *           $ref: '#/components/schemas/EmailCalls'
 *         apiCalls:
 *           $ref: '#/components/schemas/ApiCalls'
 *         emailLimit:
 *           $ref: '#/components/schemas/EmailLimit'
 *         apiLimit:
 *           $ref: '#/components/schemas/ApiLimit'
 */

/**
 * @swagger
 * /plans/all:
 *   post:
 *     summary: Show all subscriptions from Cask.fi and their terms.
 *     tags: [Billing Plans for FusedVR ChainAuth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all subscriptions from Cask.fi and associated address and Cask.Fi plan id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AllPlansResponse'  
 */
router.post("/all", async function (req : any, res : Response) {
    try {
        var metadata = await PlanLimits.getAllPlans();
        res.status(200).send(metadata);
    } catch(error) {
        res.status(error.code).send({error : error.message});
    }
});

/**
 * @swagger
 * /plans/mine:
 *   post:
 *     summary: Show subscription from Cask.fi associated with an authenticated user.
 *     tags: [Billing Plans for FusedVR ChainAuth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription details from Cask.fi and associated address for the Cask.Fi plan id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MyPlanResponse'  
 */
router.post("/mine", async function (req : any, res : Response) {
    try {
        var metadata = await Subscription.mySubscription(req.user.sessionid);
        res.status(200).send(metadata);
    } catch(error) {
        res.status(error.code).send({error : error.message});
    }
});



module.exports = router;
