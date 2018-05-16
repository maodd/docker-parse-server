require('./push-util')();
/*

curl -X POST -H 'X-Parse-Application-Id: 5MJ83bbIupz1en6ezJc5487qfezTY9TBPPcUfSFS' -H 'X-Parse-Master-Key: p4dbNnRA7cqXuPzE7nTRxpLNPSrWcPfFTSOzfc9Y' http://localhost:1337/1/jobs/myJob

*/

function doSomethingVeryLong() {

  return new Promise(resolve => setTimeout(resolve, 1000));

}

Parse.Cloud.job("myJob", function(request, status) {
  // the params passed through the start request
  const params = request.params;
  // Headers from the request that triggered the job
  const headers = request.headers;

  // get the parse-server logger
  const log = request.log;

  // Update the Job status message
  console.log("job started")
  status.message("I just started");
  
  doSomethingVeryLong().then(function(result) {
    // Mark the job as successful
    // success and error only support string as parameters
    status.success("I just finished");
  })
  .catch(function(error) {
    // Mark the job as errored
    status.error("There was an error");
  });
});


Parse.Cloud.job("nightlyJob", function(request, status) {

    processExpiredConsumerOrder(request, status);
    processExpireSoonConsumerOrder(request, status);
    processComingSoonDelivery(request, status);


});

function processExpiredConsumerOrder(request, status) {
    var ConsumerOrder = Parse.Object.extend("ConsumerOrder");
    var query = new Parse.Query(ConsumerOrder);
    query.lessThan("deliveryDate", new Date());
    query.containedIn("status", [0, 1]);
    query.ascending('deliveryDate')

    query.find({
      success: function(results) {
        console.log("Found expired ConsumerOrder: " + results.length + " .");
        // Do something with the returned Parse.Object values
        for (var i = 0; i < results.length; i++) {
          var object = results[i];
          console.log('Processing ' +object.id + ' - ' + object.get('name') 
            + ' expired at '+ object.get('deliveryDate'));

          const recipient = object.get('createdBy');
          const message = "您的订单已经过期，如果需要，请创建新订单。";
          // sendPushNotificationTo(recipient, message);
          saveNotificationMessageTo(recipient, message, message, object, null);

          object.set('status', -1);
          object.save(null, {});

        }

        status.success("processExpiredConsumerOrder finished");
      },
      error: function(error) {
        status.error("Error: " + error.code + " " + error.message);
      }
    });
}

function processExpireSoonConsumerOrder(request, status) {

    var ConsumerOrder = Parse.Object.extend("ConsumerOrder");
    var query = new Parse.Query(ConsumerOrder);
    query.lessThan("deliveryDate", new Date());
    
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); 

    query.greaterThan("deliveryDate", yesterday);
    query.containedIn("status", [0, 1]);
    query.ascending('deliveryDate')

    query.find({
      success: function(results) {
        console.log("Found expire soon ConsumerOrder: " + results.length + " .");
        // Do something with the returned Parse.Object values
        for (var i = 0; i < results.length; i++) {
          var object = results[i];
          console.log('Processing ' +object.id + ' - ' + object.get('name') 
            + ' will expire at '+ object.get('deliveryDate'));

          const recipient = object.get('createdBy');
          const message = "您的订单即将过期，请尽快处理。";
          // sendPushNotificationTo(recipient, message);

          saveNotificationMessageTo(recipient, message, message, object, null);
 
        }

        status.success("processExpireSoonConsumerOrder finished");
      },
      error: function(error) {
        status.error("Error: " + error.code + " " + error.message);
      }
    });

}


function processComingSoonDelivery(request, status) {

    var DeliveryRequest = Parse.Object.extend("DeliveryRequest");
    var query = new Parse.Query(DeliveryRequest);
    query.lessThan("departureDate", new Date());
    
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); 

    query.greaterThan("departureDate", yesterday);
    query.equalTo("isAccepted", true);
    query.ascending('departureDate')

    query.find({
      success: function(results) {
        console.log("Found coming soon Delivery: " + results.length + " .");
        // Do something with the returned Parse.Object values
        for (var i = 0; i < results.length; i++) {
          var object = results[i];
          console.log('Processing ' +object.id + ' - ' 
            + ' will departure at '+ object.get('departureDate'));

          const recipient = object.get('requestBy');
          const message = "您的带物旅程即将开始，请确认在出发前完成订单收/购货。";
          // sendPushNotificationTo(recipient, message);

          saveNotificationMessageTo(recipient, message, "带物提醒", object.get("consumerOrder"), object);
 
        }

        status.success("processExpireSoonConsumerOrder finished");
      },
      error: function(error) {
        status.error("Error: " + error.code + " " + error.message);
      }
    });

}


function saveNotificationMessageTo(recipient, message, title, consumerOrder, deliveryRequest) {

   var Notification = Parse.Object.extend("Notification");
   var notif = new Notification();
   notif.set('title', title);
   notif.set('content', message);
   
   if (deliveryRequest) {
      notif.set('deliveryRequest', deliveryRequest ); 
   }
   
   notif.set('consumerOrder', consumerOrder);
   notif.set('recipient', recipient);
   notif.save(null, {});

}