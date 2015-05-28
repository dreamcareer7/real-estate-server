//TODO: User type is not an enum?

var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var crypto = require('crypto');
var sql = require('../utils/require_sql.js');
var async = require('async');
var bcrypt = require('bcrypt-nodejs');

User = {};

var schema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      required: true
    },

    password: {
      type: 'string',
      required: true
    },

    first_name: {
      type: 'string',
      required: true,
      minLength: 1,
    },

    last_name: {
      type: 'string',
      required: true,
      minLength: 1,
    },

    email: {
      type: 'string',
      format: 'email'
    },

    agency_id: {
      type: 'string',
      uuid: true
    },

    profile_image_url: {
      type: 'string',
      required: 'false'
    },

    profile_image_thumbnail_url: {
      type: 'string',
      required: 'false'
    },

    cover_image_url: {
      type: 'string',
      required: 'false'
    },

    cover_image_thumbnail_url: {
      type: 'string',
      required: 'false'
    },
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with User object
var sql_get = require('../sql/user/get.sql');
var sql_get_by_email = require('../sql/user/get_by_email.sql');
var sql_insert = require('../sql/user/insert.sql');
var sql_update = require('../sql/user/update.sql');
var sql_delete = require('../sql/user/delete.sql');
var sql_change_password = require('../sql/user/change_password.sql');
var sql_set_address = require('../sql/user/set_address.sql');
var sql_unset_address = require('../sql/user/unset_address.sql');
var sql_get_avatar = require('../sql/user/get_avatar.sql');
var sql_set_avatar = require('../sql/user/set_avatar.sql');
var sql_get_cover = require('../sql/user/get_cover.sql');
var sql_set_cover = require('../sql/user/set_cover.sql');
var sql_rooms = require('../sql/user/rooms.sql');
var sql_get_hashed = require('../sql/user/get_hashed.sql');
var sql_claim_invitations = require('../sql/user/claim_invitations.sql');
var sql_listing_to_rec_mapping = require('../sql/user/listing_to_rec_mapping.sql');

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

function insert(user, cb) {
    db.query(sql_insert, [
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

function update(user_id, user, cb) {
  db.query(sql_update, [
    user.first_name,
    user.last_name,
    user.email,
    user.phone_number,
    user.profile_image_url,
    user.profile_image_thumbnail_url,
    user.cover_image_url,
    user.cover_image_thumbnail_url,
    user_id
  ], cb);
}

User.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('User not found'));

    var user = res.rows[0];

    async.parallel({
      address: function(cb) {
        if(!user.address_id)
          return cb();

        Address.get(user.address_id, cb);
      }
    }, function(err, results) {
         if(err)
           return cb(err);

         user.address = results.address || null;
         return cb(null, user);
       });
  });
}

User.getByEmail = function(email, cb) {
  db.query(sql_get_by_email, [email], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, false);

    cb(null, res.rows[0]);
  });
}

User.create = function(user, cb) {
  validate(user, function(err) {
    if(err)
      return cb(err);

    emailAvailable(user, function(err) {
      if(err)
        return cb(err);

      User.hashPassword(user.password, function(err, hash) {
        if(err)
          return cb(err);

        user.password = hash;
        insert(user, function(err, user_id) {
          User.claimInvitations(user_id, user.email, function(err, ok) {
            if(err)
              return cb(err);

            cb(null, user_id);
          });
        });
      });
    });
  });
}

User.patch = function(user_id, user, cb) {
  return update(user_id, user, cb);
}

User.update = function(user_id, user, cb) {
  validate(user, function(err) {
    if(err)
      return cb(err);

      return update(user_id, user, cb);
  });
}

