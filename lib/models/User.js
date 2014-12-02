//TODO: User type is not an enum?

var validator = require('../utils/validator.js');
var db = require('../utils/db.js');

User = {};

var schema = {
  type:'object',
  properties: {
    type:{
      type:'string',
      required:true
    },

    username:{
      type:'string',
      required:true,
      minLength:4,
      format:'alphanumeric'
    },

    password:{
      type:'string',
      required:true
    },

    first_name:{
      type:'string',
      required:true,
      minLength:3,
    },

    last_name:{
      type:'string',
      required:true,
      minLength:3,
    },

    email:{
      type:'string',
      format:'email'
    },

    agency_id: {
      type:'string',
      uuid:true
    }
  }
}

var validate = validator.bind(null, schema);

var get_sql = 'SELECT * FROM users WHERE id = $1';
User.get = function(id, cb) {
  db.query(get_sql, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
        return cb(null, false);

    cb(null, res.rows[0]);
  });
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
      return cb(Error.Validation({
        details:{
          attributes:{
            username:'Provided username already exists'
          }
        }
      }));
    cb();
  });
}

var insert_sql = 'INSERT INTO users (type, username, first_name, last_name, password, email, phone_number, agency_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id';
function insert(user, cb) {
    db.query(insert_sql, [
      user.type,
      user.username,
      user.first_name,
      user.last_name,
      user.password,
      user.email,
      user.phone_number,
      user.agency_id
    ], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, res.rows[0].id);
    });
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

var update_sql = 'UPDATE users SET first_name = $1, last_name = $2, password = $3, email = $4,\
phone_number = $5 WHERE id = $6';

User.update = function(user_id, user, cb) {
  validate(user, function(err) {
    if(err)
      return cb(err);

    db.query(update_sql, [
      user.first_name,
      user.last_name,
      user.password,
      user.email,
      user.phone_number,
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

User.getAddress = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    if(!user || !user.address_id)
      return cb(null, false);

    Address.get(user.address_id, cb);
  });
}

var set_address_sql = 'UPDATE users SET address_id = $1 WHERE id = $2';
User.setAddress = function(user_id, address, cb) {
  Address.create(address, function(err, addr_id) {
    if(err)
      return cb(err);

    db.query(set_address_sql, [addr_id, user_id], cb);
  });
}

var unset_address_sql = 'UPDATE users SET address_id = null WHERE id = $1';
User.unsetAddress = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    if(!user || !user.address_id)
      return cb();

    Address.delete(user.address_id);

    db.query(unset_address_sql, [user_id], cb);
  });
}

User.publicize = function(model) {
  delete model.password;
  return model;
}

module.exports = function(){};