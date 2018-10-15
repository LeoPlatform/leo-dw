var system = require('./system.js');
var utils = require("./utils.js");
var config = require("../config.json");
var uuidBase62 = require('uuid-base62');
var inspect = require('util').inspect;
var async = require('async');
var bcrypt = require('bcrypt-nodejs');
var dynamo = system.dynamo;


function merge_obj(obj1,obj2){
  var obj3 = {};
  for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
  for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
  return obj3;
}

function get_apikey(apikey,callback) {
  var send = {
    TableName:"Apikeys",
    Key: {
      Apikey:{S:apikey}
    }
  }
  dynamo.getItem(send,function(err,result) {
    if(err) {
      console.log("error getting apikey",err,send);
      callback(false);
    } else {
      callback(utils.obj_from_dynamo(result.Item));
    }
  })
}

function get_user_from_id(user_id,callback) {
  
}

function get_client(cid,callback) {
  var send = {
    TableName:"Clients",
    Key: {
      ClientID:{S:cid}
    }
  }
  dynamo.getItem(send,function(err,result) {
    if(err) {
      console.log("error getting client",err);
      callback(false);
    } else {
      callback(utils.obj_from_dynamo(result.Item));
    }
  });
}

function get_user_from_apikey(apikey,callback) {
  get_apikey(apikey,function(apikey) {
    if(apikey == false) {
      callback(false);
    } else {
      var send = {
        TableName: "Users",
        Key: {
          UserID:{S:apikey.UserID}
        }
      }
      dynamo.getItem(send,function(err,user) {
        if(!user.Item) {
          callback(false);
        } else {
          var user_mixed = utils.obj_from_dynamo(user.Item);
          
          callback(merge_obj(utils.obj_from_dynamo(user.Item),{key:apikey}));
        }
      })
    }
  });
}

function get_password_obj(password,salt,callback) {
  var returnObj = {};
  var get_bcrypted = function() {
    bcrypt.hash(password,returnObj.salt,null,function(err,hash) {
      returnObj.hash = hash;
      callback(returnObj);
    });
  }
  if(salt) {
    returnObj.salt = salt;
    get_bcrypted();
  } else {
    bcrypt.genSalt(null,function(err,salt) {
      returnObj.salt = salt;
      get_bcrypted();
    });
  }
}

