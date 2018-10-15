var config = require("../config.json");
var mysql = require('mysql');
var uuid = require('node-uuid');
var bcrypt = require('bcrypt');

var pool = mysql.createPool({
  connectionLimit : 10,
  host : config.mysql,
  user : config.mysql_user,
  password : config.mysql_pass,
  database : 'auth',
  timezone : 'GMT'
});

Date.prototype.addHours = function(h) {
  this.setHours(this.getHours() + h);
  return this;
}

// Checks for a valid login
function checkSess(req, success, failure) {
  if (!req.body || !req.body.auth) {
    failure();
  } else {
    pool.query("DELETE FROM sess WHERE expire<NOW();", function(err, result) {
      if (req.body.auth) {
        pool.query("SELECT u.name, u.level FROM `auth`.`users` u, `auth`.`sess` s WHERE u.id=s.user_id AND s.token=" + mysql.escape(req.body.auth) + " LIMIT 1", function(err, result) {
          if (result.length) {
            success(result[0]);
          } else {
            failure();
          }
        });
      } else {
        failure();
      }
    });
  }
}

function showLogin(req, res) {
  res.send({
    doLogin : 1
  });
}

function verifyLogin(username, password, success, failure) {
  pool.query("SELECT `id`,`name`,`hash`,`salt`,`level` FROM `auth`.`users` WHERE `name`=" + mysql.escape(username) + " LIMIT 1", function(err, rows) {
    if (rows.length) {
      var user = rows[0];
      bcrypt.hash(password, user.salt, function(err, hash) {
        if (hash == user.hash) {
          success(user);
        } else {
          failure();
        }
      });
    } else {
      failure();
    }
  });
}

function createAdminUser(username, password, callback) {
  pool.query("SELECT `name`,`hash`,`salt`,`level` FROM `auth`.`users` WHERE `name`=" + mysql.escape(username) + " LIMIT 1", function(err, rows) {
    if (err) {
      console.log(err);
      callback();
      return;
    }
    if (rows.length) {
      console.log("Failed to create user: already exists");
      callback();
    } else {
      bcrypt.genSalt(null, function(err, salt) {
        bcrypt.hash(password, salt, function(err, hash) {
          pool.query("INSERT INTO `auth`.`users` (`name`,`hash`,`salt`,`level`) VALUES (" + mysql.escape(username) + "," + mysql.escape(hash) + "," + mysql.escape(salt) + ",'admin');", function(err, result) {
            if (!err) {
              console.log("User created successfully");
            } else {
              console.log(err);
            }
            callback();
          });
        });
      });
    }
  });
}

function doLogin(user, type, callback) {
  var auth = uuid.v4();
  console.log("INSERT INTO sess (`user_id`,`token`,`type`,`expire`) VALUES (" + mysql.escape(user.id) + "," + mysql.escape(auth) + "," + mysql.escape(type) + "," + mysql.escape(new Date().addHours(4)) + ")");
  pool.query("INSERT INTO sess (`user_id`,`token`,`type`,`expire`) VALUES (" + mysql.escape(user.id) + "," + mysql.escape(auth) + "," + mysql.escape(type) + "," + mysql.escape(new Date().addHours(4)) + ")", function(err, result) {
    callback(auth);
  })
}

function getAllClients(res, auth) {
  pool.query("SELECT clients.id,clients.name,apikeys.id as keyid,apikeys.description FROM clients LEFT JOIN apikeys ON (apikeys.client_id=clients.id);", function(err, rows) {
    var clients = {};
    for (i in rows) {
      var row = rows[i];
      row.id = String(row.id);
      if (typeof clients[row.id] == 'undefined') {
        clients[row.id] = []
      }
      clients[row.id].push(row);
    }
    var send = {
      clients : clients,
      auth : auth
    }
    res.send(send);
  });
}

function addApiKey(client_id, description, res) {
  if (!client_id) {
    res.send({
      alert : {
        title : 'Error',
        message : 'Missing required field'
      }
    })
  } else {
    var key = uuid.v4();
    if (typeof description == 'undefined') description = '';
    pool.query("SELECT db FROM clients WHERE id=" + mysql.escape(client_id), function(err, client) {
      if (!client) {
        res.send({
          alert : {
            title : 'Error',
            message : 'Client could not be found'
          }
        });
      } else {
        pool.query("INSERT INTO `auth`.`apikeys` (`id`,`client_id`,`db`,`description`) VALUES (" + mysql.escape(key) + "," + client_id + "," + mysql.escape(client[0].db) + "," + mysql.escape(description) + ")", function(err, result) {
          getAllClients(res);
        });
      }
    });
  }
}

function deleteApiKey(apikey, res) {
  if (!apikey) {
    res.send({
      alert : {
        title : 'Error',
        message : 'Missing required field'
      }
    })
  } else {
    pool.query("DELETE FROM apikeys WHERE id=" + mysql.escape(apikey) + " LIMIT 1", function(err, result) {
      getAllClients(res);
    });
  }
}

function newKeyDescription(apikey, description, res) {
  if (!apikey || !description) {
    res.send({
      alert : {
        title : 'Error',
        message : 'Missing required field'
      }
    })
  } else {
    pool.query("UPDATE apikeys SET description=" + mysql.escape(description) + " WHERE id=" + mysql.escape(apikey) + "", function(err, result) {
      getAllClients(res);
    });
  }
}

function newClientName(client_id, name, res) {
  if (!client_id || !name) {
    res.send({
      alert : {
        title : 'Error',
        message : 'Missing required field'
      }
    })
  } else {
    pool.query("UPDATE clients SET name=" + mysql.escape(name) + " WHERE id=" + mysql.escape(client_id) + "", function(err, result) {
      getAllClients(res);
    });
  }
}

function newClient(new_name, new_db, res) {
  if (!new_name || !new_db) {
    res.send({
      alert : {
        title : 'Error',
        message : 'Missing required field'
      }
    });
  } else {
    pool.query("INSERT INTO `auth`.`clients` (`name`,`db`) VALUES (" + mysql.escape(new_name) + "," + mysql.escape(new_db) + ")", function(err, result) {
      getAllClients(res);
    });
  }
}

module.exports = Object.freeze({
  checkSess : checkSess,
  showLogin : showLogin,
  verifyLogin : verifyLogin,
  getAllClients : getAllClients,
  createAdminUser : createAdminUser,
  doLogin : doLogin,
  addApiKey : addApiKey,
  deleteApiKey : deleteApiKey,
  newKeyDescription : newKeyDescription,
  newClient : newClient,
  newClientName : newClientName
});