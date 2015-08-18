//TODO: User type is not an enum?

var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var crypto = require('crypto');
var async = require('async');
var bcrypt = require('bcrypt-nodejs');

require('../utils/require_sql.js');
require('../utils/require_asc.js');
require('../utils/require_html.js');

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
      format: 'email',
      required: true
    },

    agency_id: {
      type: 'string',
      uuid: true
    },

    profile_image_url: {
      type: 'string',
      required: false
    },

    profile_image_thumbnail_url: {
      type: 'string',
      required: false
    },

    cover_image_url: {
      type: 'string',
      required: false
    },

    cover_image_thumbnail_url: {
      type: 'string',
      required: false
    },
  }
}

var schema_patch = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      required: false
    },

    password: {
      type: 'string',
      required: false
    },

    first_name: {
      type: 'string',
      required: false,
      minLength: 1,
    },

    last_name: {
      type: 'string',
      required: false,
      minLength: 1,
    },

    email: {
      type: 'string',
      format: 'email',
      required: false
    },
  }
}

var validate = validator.bind(null, schema);
var validate_patch = validator.bind(null, schema_patch);

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
var sql_record_pw_recovery = require('../sql/user/record_pw_recovery.sql');
var sql_listing_to_rec_mapping = require('../sql/user/listing_to_rec_mapping.sql');
var sql_check_pw_reset_token = require('../sql/user/check_pw_reset_token.sql');
var sql_remove_pw_reset_token = require('../sql/user/remove_pw_reset_token.sql');
var sql_get_all = require('../sql/user/get_all.sql');
var sql_patch_timezone = require('../sql/user/patch_timezone.sql');
var sql_ok_push = require('../sql/user/ok_push.sql');

// Text messages required
var text_register = require('../asc/user/register.asc');
var text_subject_register = require('../asc/user/subject_register.asc');
var text_password_recovery = require('../asc/user/password_recovery.asc');
var text_subject_password_recovery = require('../asc/user/subject_password_recovery.asc');
var text_password_recovery_done = require('../asc/user/password_recovery_done.asc');
var text_subject_password_recovery_done = require('../asc/user/subject_password_recovery_done.asc');

var html_body = require('../html/email.html');
var html_password_recovery = require('../html/user/password_recovery.html');
var html_password_recovery_done = require('../html/user/password_recovery_done.html');
var html_register = require('../html/user/register.html');

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

            // SES.sendMail({from: config.email.from,
            //               to: [ user.email ],
            //               source: config.email.source,
            //               html_body: html_body,
            //               message: {
            //                 body: {
            //                   text: {
            //                     data: text_register
            //                   },
            //                   html: {
            //                     data: html_register
            //                   }
            //                 },
            //                 subject: {
            //                   data: text_subject_register
            //                 }
            //               },
            //               template_params: {
            //                 first_name: user.first_name
            //               }
            //              }, function(err, status) {
            return cb(null, user_id);
            // });
          });
        });
      });
    });
  });
}

User.patch = function(user_id, user, cb) {
  validate_patch(user, function(err) {
    if(err)
      return cb(err);

    return update(user_id, user, cb);
  });
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

User.initiatePasswordReset = function(email, cb) {
  User.getByEmail(email, function(err, user) {
    if(err)
      return cb(err);

    if(!user)
      return cb(Error.ResourceNotFound('User not found'));

    crypto.randomBytes(20, function(err, buf) {
      if(err)
        return cb(err);

      var token = buf.toString('hex');

      db.query(sql_record_pw_recovery, [email, user.id, token], function(err, res) {
        if(err)
          return cb(err);

        var pw_token_plain = email + ':' + token;
        var pw_token = Crypto.encrypt(pw_token_plain);
        var url = config.webapp.password_reset_base_url + encodeURIComponent(pw_token);

        SES.sendMail({from: config.email.from,
                      to: [ user.email ],
                      source: config.email.source,
                      html_body: html_body,
                      message: {
                        body: {
                          text: {
                            data: text_password_recovery
                          },
                          html: {
                            data: html_password_recovery
                          }
                        },
                        subject: {
                          data: text_subject_password_recovery
                        }
                      },
                      template_params: {
                        first_name: user.first_name,
                        password_recovery_url: url
                      }
                     }, function(err, status) {
                          return cb(null, true);
                        });
      });
    });
  });
}

User.resetPassword = function(email, token, password, cb) {
  User.getByEmail(email, function(err, user) {
    if(err)
      return cb(err);

    if(!user)
      return cb(Error.ResourceNotFound('User not found'));

    db.query(sql_check_pw_reset_token, [email, token], function(err, res) {
      if(err)
        return cb(err);

      if(res.rows.length < 1)
        return cb(Error.Forbidden());

      User.updatePassword(user.id, password, function(err, ok) {
        if(err)
          return cb(err);

        SES.sendMail({from: config.email.from,
                      to: [ user.email ],
                      source: config.email.source,
                      html_body: html_body,
                      message: {
                        body: {
                          text: {
                            data: text_password_recovery_done
                          },
                          html: {
                            data: html_password_recovery_done
                          }
                        },
                        subject: {
                          data: text_subject_password_recovery_done
                        }
                      },
                      template_params: {
                        first_name: user.first_name
                      }
                     }, function(err, status) {
                          if(err)
                            return cb(err);

                          db.query(sql_remove_pw_reset_token, [email, token], function(err, res) {
                            if(err)
                              return cb(err);

                            return cb(null, true);
                          });
                        });
      });
    });
  });
}

User.notifyViaEmail = function(id, email, cb) {
  User.get(id, function(err, user) {
    if(err)
      return cb(err);

    email.to = [ user.email ];
    if (!email.template_params)
      email.template_params = {};

    email.template_params.first_name = user.first_name;
    email.template_params.last_name = user.last_name;
    email.template_params.email = user.email;

    return SES.sendMail(email, cb);
  });
}

User.getAll = function(cb) {
  db.query(sql_get_all, [], function(err, res) {
    if(err)
      return cb(err);

    var user_ids = res.rows.map(function(r) {
                     return r.id;
                   });

    return cb(null, user_ids);
  });
}

User.patchTimeZone = function(id, timezone, cb) {
  User.get(id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_patch_timezone, [id, timezone], function(err, res) {
      if(err)
        return cb(err);

      return cb();
    });
  });
}

User.isPushOk = function(id, cb) {
  User.get(id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_ok_push, [id], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, res.rows[0].ok);
    });
  });
}

module.exports = function(){};