// /mykeys GET api
function mykeys(req,res,filter) {
  get_user_from_apikey(req.query.apikey,function(user) {
    if(user == false) {
      res.send(false);
    } else {
      var send = {
        TableName:'Apikeys',
        IndexName:'UserID-index',
        KeyConditions:{
          UserID:{
            ComparisonOperator:'EQ',
            AttributeValueList: [{S:user.UserID}]
          }
        }
      };
      dynamo.query(send,function(err,data) {
        if(err) console.log("error in mykeys",err,inspect(send,false,null));
        var result = utils.obj_array_from_dynamo(data.Items);
        var keys = [];
        for(var i in result) {
          result[i].Origin = result[i].Origin || 'default';
          if(filter != null) {
            switch(filter) {
              case "warehouses":
                // Get all keys that are used by for THIS USER's access to OTHER clients (includes this one)
                // We can tell because the Origin is set to "default" or is missing.
                if(result[i].Origin != "default") continue;
              break;
              case "client":
                // Get all keys created by this user for other users (or apis, etc) to access THIS client
                if(result[i].ClientID != user.key.ClientID || result[i].Origin != "user") continue;
              break;
            }
          }
          keys.push({
            key:result[i].Apikey,
            name:result[i].Name,
            origin:result[i].Origin,
            read:result[i].Read,
            write:result[i].Write,
            admin:result[i].Admin
          });
        }
        res.send(keys);
      });
    }
  });
}
function normalize_permissions(req,ignore_undefined) {
  if(ignore_undefined == null) ignore_undefined = true;
  var mynormalize = function(value) {
    if(typeof value == 'undefined') {
      if(ignore_undefined) return undefined;
      return false;
    }
    if(typeof value == 'boolean') return value;
    if(!isNaN(parseInt(value))) {
      return !!parseInt(value);
    }
    if(typeof value == 'string') return value != 'false';
    return !!value;
  }
  req.body.read = mynormalize(req.body.read);
  req.body.write = mynormalize(req.body.write);
  req.body.admin = mynormalize(req.body.admin);
}
function create_key(req,res) {
  normalize_permissions(req);
  get_user_from_apikey(req.body.apikey,function(user) {
    var key = uuidBase62.uuid();
    var send = {
      Item: utils.dynamo_from_obj({
        Apikey:key,
        ClientID: user.key.ClientID,
        UserID: user.UserID,
        Name: req.body.name,
        Read: !!req.body.read && user.key.Read,
        Write: !!req.body.write && user.key.Write,
        Admin: !!req.body.admin && user.key.Admin,
        Origin:'user'
      }),
      TableName: 'Apikeys'
    }
    dynamo.putItem(send,function(err,data) {
      if(err) {
        console.log("error creating user key",err);
        res.send({success:0});
      } else {
        res.send({success:1,key:key});
      }
    });
  });
}
function edit_key(req,res) {
  normalize_permissions(req);
  get_user_from_apikey(req.body.apikey,function(user) {
    if(user == false) {
      res.send({success:0,message:"User not found"});
      return;
    }
    get_apikey(req.body.key,function(target) {
      if(target == false) {
        res.send({success:0,message:"That key was not found"});
        return;
      }
      if(target.ClientID != user.key.ClientID) {
        res.send({success:0,message:"The target key was not for this data warehouse"});
        return;
      }
      if(target.UserID != user.UserID && !user.key.Admin) {
        res.send({success:0,message:"User does not have permission to modify this key"});
        return;
      }
      var send = {
        TableName: 'Apikeys',
        Key: {
          Apikey:{S:req.body.key}
        },
        AttributeUpdates:{
          Name:{Action:'PUT',Value:{S:req.body.name}},
          Read:{Action:'PUT',Value:{BOOL:!!req.body.read && user.key.Read}},
          Write:{Action:'PUT',Value:{BOOL:!!req.body.write && user.key.Write}},
          Admin:{Action:'PUT',Value:{BOOL:!!req.body.admin && user.key.Admin}},
        }
      }
      dynamo.updateItem(send,function(err,result) {
        if(err) {
          res.send({success:0,message:"database error"});
        } else {
          res.send({success:1});
        }
      });
    });
  });
}
function delete_key(req,res) {
  get_user_from_apikey(req.body.apikey,function(user) {
    if(user == false) {
      res.send({success:0,message:"User not found"});
      return;
    }
    get_apikey(req.body.key,function(target) {
      if(target == false) {
        res.send({success:0,message:"That key was not found"});
        return;
      }
      if(target.ClientID != user.key.ClientID) {
        res.send({success:0,message:"The target key was not for this data warehouse"});
        return;
      }
      if(target.UserID != user.UserID && !user.key.Admin) {
        res.send({success:0,message:"User does not have permission to delete this key"});
        return;
      }
      var send = {
        TableName: 'Apikeys',
        Key: {
          Apikey:{S:target.Apikey}
        }
      }
      dynamo.deleteItem(send,function(err,data) {
        if(err) {
          res.send({success:0,message:"database error"});
        } else {
          res.send({success:1});
        }
      });
    });
  });
}

function get_settings (apikey,callback) {
  get_user_from_apikey(apikey,function(user) {
    if(user == false) {
      callback(false);
      return;
    }
    var settings = {
      default:config.settings,
      user:user.Settings || {},
      key:user.key.Settings || {},
      client:{}
    };
    get_client(user.key.ClientID,function(client) {
      if(client != false) {
        settings.client = client.Settings || {};
      }
      callback(settings);
    });
  });
}

function get_compiled_settings(apikey,callback) {
  get_settings(apikey,function(aggregate) {
    console.log(aggregate);
    console.log(merge_obj(aggregate.default,merge_obj(aggregate.client,merge_obj(aggregate.user,aggregate.key))));
    callback(merge_obj(aggregate.default,merge_obj(aggregate.client,merge_obj(aggregate.user,aggregate.key))))
  })
}

function update_client_settings(req,res,user) {
  get_client(user.key.ClientID,function(client) {
    if(!client) {
      res.send({success:0,message:"Data warehouse could not be found"});
      return;
    }
    var settings = merge_obj(client.Settings || {},JSON.parse(req.body.settings) || {});
    var send = {
      TableName: 'Clients',
      Key: {
        ClientID:{S:client.ClientID}
      },
      AttributeUpdates:{
        Settings:merge_obj({Action:'PUT'},utils.dynamo_from_obj({Value:settings}))
      }
    }
    dynamo.updateItem(send,function(err,result) {
      if(err) {
        console.log("error updating client setting",err);
        res.send({success:0,message:"database error"});
      } else {
        res.send({success:1});
      }
    });
  });
}

