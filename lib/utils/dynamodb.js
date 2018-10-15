var aws = require("aws-sdk");
var async = require("async");
var config = require("../../config.json");

var dynamo = new aws.DynamoDB();
var maxBatchSize = 100;

module.exports = function() {
  var that = {
    dynamo : dynamo,
    getUserWithKey : function(callback, session, key) {
      var chunks = session.split('.');
      var user_id = chunks[0];
      var token = chunks[1];
      var user = {}
      //We need to get the user info and the key info and make sure they are a match.
      async.parallel([function(resolve) {
        var send = {
          TableName: 'Users',
          Key: {
            UserID:{S:user_id}
          }
        }
        dynamo.getItem(send,function(err,data) {
          if(err) console.log(err);
          if(data.Item && data.Item.UserID) {
            var result = obj_from_dynamo(data.Item);
            if(result.Tokens && result.Tokens[token]) {
              //Token exists, but has it expired?
              if(parseInt(result.Tokens[token]) > parseInt(Math.floor(Date.now() / 1000))) {
                user.user = result;
                resolve();
                return;
              }
            }
          }
          user.user = false;
          resolve();
        })
      },function(resolve) {
        var send = {
          TableName : 'Apikeys',
          Key : {
            Apikey : {
              S : key
            }
          }
        }
        dynamo.getItem(send, function(err, data) {
          if(err) console.log(err);
          if(data.Item && data.Item.Apikey) {
            user.key = obj_from_dynamo(data.Item);
          }
          resolve()
        });
      }],function() {
        if(!user.user || !user.key) {//false or undefined? authentication failure
          callback(false);
          return;
        }
        if(user.user.UserID != user.key.UserID && user.user.UserType != 'Admin') {//Not your key. Simply logging in again should switch to a usable key. Admins (e.g. Leo employees) can use any key.
          callback(false);
          return;
        }
        user.user.key = user.key;
        var send = {
          TableName : 'Clients',
          Key : {
            ClientID : {
              S : user.user.key.ClientID
            }
          }
        }
        dynamo.getItem(send,function(err,data) {
          user.user.client = obj_from_dynamo(data.Item);
          callback(user.user);
        });
        
      });
      
    },
    getCustomer : function(callback, key, access) {
      var send = {
        TableName : 'Apikeys',
        Key : {
          Apikey : {
            S : key
          }
        }
      }
      dynamo.getItem(send, function(err, result) {
        if (err) {
          console.log(err);
          callback(false);
          return;
        } else {
          if (!result.Item) {
            callback(false);
            return;
          } else {
            var myclient = obj_from_dynamo(result.Item);
            var send = {
              TableName : 'Clients',
              Key : {
                ClientID : {
                  S : String(myclient.ClientID)
                }
              }
            }
            dynamo.getItem(send, function(err, client_data) {
              var client = obj_from_dynamo(client_data.Item);
              callback(null, {
                cid : parseInt(client.ClientID),
                client_name : client.ClientName,
                user_id : myclient.UserID,
                db : client.Database,
                read : myclient.Read,
                write : myclient.Write,
                admin : myclient.Admin
              });
            });
          }
        }
      });
    },
    getPreferredKey : function(customer, callback) {
      var send = {
        TableName : 'Apikeys',
        IndexName : 'ClientID-index',
        KeyConditions : {
          ClientID : {
            ComparisonOperator : 'EQ',
            AttributeValueList : [ {
              S : String(customer.cid)
            } ]
          }
        }
      }
      dynamo.query(send, function(err, data) {
        var keys = {};
        var possible_key = "";
        var fallback_key = false;
        for (var i in data.Items) {
          var key = obj_from_dynamo(data.Items[i]);
          if (key.UserID == customer.user_id) {
            fallback_key = key;
            if (key.Origin == 'default' || key.Origin == undefined) {
              callback(key);
              return;
            }
          }
          keys[key.UserID] = key;
        }
        if (fallback_key) {
          callback(fallback_key);
        } else {
          callback(keys.api);
        }
      });
    },
    getClientInfo : function(keys, callback) {
      var toGetKeys = keys.slice(0); // create a copy
      if (toGetKeys.length !== 0) {
        dynamo.batchGetItem({
          RequestItems : {
            Apikeys : {
              Keys : toGetKeys.slice(0, maxBatchSize).map(function(key) {
                return {
                  Apikey : {
                    S : key
                  }
                };
              })
            }
          }
        }, function(err, result) {
          var clients = {};
          var apikeys = {};
          if(result.Responses.Apikeys.length == 0) {
            callback(null,{});
            return;
          }
          for (var i = 0; i < result.Responses.Apikeys.length; i++) {
            var o = obj_from_dynamo(result.Responses.Apikeys[i]);
            o.ClientID = parseInt(o.ClientID);
            clients[o.ClientID] = 1;
            apikeys[o.Apikey] = o;
          }
          dynamo.batchGetItem({
            RequestItems : {
              Clients : {
                Keys : Object.keys(clients).map(function(key) {
                  return {
                    ClientID : {
                      S : key
                    }
                  };
                })
              }
            }
          }, function(err, result) {
            if(err) console.log('Error on batch get item',err);
            for (var i = 0; i < result.Responses.Clients.length; i++) {
              var o = obj_from_dynamo(result.Responses.Clients[i]);
              o.ClientID = parseInt(o.ClientID);
              clients[o.ClientID] = o;
            }
            for ( var key in apikeys) {
              var c = clients[apikeys[key].ClientID];
              apikeys[key].cid = c.ClientID;
              apikeys[key].db = c.Database;
              //Usually this will be undefined, but we don't want the stats database to track itself. That makes things loopy.
              apikeys[key].IgnoreStats = !!c.IgnoreStats;
            }
            callback(null, apikeys);
          });
        });
      } else {
        callback(null, {});
      }
    }
  };
  return that;
}();

