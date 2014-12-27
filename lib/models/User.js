//TODO: User type is not an enum?

var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var crypto = require('crypto');

User = {};

var schema = {
  type:'object',
  properties: {
    type:{
      type:'string',
      required:true
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

var get_sql = 'SELECT\
 users.*,\
 EXTRACT(EPOCH FROM users.created_at)::BIGINT as created_at,\
 EXTRACT(EPOCH FROM users.updated_at)::BIGINT as updated_at,\
 ROW_TO_JSON(addresses.*) AS address\
 FROM users\
 LEFT JOIN addresses\
 ON users.address_id = addresses.id\
 WHERE users.id = $1';

User.get = function(id, cb) {
  db.query(get_sql, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('User not found'));

    cb(null, res.rows[0]);
  });
}

var get_by_email = 'SELECT * FROM users WHERE email = $1';
User.getByEmail = function(email, cb) {
  db.query(get_by_email, [email], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Email not found'));

    cb(null, res.rows[0]);
  });
}

function emailAvailable(user, cb) {
  User.getByEmail(user.email, function(err, user) {
    if(err)
      return cb(err);

    if(user)
      return cb(Error.Validation({
        details:{
          attributes:{
            email:'Provided email already exists'
          }
        },
        http:409
      }));
    cb();
  });
}

var insert_sql = 'INSERT INTO users (type, first_name, last_name, password, email, phone_number, agency_id) \
VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id';
function insert(user, cb) {
    db.query(insert_sql, [
      user.type,
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

    emailAvailable(user, function(err) {
      if(err)
        return cb(err);

      User.hashPassword(user.password, function(err,hash) {
        if(err)
          return cb(err);

        user.password = hash;
        insert(user, cb);
      });
    });
  });
}

var update_sql = 'UPDATE users SET first_name = $1, last_name = $2, email = $3,\
phone_number = $4 WHERE id = $5';

User.update = function(user_id, user, cb) {
  validate(user, function(err) {
    if(err)
      return cb(err);

    db.query(update_sql, [
      user.first_name,
      user.last_name,
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
  delete model.address_id;
  // delete model.address.id;
  delete model.agency_id;

  return model;
}

User.verifyPassword = function(model, string, cb) {
  User.hashPassword(string, function(err, hashed) {
    if(err)
      return cb(err);

    cb(null, string === hashed);
  });
}


User.hashPassword = function(pass, cb) {
  return cb(null, pass);
  crypto.pbkdf2(pass, config.salt.string, config.salt.iterations, config.salt.length, function(err, hash){
    if(err)
      return cb(err);

    cb(null, hash.toString());
  });
}

getprofilepicture_sql = "SELECT\
 'url' AS type,\
 profile_image_url AS url\
 FROM users\
 WHERE id = $1";
User.getProfilePicture = function(user_id, cb) {
  db.query(getprofilepicture_sql, [user_id], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Profile image not found'));

    cb(null, res.rows[0]);
  });
}

getcoverpicture_sql = "SELECT\
 'url' AS type,\
 cover_image_url AS url\
 FROM users\
 WHERE id = $1";
User.getCoverPicture = function(user_id, cb) {
  db.query(getprofilepicture_sql, [user_id], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Profile image not found'));

    cb(null, res.rows[0]);
  });
}

module.exports = function(){};