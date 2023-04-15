//https://raw.githubusercontent.com/CaskProtocol/cask-js-sdk/main/src/core/abi/testnet/ICaskSubscriptions.js
//https://docs.cask.fi/protocol-deployments/testnet
//https://github.com/CaskProtocol/cask-webhook-bridge#webhook-event-list
//To update this code, can pull the keys from the Moralis website

// need to setup a flow for renewals but now we can get a subscription and then allow users to associate with an application
// from the front end we can have one click to subscribe per app, but backend should keep it seperate

Moralis.Cloud.afterSave("CaskSubCreate", async function (request) {
  let logger = Moralis.Cloud.getLogger();
  let confirmed = request.object.get("confirmed");

  logger.info("Sub Create is Confirmed : " + confirmed);
  logger.info("Plan Id " + request.object.get("planId"));

  if (confirmed){
    var PlansDefinition = Moralis.Object.extend("PlanLimits");
    let planQuery = new Moralis.Query(PlansDefinition);
    planQuery.equalTo("planId", request.object.get("planId"));
    let plan = await planQuery.first();

    if (plan) { //could also check if the provider is me if needed
      logger.info("Subscription Id " + request.object.get("subscriptionId"));
      var attributes = { subscriptionId : request.object.get("subscriptionId"), "planId" : request.object.get("planId") , 
      address : request.object.get("consumer").toLowerCase(), subscribed : true };
      var SubsDefinition = Moralis.Object.extend("Subscriptions");
      var subscription = new SubsDefinition(attributes);
      await subscription.save(null, {useMasterKey : true}); //only need to save subscription since it needs to be assigned to app
    } else {
        logger.info("Subscription Create Failed : No Associated Plan");
    }
  }

});

//on SubscriptionRenewed we need to reset analytics for the app
Moralis.Cloud.afterSave("CaskSubRenewal", async function (request) {
  let logger = Moralis.Cloud.getLogger();
  let confirmed = request.object.get("confirmed");
  logger.info("Sub Renewal is Confirmed : " + confirmed);
  if (confirmed) {
    var SubDefinition = Moralis.Object.extend("Subscriptions");
    let subQuery = new Moralis.Query(SubDefinition);
    subQuery.equalTo("subscriptionId", request.object.get("subscriptionId"));
    logger.info("Subscription ID : " +  request.object.get("subscriptionId"));
    let sub = await subQuery.first();

    //TODO consider giving a master key to these Moralis Cloud Functions to call the FusedVR APIs and update
    if (sub) { 
      if (sub.get("appId")) {
        logger.info("Subscription App ID : " +  sub.get("appId"));
        let appQuery = new Moralis.Query("Apps");
        let app = await appQuery.get(sub.get("appId"));
  
        var AppStatsDefinition = Moralis.Object.extend("AppStats");
        let statsQuery = new Moralis.Query(AppStatsDefinition);
        statsQuery.equalTo("app", app);
        statsQuery.descending("createdAt");
        let stat = await statsQuery.first(); //get previous App Stats for app

        var attributes = { "app" : app , "sentMail" : 0, "emailLimit" : stat.get("emailLimit"), 
          "apiCalls" : 0, "apiLimit" : stat.get("apiLimit") };
        var appStats = new AppStatsDefinition(attributes);
        await appStats.save(null, {useMasterKey : true});
      }

    } else {
      logger.info("No associated subscription in Database for Renewal");
    }
  }
});

//cask sub cancel
Moralis.Cloud.afterSave("CaskSubBurn", async function (request) {
  let logger = Moralis.Cloud.getLogger();
  let confirmed = request.object.get("confirmed");
  logger.info("Sub Cancel is Confirmed : " + confirmed);
  if (confirmed) {
    var SubDefinition = Moralis.Object.extend("Subscriptions");
    let subQuery = new Moralis.Query(SubDefinition);
    subQuery.equalTo("subscriptionId", request.object.get("subscriptionId"));
    let sub = await subQuery.first();

    logger.info( "Cancel Subscription : " + request.object.get("subscriptionId") );

    //TODO consider giving a master key to these Moralis Cloud Functions to call the FusedVR APIs and update
    if (sub) { 

      var PlansDefinition = Moralis.Object.extend("PlanLimits");
      let planQuery = new Moralis.Query(PlansDefinition);
      planQuery.equalTo("planId", request.object.get("planId"));
      let plan = await planQuery.first();

      logger.info( "Removing Subscription from App : " + sub.get("appId") );
      if (sub.get("appId")) {
        let appQuery = new Moralis.Query("Apps");
        let app = await appQuery.get(sub.get("appId"));
  
        var AppStatsDefinition = Moralis.Object.extend("AppStats");
        let statsQuery = new Moralis.Query(AppStatsDefinition);
        statsQuery.equalTo("app", app);
        statsQuery.descending("createdAt");
        let stat = await statsQuery.first(); //get previous App Stats for app
  
        let emailLimit = stat.get("emailLimit") - plan.get("emailLimit");
        let apiLimit = stat.get("apiLimit") - plan.get("apiLimit");

        logger.info( "New Canceled Email Limit : " + emailLimit );
        logger.info( "New Canceled API Limit : " + apiLimit );

        var attributes = { "app" : app , "sentMail" : 0, "emailLimit" : emailLimit, 
          "apiCalls" : 0, "apiLimit" : apiLimit };
        var appStats = new AppStatsDefinition(attributes);
        await appStats.save(null, {useMasterKey : true});
      }

      await sub.destroy(); //eventually save the data with a subscribed flag
      //await sub.save({subscribed : false}, {useMasterKey : true});
    } else {
      logger.info("No assocaited subscription for Sub Cancel");
    }
  }
});