User.delete = function(id, cb) {
  User.unsetAddress(id);
  db.query(sql_delete, [id], cb);
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

User.setAddress = function(user_id, address, cb) {
  Address.create(address, function(err, addr_id) {
    if(err)
      return cb(err);

    db.query(sql_set_address, [addr_id, user_id], cb);
  });
}

User.unsetAddress = function(user_id, cb) {
  if(!cb)
    cb = function() {};

  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    if(!user || !user.address_id)
      return cb();

    Address.delete(user.address_id);

    db.query(sql_unset_address, [user_id], cb);
  });
}

User.verifyPassword = function(model, string, cb) {
  User.getHashedPassword(model.id, function(err, hash) {
    if(err)
      return cb(err);

    bcrypt.compare(string, hash, function(err, ok) {
      if(err)
        return cb(err);

      cb(null, ok);
    });
  });
}

User.updatePassword = function(user_id, new_password, cb) {
  User.hashPassword(new_password, function(err, hashed) {
    if(err)
      return cb(err);

    db.query(sql_change_password, [user_id, hashed], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, true);
    });
  });
}

User.changePassword = function(user_id, old_password, new_password, cb) {
  User.verifyPassword({id: user_id}, old_password, function(err, ok) {
    if(err)
      return cb(err);

    if(!ok)
      return cb(Error.Unauthorized());

    return User.updatePassword(user_id, new_password, cb);
  });
}

User.getHashedPassword = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_get_hashed, [user_id], function(err, res) {
      if(err)
        return cb(err);

      cb(null, res.rows[0].password);
    });
  });
}

User.hashPassword = function(pass, cb) {
  bcrypt.hash(pass, null, null, function(err, res) {
    if(err)
      return cb(err);

    return cb(null, res);
  });
}

User.getAvatar = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_get_avatar, [user_id], function(err, res) {
      if(err)
        return cb(err);

      if (res.rows.length < 1)
        return cb(Error.ResourceNotFound('Profile image not found'));

      cb(null, res.rows[0]);
    });
  });
}

User.setAvatar = function(user_id, avatar, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    S3.upload(config.buckets.avatars, avatar, function(err, url) {
      if(err)
        return cb(err);

      db.query(sql_set_avatar, [user_id, url], function(err, res) {
        if(err)
          return cb(err);

        User.get(user_id, function(err, user) {
          if(err)
            return cb(err);

          cb(null, user);
        });
      });
    });
  });
}

User.setCover = function(user_id, avatar, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    S3.upload(config.buckets.user_covers, avatar, function(err, url) {
      if(err)
        return cb(err);

      db.query(sql_set_cover, [user_id, url], function(err, res) {
        if(err)
          return cb(err);

        User.get(user_id, function(err, user) {
          if(err)
            return cb(err);

          cb(null, user);
        });
      });
    });
  });
}

User.getCover = function(user_id, cb) {
  db.query(sql_get_cover, [user_id], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Cover image not found'));

    cb(null, res.rows[0]);
  });
}

User.getRooms = function(id, cb) {
  db.query(sql_rooms, [id], function(err, res) {
    if(err)
      return cb(err);

    var message_room_ids = res.rows.map(function(r) {
                         return r.message_room;
                       });
    async.map(message_room_ids, MessageRoom.get, function(err, message_rooms) {
      if(err)
        return cb(err);

      cb(null, message_rooms);
    });
  });
}

User.claimInvitations = function(user_id, email, cb) {
  db.query(sql_claim_invitations, [user_id, email], function(err, res) {
    if(err)
      return cb(err);

    cb(null, true);
  });
}

User.getRecommendationObjectForListingOnShortlist = function(shortlist_id, user_id, listing_id, cb) {
  db.query(sql_listing_to_rec_mapping, [shortlist_id, user_id, listing_id], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, null);

    return cb(null, res.rows[0].id);
  });
}

User.publicize = function(model) {
  if (!model.address_id)
    model.address = null;

  if (model.address) Address.publicize(model.address);
  delete model.password;
  delete model.address_id;
  delete model.agency_id;

  return model;
}

module.exports = function(){};