function update_user_settings(req,res,user) {
  try {
    var decoded_settings = JSON.parse(req.body.settings)
  } catch(e) {
    res.send({success:0,message:"Invalid JSON"});
    return;
  }
  var settings = merge_obj(user.Settings || {},decoded_settings || {});
  var send = {
    TableName: 'Users',
    Key: {
      UserID:{S:user.UserID}
    },
    AttributeUpdates:{
      Settings:merge_obj({Action:'PUT'},utils.dynamo_from_obj({Value:settings}))
    }
  }
  dynamo.updateItem(send,function(err,result) {
    if(err) {
      console.log("error updating client setting",err);
      res.send({success:0,message:"database error"});
    } else {
      res.send({success:1});
    }
  });
}

function update_key_settings(req,res,user) {
  try {
    var decoded_settings = JSON.parse(req.body.settings)
  } catch(e) {
    res.send({success:0,message:"Invalid JSON"});
    return;
  }
  
  var settings = merge_obj(user.key.Settings || {},decoded_settings || {});
  var send = {
    TableName: 'Apikeys',
    Key: {
      Apikey:{S:user.key.Apikey}
    },
    AttributeUpdates:{
      Settings:merge_obj({Action:'PUT'},utils.dynamo_from_obj({Value:settings}))
    }
  }
  dynamo.updateItem(send,function(err,result) {
    if(err) {
      console.log("error updating client setting",err);
      res.send({success:0,message:"database error"});
    } else {
      res.send({success:1});
    }
  });
}

function edit_settings(req,res) {
  get_user_from_apikey(req.body.apikey,function(user) {
    if(!user) {
      res.send({success:0,message:"User could not be found"});
      return;
    }
    switch(req.body.scope) {
      case "client":
        if(!user.key.Admin) {
          res.send({success:0,message:"Insufficient permissions"});
          return;
        }
        update_client_settings(req,res,user);
      break;
      case "user":
        update_user_settings(req,res,user);
      break;
      case "key":
        update_key_settings(req,res,user);
      break;
      default:
        res.send({success:0,message:"invalid scope"});
      break;
    }
  });
}

function delete_client_settings(req,res,user) {
  get_client(user.key.ClientID,function(client) {
    if(!client) {
      res.send({success:0,message:"Data warehouse could not be found"});
      return;
    }
    var settings = client.Settings || {};
    var mykeys = JSON.parse(req.body.settings) || {};
    for(var i in mykeys) {
      settings[mykeys[i]] = undefined;
    }
    var send = {
      TableName: 'Clients',
      Key: {
        ClientID:{S:client.ClientID}
      },
      AttributeUpdates:{
        Settings:merge_obj({Action:'PUT'},utils.dynamo_from_obj({Value:settings}))
      }
    }
    dynamo.updateItem(send,function(err,result) {
      if(err) {
        console.log("error updating client setting",err);
        res.send({success:0,message:"database error"});
      } else {
        res.send({success:1});
      }
    });
  });
}

function delete_user_settings(req,res,user) {
  var settings = user.Settings || {}
  var mykeys = JSON.parse(req.body.settings) || {}
  for(var i in mykeys) {
    settings[mykeys[i]] = undefined;
  }
  var send = {
    TableName: 'Users',
    Key: {
      UserID:{S:user.UserID}
    },
    AttributeUpdates:{
      Settings:merge_obj({Action:'PUT'},utils.dynamo_from_obj({Value:settings}))
    }
  }
  dynamo.updateItem(send,function(err,result) {
    if(err) {
      console.log("error updating client setting",err);
      res.send({success:0,message:"database error"});
    } else {
      res.send({success:1});
    }
  });
}

function delete_key_settings(req,res,user) {
  var settings = user.key.Settings || {};
  var mykeys = JSON.parse(req.body.settings) || {};
  for(var i in mykeys) {
    settings[mykeys[i]] = undefined;
  }
  var send = {
    TableName: 'Apikeys',
    Key: {
      Apikey:{S:user.key.Apikey}
    },
    AttributeUpdates:{
      Settings:merge_obj({Action:'PUT'},utils.dynamo_from_obj({Value:settings}))
    }
  }
  dynamo.updateItem(send,function(err,result) {
    if(err) {
      console.log("error updating client setting",err);
      res.send({success:0,message:"database error"});
    } else {
      res.send({success:1});
    }
  });
}

