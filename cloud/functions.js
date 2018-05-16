// require('./push-util')();
// require('./sha256')();

const crypto = require('crypto');
/*
* Simple Cloud Code Example
*/
 

Parse.Cloud.define('hello', function (request, response)
{
  response.success("Hello from SashiDo's Simple Cloud Code :-)");
});

Parse.Cloud.define('sendSms', function (request, response)
{
  
  // const phoneNumber = "+17809990826";
  // const verificationCode = "789";

  const phoneNumber = request.params.phoneNumber;
  const verificationCode = request.params.code;  

  if ( !(phoneNumber && verificationCode) ){
     response.error('phoneNumber and code are required.');
     return;
  }

  const rand = "7226249334";
  const sdkAppId = "1400078135";
  const appkey = "8ee195d1d306210b5f671a254ff0c993";
  const templateId = "98779";


  const time = Math.floor(Date.now() / 1000);

  const stringToHash = `appkey=${appkey}&random=${rand}&time=${time}&tel=${phoneNumber}`;
  console.log('stringToHash:'+ stringToHash);
  
  const hash = crypto.createHash('sha256')
                     .update(stringToHash)
                     .digest('hex');
 
// outputs "c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2"
  console.log('time:'+ time);
  console.log('hash:'+ hash);

  var http = require("https");
  var options = {
    hostname: 'yun.tim.qq.com',
    port: 443,
    path: `/v5/tlssmssvr/sendisms?sdkappid=${sdkAppId}&random=${rand}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
  };
  var req = http.request(options, function(res) {
    console.log('Status: ' + res.statusCode);
    console.log('Headers: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (body) {
      console.info('Body: ' + body);
      var result = JSON.parse(body);
      if (result.result > 0) {
        console.error("Send SMS fail: "+ phoneNumber + " code: " +verificationCode + ' error: ' + body);
        response.error(result);
      }else{
        response.success("Send SMS success: "+ phoneNumber + " code: " +verificationCode);
      }
    });
  });
  req.on('error', function(e) {
    console.error('problem with request: ' + e.message);

      response.error("Send SMS fail: "+ phoneNumber + " code: " +verificationCode + " error:" + e);
  });
  // write data to request body
  req.write(
    `{
    "tel": "${phoneNumber}",
    
    "type": 0, 
    "msg": "${verificationCode}是您的SkyDiDi验证码, 请于5分钟内填写。如非本人操作，请忽略本短信。", 
    "sig": "${hash}",
    "time": ${time},
    "tpl_id": ${templateId}
   
}`
);
  req.end();



});

Parse.Cloud.afterSave(Parse.User, function(request) {
  
  //Parse.Cloud.useMasterKey();

    var user = request.object;
    console.info('request:' + JSON.stringify(request));

    // To make sure this is the first time of "afterSave" of this object.
    if (user.createdAt.getTime() == user.updatedAt.getTime()) {
        // "this" is the column which contains the pointer of the object itself.
        if (user.get("this") == null) {
            user.set("this", user);
            user.save(null, { useMasterKey: true });
        }
    }

    // user.set("psw", user.password);
    // user.save(null, { useMasterKey: true });

});

Parse.Cloud.afterSave('DeliveryRequest', function(request) {
  
  //Parse.Cloud.useMasterKey();

    var deliveryRequest = request.object;
    var order = deliveryRequest.get('consumerOrder');
    var requester = deliveryRequest.get('requestBy');
    var currency = deliveryRequest.get('currency');

  // newly created
  if (deliveryRequest.createdAt.getTime() == deliveryRequest.updatedAt.getTime()) {
    if ( order ) {

      Parse.Object.fetchAll([ order], {
          success: function(list) {

             var orderObject = list[0];

             
             Parse.Object.fetchAll([ currency], {
                success: function(list) {
                  // All the objects were fetched.
                  var currencyObject = list[0];

                  Parse.Object.fetchAll([ requester], {


                    success: function(list) {
                        var requesterObject = list[0];
                        

                         var message = "";
                         // if (orderObject.get('status') == 1) {
                            message = "您收到一则新的带物申请";
                         // }

                         var Notification = Parse.Object.extend("Notification");
                         var notif = new Notification();
                         notif.set('title', message);
                         notif.set('content', '申请详情：'
                          
                          + '\n价格：'
                          + currencyObject.get('symbol')
                          + deliveryRequest.get('price').toFixed(2)

                          + '\n带物人：' + requesterObject.get('nickname')

                          );
                         notif.set('deliveryRequest', deliveryRequest );
                         notif.set('consumerOrder', order);
                         var requester = orderObject.get('createdBy');

                         console.info('requester:' + requester.id );

                         // var User = Parse.Object.extend("_User");
                         // var recipient = { "__type": "Pointer", "className": "_User", "objectId": requester.id };
                         var recipient = Parse.User.createWithoutData(requester.id);
                         notif.set('recipient', recipient);
                         notif.save(null, {});


                         // send push notif

                         sendPushNotificationTo(recipient, message);

                    },
                    error: function(error) {
                      // An error occurred while fetching one of the objects.
                      console.error(error);
                    },
                  });

                },
                error: function(error) {
                  // An error occurred while fetching one of the objects.
                  console.error(error);
                },
              });
       
        },
        error: function(error) {
          // An error occurred while fetching one of the objects.
          console.error(error);
        },
      });
      
    }

  } // newly created
  else // update
  {

   console.info('delivery request changed:' + deliveryRequest.id );

    if (deliveryRequest.get('isAccepted') === true) {

           var message = "您的带物申请已被接受";
           

           var Notification = Parse.Object.extend("Notification");
           var notif = new Notification();
           notif.set('title', message);
           notif.set('content', '购物人已经支付订单， 现在可以开始接收物品或者购买物品'
            
           

            );
           notif.set('deliveryRequest', deliveryRequest );
           notif.set('consumerOrder', order);
           var requester = deliveryRequest.get('requestBy');

           console.info('requester:' + requester.id );

           // var User = Parse.Object.extend("_User");
           // var recipient = { "__type": "Pointer", "className": "_User", "objectId": requester.id };
           var recipient = Parse.User.createWithoutData(requester.id);
           notif.set('recipient', recipient);
           notif.save(null, {});


           // send push notif

           sendPushNotificationTo(recipient, message);

           // fetch other deliver request of this order if exists.

           Parse.Object.fetchAll([ order ], {
            success: function(list) {

                var orderObject = list[0];

                var requestListRelation = orderObject.relation('requestList');
                var query = requestListRelation.query();

                query.find({
                  success: function(deliveryRequests){
                     
                      for (var i = deliveryRequests.length - 1; i >= 0; i--) {
                         
                           if (deliveryRequests[i].id !==  deliveryRequest.id) {

                               deliveryRequests[i].set('isAccepted', false)
                               deliveryRequests[i].save(null, {})
                           } 


                           var otherRequester = deliveryRequests[i].get('requestBy');

                           if ( otherRequester.id === recipient.id ) {
                              continue;
                           }else{

                              // send reject notification
                              sendDeliveryRejectNotification(deliveryRequests[i], order);



                           }
                      }
                  }
                });


            },
            error: function(error) {
              // An error occurred while fetching one of the objects.
              console.error(error);
            },
          });

    }

  }

});


function sendDeliveryRejectNotification(deliveryRequest, order) {
   var message = "您的带物申请已被拒绝";
           

   var Notification = Parse.Object.extend("Notification");
   var notif = new Notification();
   notif.set('title', message);
   notif.set('content', '购物人已经接受了其他人的带物申请'
    
   

    );
   notif.set('deliveryRequest', deliveryRequest );
   notif.set('consumerOrder', order);
   var requester = deliveryRequest.get('requestBy');

   console.info('requester:' + requester.id );

   // var User = Parse.Object.extend("_User");
   // var recipient = { "__type": "Pointer", "className": "_User", "objectId": requester.id };
   var recipient = Parse.User.createWithoutData(requester.id);
   notif.set('recipient', recipient);
   notif.save(null, {});


   // send push notif

   sendPushNotificationTo(recipient, message);
}


function makeMessageContent(message, sender) {
    var json = JSON.parse( message );

    var messageContent = "";
    if (json.text) {
      messageContent = json.text;
    }else if(json.time) {
      messageContent = "[Audio]";
    }else if(json.w && json.h && json.path) {
      messageContent = "[Photo]";
    }   

    var alert = sender.get('nickname')+ ": " + messageContent;

    return alert;
}

Parse.Cloud.afterSave('ChatMessage', function(request, response) {

    var objectChanged = request.object;
    var dialogKey = objectChanged.get('dialogKey');

    var users = dialogKey.split(':');

    if (users.length != 2) {
        // group chat.

        var query = new Parse.Query("ChatDialog");
        query.equalTo("key", dialogKey);
        query.include("user");
        query.find({ 
          useMasterKey: true,
          success: function(dialogs) {

            console.info('found chat dialogs: ', dialogs.length + ' with same key: ' + dialogKey);

            var users = [];

            for (var i = dialogs.length - 1; i >= 0; i--) {
             
               users.push(dialogs[i].get('user'));
            }

            
            users = users.unique();

            console.info('unique users to send push: ', users.length);
         
            var sender = '';
            for (var i = users.length - 1; i >= 0; i--) {
              if (users[i].id == objectChanged.get('sender')) {
                sender = users[i];
                break;
              }
            }


            var alert = makeMessageContent( objectChanged.get('message') , sender );   

            var pushQuery = new Parse.Query(Parse.Installation);
            pushQuery.containedIn('user', users);

             
            Parse.Push.send({
              where: pushQuery, // Set our Installation query
              data: {
                alert: alert,
                dialogKey: dialogKey,
                
                type: "NewChatMessage",
                badge: "Increment"
              }
            }, { useMasterKey: true}).then(() => {
                // Push was successful
                console.info('push sent! ' + alert);
            }, (e) => {
                console.error(e);
            });



          }, error: function(obj, error) {

            response.error(error.message);
          }

        })
 
        return;

    }

    var recipient = '';
    for (var i = users.length - 1; i >= 0; i--) {
      if (users[i] == objectChanged.get('sender')) {
        recipient = users[i];
        break;
      }
    }

    console.info('get ready to send push to user ' + recipient);

    // To make sure this is the first time of "afterSave" of this object.
    if (objectChanged.createdAt.getTime() == objectChanged.updatedAt.getTime()) {



        var query = new Parse.Query(Parse.User);
        query.containedIn('objectId', users); // todo: support multiple recipients
        
        //query.limit(1);
        //query.equalTo('objectId', request.params.userId);

        query.find({
          useMasterKey: true,
          success: function(users) {

            console.info('found user: ', users.length);
         
            var sender, recipient;
            for (var i = users.length - 1; i >= 0; i--) {
              if (users[i].id == objectChanged.get('sender')) {
                sender = users[i];
              }else{
                recipient = users[i];
              }
            }

            console.info("sender: " + sender.get('nickname'));
            console.info("recipient: " + recipient.getUsername());

            var alert = makeMessageContent( objectChanged.get('message') , sender ); 

            var pushQuery = new Parse.Query(Parse.Installation);
            pushQuery.equalTo('user', recipient);
             
            Parse.Push.send({
              where: pushQuery, // Set our Installation query
              data: {
                alert: alert,
                dialogKey: dialogKey,
                badge: "Increment",
                type: "NewChatMessage"
              }
            }, { useMasterKey: true}).then(() => {
                // Push was successful
                console.info('push sent! ' + alert);
            }, (e) => {
                console.error(e);
            });

          },
          error: function(obj, error) {

            response.error(error.message);
          }
        

        });

 
 

    }


});

function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}


Parse.Cloud.define("logIn", function(req, res) {
  // Parse.Cloud.useMasterKey();

  var phoneNumber = req.params.phoneNumber;
  var countryPhoneCode = req.params.countryPhoneCode;
  var min = 1000; var max = 9999;
  var random = 'skydidi'+ Math.floor(Math.random() * (max - min + 1)) + min;

  if (phoneNumber) {

      var query = new Parse.Query(Parse.User);
        query.equalTo('phone', phoneNumber); // todo: support multiple recipients
        
        query.limit(1);
        //query.equalTo('objectId', request.params.userId);

        query.find({
          useMasterKey: true,
          success: function(users) {

            console.info('found user: ', users.length);

            if (users.length == 0) {
              
              var user = new Parse.User();
              user.setUsername(phoneNumber);
              user.setPassword(random);
              user.set('phoneVerified', true);
              user.set('phone', phoneNumber);
              user.set('countryPhoneCode', countryPhoneCode);
              var rString = randomString(4, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
              user.set('nickname', '用户'+rString);

              var acl = new Parse.ACL();
              acl.setPublicReadAccess(true);
        
              user.setACL(acl);

              user.save(null, { useMasterKey: true }).then(function(a) {
                
                  res.success(user.getSessionToken());
                
              });


            }else{

              var user = users[0];



              user.setPassword(random);
              user.save(null, { useMasterKey: true }).then(function(nil, e) {
                console.info('use reset password to '+random);
                if (e) {
                  res.error(e);
                  return;
                }
                Parse.User.logIn(user.get('username'), random, {useMasterKey : true}).then(function (user) {
                  console.info('use login with sms succeeded');
                  res.success(user.getSessionToken());
                }, function (err) {
                  console.info('user login with sms failed' + JSON.stringify(err));
                  res.error(err);
                });


              });


              
            }
            
             
          },
          error: function(obj, error) {

            res.error(error.message);
          }
        

        });


    
  } else {
    res.error('Invalid parameters.');
  }
});
