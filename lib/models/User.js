//TODO: User type is not an enum?

var validator = require('validator');
var db = require('../utils/db.js');

User = {};

function validate(user, cb) {
  var required = ['type', 'username', 'firstname', 'lastname'];
  for(var i in required) {
    var p = required[i];

    if(validator.isNull(user[p])) {
      return cb(Error.Validation(p+' is required'));
    }

    var min = 4;
    if(validator.isLength(min, user[p])) {
      return cb(Error.Validation(p+' needs to be at least '+min+' characters.'));
    }
  }

  if(user.email && !validator.isEmail(user.email)) {
    return cb(Error.Validaition('Provided email is not a valid email address'));
  }

  cb();
}

var get_by_username = 'SELECT * FROM users WHERE username = $1';
User.getByUsername = function(username, cb) {
  db.query(get_by_username, [username], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
        return cb(null, false);

    cb(null, res.rows[0]);
  });
}

function usernameAvailable(user, cb) {
  User.getByUsername(user.username, function(err, user) {
    if(err)
      return cb(err);

    if(user)
      return cb(Error.Validation('Provided username already exists'));

    cb();
  });
}

var insert_sql = 'INSERT INTO users (type, username, firstname, lastname, email, phonenumber) VALUES ($1,$2,$3,$4,$5,$6)';
function insert(user, cb) {
    db.query(insert_sql, [
      user.type,
      user.username,
      user.firstname,
      user.lastname,
      user.email,
      user.phonenumber,
    ], cb);
}

User.create = function(user, cb) {
  validate(user, function(err) {
    if(err)
      return cb(err);

    usernameAvailable(user, function(err) {
      if(err)
        return cb(err);

      insert(user, cb);
    });
  });
}

var update_sql = 'UPDATE users SET firstname = $1, lastname = $2, email = $3,\
phonenumber = $4 WHERE id = $5';

User.update = function(user_id, user, cb) {
  validate(user, function(err) {
    if(err)
      return cb(err);

    db.query(update_sql, [
      user.firstname,
      user.lastname,
      user.email,
      user.phonenumber,
      user_id
    ], cb);
  });
}

var delete_sql = 'DELETE FROM users WHERE id = $1';
User.delete = function(id, cb) {
  db.query(delete_sql, [id], function(err, res) {
    if(err)
      return cb(err);

    User.unsetAddress(id, cb);
  });
}

var get_addr = 'SELECT * FROM addresses WHERE user_id = $1 LIMIT 1';
User.getAddress = function(user_id, cb) {
  db.query(get_addr, [user_id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, res.rows[0]);
  });
}

var unset_addr = 'DELETE FROM addresses WHERE user_id = $1';
User.unsetAddress = function(user_id, cb) {
  db.query(unset_addr, [user_id], cb);
}

var set_addr = 'INSERT INTO addresses (type, title, subtitle, streetnumber, streetname, city, \
state, statecode, postalcode, neighborhood, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, $11)';

User.setAddress = function(user_id, address, cb) {
  Address.validate(address, function(err) {
    if(err)
      return cb(err);

    User.unsetAddress(user_id, function(err) {
      if(err)
        return cb(err);

      db.query(set_addr, [
        address.type,
        address.title,
        address.subtitle,
        address.streetnumber,
        address.streetname,
        address.city,
        address.state,
        address.statecode,
        address.postalcode,
        address.neighborhood,
        user_id
      ], cb);
    });
  });
}

module.exports = function(){};