function delete_settings(req,res) {
  get_user_from_apikey(req.body.apikey,function(user) {
    if(!user) {
      res.send({success:0,message:"User could not be found"});
      return;
    }
    switch(req.body.scope) {
      case "client":
        if(!user.key.Admin) {
          res.send({success:0,message:"Insufficient permissions"});
          return;
        }
        delete_client_settings(req,res,user);
      break;
      case "user":
        delete_user_settings(req,res,user);
      break;
      case "key":
        delete_key_settings(req,res,user);
      break;
      default:
        res.send({success:0,message:"invalid scope"});
      break;
    }
  });
}

function list_users(req,res) {
  get_user_from_apikey(req.query.apikey,function(user) {
    if(!user) {
      res.send({success:0,message:"User could not be found"});
      return;
    }
    if(!user.key.Admin) {
      res.send({success:0,message:"Insufficient permissions"});
      return;
    }
    var send = {
      TableName:'Apikeys',
      IndexName:'ClientID-index',
      KeyConditions:{
        ClientID:{
          ComparisonOperator:'EQ',
          AttributeValueList: [{S:user.key.ClientID}]
        }
      }
    };
    dynamo.query(send,function(err,data) {
      if(!data.Items.length) {
        res.send({success:0,message:"Warehouse could not be found"});
        return;
      }
      var users = [];
      async.eachLimit(data.Items,10,function(item,resolve) {
        var thisKey = utils.obj_from_dynamo(item);
        if(thisKey.userID == 'api') {
          resolve();
          return;
        }
        var send = {
          TableName:'Users',
          Key:{
            UserID:{S:thisKey.UserID}
          }
        }
        dynamo.getItem(send,function(err,found_user) {
          if(!found_user.Item) {
            resolve();
            return;
          }
          this_user = utils.obj_from_dynamo(found_user.Item);
          users.push({
            id:this_user.UserID,
            name:this_user.DisplayName,
            email:this_user.Email,
            read:thisKey.Read,
            write:thisKey.Write,
            admin:thisKey.Admin
          });
          resolve();
        });
      },function() {
        res.send(users);
      });
    });
  });
}

function create_user(req,res) {
  get_user_from_apikey(req.body.apikey,function(user) {
    if(!user) {
      res.send({success:0,message:"User could not be found"});
      return;
    }
    if(!user.key.Admin) {
      res.send({success:0,message:"Insufficient permissions"});
      return;
    }
    if(!params.req.body.password) {
      res.send({success:0,message:"Passwords cannot be blank"});
      return;
    }
    if(!params.req.body.email) {
      res.send({success:0,message:"Email cannot be blank"});
      return;
    }
    get_client(user.key.ClientID,function(client) {
      var add_apikey = function(user_id) {
        var key = uuidBase62.uuid();
        var send = {
          Item: utils.dynamo_from_obj({
            Apikey:key,
            ClientID: user.key.ClientID,
            UserID: user_id,
            Name: client.ClientName,
            Read: !!req.body.read && user.key.Read,
            Write: !!req.body.write && user.key.Write,
            Admin: !!req.body.admin && user.key.Admin,
            Origin:'user'
          }),
          TableName: 'Apikeys'
        }
        dynamo.putItem(send,function(err,data) {
          if(err) {
            console.log("error creating user key",err);
            res.send({success:0});
          } else {
            res.send({success:1,key:key});
          }
        });
      }
      var send = {
        TableName:'Users',
        IndexName:'Email-index',
        KeyConditions:{
          Email:{
            ComparisonOperator:'EQ',
            AttributeValueList: [{S:params.req.body.email}]
          }
        }
      };
      dynamo.query(send,function(err,newuser) {
        if(newuser.Items.length == 0) {
          var userid = uuidBase62.v4();
          var display_name = params.req.body.display_name;
          get_password_obj(req.body.password,null,function(passObj) {
            send = {
              TableName:'Users',
              Item: utils.dynamo_from_obj({
                UserID:userid,
                Email:req.body.email,
                DisplayName: display_name,
                UserType:'User',
                password: passObj
              }),
            }
            dynamo.putItem(send,function(err,result) {
              if(err) {
                console.log("error creating user",err);
                res.send({success:0,message:"database error"});
                return;
              }
              add_apikey(userid);
            });
          });
        } else {
          newuser = utils.obj_from_dynamo(newuser.Items[0]);
          add_apikey(newuser.UserID);
        }
      });
    });
  });
}

module.exports = {
    mykeys : mykeys,
    create_key : create_key,
    edit_key : edit_key,
    delete_key : delete_key,
    get_settings : get_settings,
    get_compiled_settings : get_compiled_settings,
    edit_settings : edit_settings,
    delete_settings : delete_settings,
    list_users : list_users,
    create_user : create_user
};
