module.exports = function() { 
    this.sendPushNotificationTo = function (recipient, message) {

    var pushQuery = new Parse.Query(Parse.Installation);
    pushQuery.equalTo('user', recipient);
     
    Parse.Push.send({
          where: pushQuery, // Set our Installation query
          data: {
            alert: message,
            type: "Notification",
            badge: "Increment"
          }
      }, { useMasterKey: true}).then(() => {
          // Push was successful
          console.info('push sent! ' + alert);
      }, (e) => {
          console.error('push fail: ' + e);
      });
    
     

  };

}