function dynamo_from_obj(orig) {
  if (typeof orig == 'object') {
    var obj = {};
    for ( var i in orig) {
      if (orig.hasOwnProperty(i) && orig[i] !== null) {
        obj[i] = sc_to_dynamo(orig[i])
      }
    }
    return obj;
  } else {
    return orig;
  }
}

function sc_to_dynamo(value) {
  if (typeof value == 'number') return {
    'N' : value.toString()
  };
  if (typeof value == 'string') return {
    'S' : value
  };
  if (Array.isArray(value)) {
    var arr = [];
    var length = value.length;
    var isSS = false;
    for (var i = 0; i < length; ++i) {
      if (typeof value[i] == 'string') {
        arr[i] = value[i];
        isSS = true;
      } else if (typeof value[i] === 'number') {
        arr[i] = value[i].toString();
      }
    }
    return isSS ? {
      'SS' : arr
    } : {
      'NS' : arr
    };
  }
  if (typeof value == 'object') {
    var obj = {
      'M' : {}
    };
    for ( var i in value) {
      if (value.hasOwnProperty(i) && value[i] !== null) obj['M'][i] = sc_to_dynamo(value[i]);
    }
    return obj;
  }
  if (typeof value == 'boolean') { return {
    'BOOL' : value
  }; }
  if (typeof value == 'undefined') return;
  // TODO: more possible fields?
  console.log(value);
  console.log(typeof value);
  throw new Error('Attempted to send unimplemented field type to dynamo');
}

function obj_array_from_dynamo(orig) {
  var obj = [];
  for ( var x in orig) {
    obj.push(obj_from_dynamo(orig[x]));
  }
  return obj;
}

function obj_from_dynamo(orig) {
  if (typeof orig == 'object') {
    var obj = {};
    for ( var i in orig) {
      if (orig.hasOwnProperty(i)) {
        if (orig[i]['S']) obj[i] = orig[i]['S'];
        else if (orig[i]['SS']) obj[i] = orig[i]['SS'];
        else if (orig[i]['N']) obj[i] = orig[i]['N'];
        else if (typeof orig[i]['BOOL'] != 'undefined') obj[i] = orig[i]['BOOL'];
        else if (orig[i]['NS']) {
          obj[i] = [];
          for (var x = 0; x < orig[i]['NS'].length; x++) {
            obj[i][x] = parseFloat(orig[i][NS][x]);
          }
        } else if (orig[i]['L']) {
          obj[i] = [];
          obj[i]['L'].forEach(function(item) {
            obj[i].push(dynamo_from_obj(item));
          });
        } else if (orig[i]['M']) {
          obj[i] = obj_from_dynamo(orig[i]['M']);
        } else {
          console.log(orig[i]);
          throw new Error('Unimplemented array value from Dynamo');
        }
      }
    }
    return obj;
  } else {
    return orig;
  }
}
