/**
 * @namespace User
 */

require('../utils/require_sql.js');
require('../utils/require_asc.js');
require('../utils/require_html.js');

var validator                           = require('../utils/validator.js');
var db                                  = require('../utils/db.js');
var config                              = require('../config.js');
var crypto                              = require('crypto');
var async                               = require('async');
var bcrypt                              = require('bcrypt-nodejs');

var sql_insert                          = require('../sql/user/insert.sql');
var sql_update                          = require('../sql/user/update.sql');
var sql_get                             = require('../sql/user/get.sql');
var sql_get_by_email                    = require('../sql/user/get_by_email.sql');
var sql_get_by_code                     = require('../sql/user/get_by_code.sql');
var sql_delete                          = require('../sql/user/delete.sql');
var sql_set_address                     = require('../sql/user/set_address.sql');
var sql_unset_address                   = require('../sql/user/unset_address.sql');
var sql_change_password                 = require('../sql/user/change_password.sql');
var sql_get_hashed                      = require('../sql/user/get_hashed.sql');
var sql_claim_invitations               = require('../sql/user/claim_invitations.sql');
var sql_record_pw_recovery              = require('../sql/user/record_pw_recovery.sql');
var sql_check_pw_reset_token            = require('../sql/user/check_pw_reset_token.sql');
var sql_remove_pw_reset_token           = require('../sql/user/remove_pw_reset_token.sql');
var sql_get_all                         = require('../sql/user/get_all.sql');
var sql_patch_timezone                  = require('../sql/user/patch_timezone.sql');
var sql_ok_push                         = require('../sql/user/ok_push.sql');

var text_register                       = require('../asc/user/register.asc');
var text_subject_register               = require('../asc/user/subject_register.asc');
var text_password_recovery              = require('../asc/user/password_recovery.asc');
var text_subject_password_recovery      = require('../asc/user/subject_password_recovery.asc');
var text_password_recovery_done         = require('../asc/user/password_recovery_done.asc');
var text_subject_password_recovery_done = require('../asc/user/subject_password_recovery_done.asc');

var html_body                           = require('../html/email.html');
var html_password_recovery              = require('../html/user/password_recovery.html');
var html_password_recovery_done         = require('../html/user/password_recovery_done.html');
var html_register                       = require('../html/user/register.html');

User = {};

CompactUser = {};

/**
 * * `Deleted`
 * * `De-Activated`
 * * `Restricted`
 * * `Banned`
 * * `Active`
 * @typedef user_status
 * @type {string}
 * @memberof User
 * @instance
 * @enum {string}
 */

/**
 * * `Client`
 * * `Agent`
 * @typedef user_type
 * @type {string}
 * @memberof User
 * @instance
 * @enum {string}
 */

/**
 * @typedef user
 * @type {object}
 * @memberof User
 * @instance
 * @property {uuid} id - ID of this `user`
 * @property {string} type - this is always *user*
 * @property {string} password - _bcrypt_ hash of current password
 * @property {string} first_name - first name
 * @property {string} last_name - last name
 * @property {string} email - email address
 * @property {User#user_type} user_type - indicates the type of this user
 * @property {User#user_status} user_status - current `user` status
 * @property {string} timezone - standard time zone string associated with this `user`
 * @property {number} user_code - automatically generated `user` code. We use this code to give users the ability to easily connect with each other
 * @property {uuid=} agency_id - ID of the agency object associated with this `user` if any
 * @property {string=} profile_image_url - URL of the profile image
 * @property {string=} cover_image_url - URL of the cover image
 * @property {string=} phone_number - phone number
 * @property {boolean=} email_confirmed - indicates whether this `user` has confirmed their email address
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 */

/**
 * @typedef compact_user
 * @type {object}
 * @memberof User
 * @instance
 * @property {uuid} id - ID of this `user`
 * @property {string} first_name - first name
 * @property {string} last_name - last name
 * @property {User#user_type} user_type - indicates the type of this `user`
 * @property {number} user_code - automatically generated `user` code. We use this code to give users the ability to easily connect with each other
 * @property {string=} profile_image_url - URL of the profile image
 * @property {string=} cover_image_url - URL of the cover image
 */

var schema = {
  type: 'object',
  properties: {
    password: {
      type: 'string',
      required: true
    },

    first_name: {
      type: 'string',
      required: true,
      minLength: 1
    },

    last_name: {
      type: 'string',
      required: true,
      minLength: 1
    },

    email: {
      type: 'string',
      format: 'email',
      required: true
    },

    agency_id: {
      type: 'string',
      uuid: true,
      required: false
    },

    profile_image_url: {
      type: 'string',
      required: false
    },

    cover_image_url: {
      type: 'string',
      required: false
    },

    user_type: {
      type: 'string',
      required: true,
      enum: ['Client', 'Agent']
    }
  }
}

var schema_patch = {
  type: 'object',
  properties: {
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

    user_type: {
      type: 'string',
      required: true,
      enum: ['Client', 'Agent']
    }
  }
}

var validate = validator.bind(null, schema);
var validate_patch = validator.bind(null, schema_patch);

/**
 * Checks whether an email address address is available for registration
 * @memberof User
 * @instance
 * @public
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 */
function emailAvailable(user, cb) {
  User.getByEmail(user.email, function(err, user) {
    if(err)
      return cb(err);

    if(user) {
      return cb(Error.Validation(
        {
          details: {
            attributes: {
              email: 'Provided email already exists'
            }
          },
          http: 409
        }
      ));
    }

    return cb();
  });
}

/**
 * Inserts a `user` object into database
 * @memberof User
 * @instance
 * @public
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `user` object created
 */
function insert(user, cb) {
  db.query(sql_insert, [
    user.first_name,
    user.last_name,
    user.password,
    user.email,
    user.phone_number,
    user.agency_id,
    user.user_type
  ], function(err, res) {
       if(err)
         return cb(err);

       return cb(null, res.rows[0].id);
     });
}

/**
 * Updates a `user` object from database
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being updated
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 * @returns {?}
 */
function update(user_id, user, cb) {
  db.query(sql_update, [
    user.first_name,
    user.last_name,
    user.email,
    user.phone_number,
    user.profile_image_url,
    user.cover_image_url,
    user.user_type,
    user_id
  ], cb);
}

/**
 * Retrieves a full `User` object
 * @name get
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being retrieved
 * @param {callback} cb - callback function
 * @returns {User#user}
 */
User.get = function(user_id, cb) {
  db.query(sql_get, [user_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('User not found'));

    var user = res.rows[0];

    async.parallel({
      address: function(cb) {
        if(!user.address)
          return cb();

        Address.get(user.address, cb);
      }
    }, function(err, results) {
         if(err)
           return cb(err);

         user.address = results.address || null;
         user.invitation_url = config.webapp.download_base_url + user.user_code;

         return cb(null, user);
       });
  });
}

/**
 * Retrieves a full `user` object by email
 * @name getByEmail
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} email - email of the user being retrieved
 * @param {callback} cb - callback function
 * @returns {User#user} full `user` object
 */
User.getByEmail = function(email, cb) {
  db.query(sql_get_by_email, [email], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, false);

    return User.get(res.rows[0].id, cb);
  });
}

/**
 * Retrieves a full `user` object by the associated internal code
 * A minimum of 3 digit number given to every user upon creation
 * based on a PostgreSQL sequence
 * @name getByCode
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {number} code - code of the user being retrieved
 * @param {callback} cb - callback function
 * @returns {User#user} full `user` object
 */
User.getByCode = function(code, cb) {
  db.query(sql_get_by_code, [code], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, false);

    return User.get(res.rows[0].id, cb);
  });
}

/**
 * Creates a `user` object
 * @name create
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 * @returns {User#user} ID of the created `user` object
 */
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

            return cb(null, user_id);
          });
        });
      });
    });
  });
}

/**
 * Patches a `user` object with new data
 * @name patch
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being patched
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 * @returns {?}
 */
User.patch = function(user_id, user, cb) {
  validate_patch(user, function(err) {
    if(err)
      return cb(err);

    return update(user_id, user, cb);
  });
}

/**
 * Updates a `user` object with new data with full validation
 * @name update
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being patched
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 * @returns {?}
 */
User.update = function(user_id, user, cb) {
  validate(user, function(err) {
    if(err)
      return cb(err);

    return update(user_id, user, cb);
  });
}

/**
 * Deletes a `user` object
 * @name delete
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being deleted
 * @param {callback} cb - callback function
 */
User.delete = function(user_id, cb) {
  db.query(sql_delete, [user_id], cb);
}

/**
 * Returns a full `Address` object associated with a `user`
 * @name getAddress
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {Address#address}
 */
User.getAddress = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    if(!user || !user.address)
      return cb(null, false);

    Address.get(user.address, cb);
  });
}

/**
 * Sets an `Address` object for a `user`
 * @name setAddress
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {Address#address} address - full address object
 * @param {callback} cb - callback function
 */
User.setAddress = function(user_id, address, cb) {
  Address.create(address, function(err, address) {
    if(err)
      return cb(err);

    db.query(sql_set_address, [address, user_id], cb);
  });
}

/**
 * Unsets an `Address` associated with a `user` object
 * @name unsetAddress
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 */
User.unsetAddress = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    if(!user || !user.address)
      return cb();

    Address.delete(user.address, function(err) {
      if(err)
        return cb(err);

      db.query(sql_unset_address, [user_id], cb);
    });
  });
}

/**
 * Checks whether a `user` object's password has the same _bcrypt_ hash as the supplied password
 * @name verifyPassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {User#user} user - full user object
 * @param {string} passowrd - password to be verified
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.verifyPassword = function(user, password, cb) {
  User.getHashedPassword(user.id, function(err, hash) {
    if(err)
      return cb(err);

    bcrypt.compare(password, hash, function(err, ok) {
      if(err)
        return cb(err);

      cb(null, ok);
    });
  });
}

/**
 * Updates the _bcrypt_ hashed password for a `user` object
 * @name updatePassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {string} new_password - new password for the user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
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

/**
 * Triggers the flow of password change. It checks whether `old_password`
 * matches current password of the `user`, then replaces current password with the
 * supplied `new_password` argument
 * @name changePassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {string} old_password - current password for the user
 * @param {string} new_password - new password for the user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.changePassword = function(user_id, old_password, new_password, cb) {
  User.verifyPassword({id: user_id}, old_password, function(err, ok) {
    if(err)
      return cb(err);

    if(!ok)
      return cb(Error.Unauthorized());

    return User.updatePassword(user_id, new_password, cb);
  });
}

/**
 * Gets the `user` hashed password
 * @name getHashedPassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {string} _bcrypt_ hashed password
 */
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

/**
 * Creates a _bcrypt_ hash of the supplied password
 * @name hashPassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} password - password to be hashed
 * @param {callback} cb - callback function
 * @returns {string} _bcrypt_ hashed password
 */
User.hashPassword = function(password, cb) {
  bcrypt.hash(password, null, null, function(err, res) {
    if(err)
      return cb(err);

    return cb(null, res);
  });
}

/**
 * It's possible to send an invitation for a non-existing user using an email address.
 * When a user with the same email address, joins our service we claim these invitations
 * for them and update corresponding invitation objects with their ID.
 * @name claimInvitations
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {string} email - email of the referenced user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.claimInvitations = function(user_id, email, cb) {
  db.query(sql_claim_invitations, [user_id, email], function(err, res) {
    if(err)
      return cb(err);

    cb(null, true);
  });
}

/**
 * This method initiates a password recovery flow for a user. We create a string consisting of their email
 * and a random token and encrypt the whole thing. We then send this token as a query string link to our own
 * password recovery app using email. When the user clicks on the link, they get redirected to our password
 * recovery app which asks them about a new password. This is a fairly straightforward and common process.
 * @name initiatePasswordReset
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} email - email of the referenced user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
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

/**
 * This is almost always called by our password recovery app. It checks whether we have a record for password
 * recovery request for a certain user and checks that against the provided token. If all goes well, password
 * for the requesting user is changed.
 * @name resetPassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} email - email of the referenced user
 * @param {string} token - token deciphered from the encrypted link in the email
 * @param {string} password - new password
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
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

/**
 * Sends a specific email body to a `User`
 * @name notifyViaEmail
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {SES#email} email - A full email object including template parameters
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.notifyViaEmail = function(user_id, email, cb) {
  User.get(user_id, function(err, user) {
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

/**
 * Retrieves all user ids from our database. This is dangerous and should not
 * be called by anyone except in very special circumstances. eg. sending a notice
 * email to all the user base.
 * @name getAll
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {callback} cb - callback function
 * @returns {uuid[]}
 */
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

/**
 * Updates a time zone information for a user
 * @name patchTimeZone
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {string} timezone - new time zone string representation
 * @param {callback} cb - callback function
 * @returns {uuid[]}
 */
User.patchTimeZone = function(user_id, timezone, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_patch_timezone, [user_id, timezone], function(err, res) {
      if(err)
        return cb(err);

      return cb();
    });
  });
}

/**
 * We have the policy of disabling push notification between 9:30 PM
 * and 8:30 AM. This should later turn into something more configurable.
 * @name isPushOK
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.isPushOK = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_ok_push, [user_id], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, res.rows[0].ok);
    });
  });
}

/**
 * Stripping the `User` object off of it's sensitive contents for public consumption
 * like password, email, etc.
 * @name publicize
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {User#user} model - user model to be modified
 * @returns {User#user} modified user object
 */
User.publicize = function(model) {
  if (!model.address)
    model.address = null;

  if (model.address) Address.publicize(model.address);
  delete model.password;
  delete model.address_id;
  delete model.agency_id;

  return model;
}

/**
 * CompactUser is a minified subset of the `User` object. It contains
 * enough information to make the /agents page work.
 * @name publicize
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {User#user} model - user model to be modified
 * @returns {User#compact_user} modified compact_user object
 */
CompactUser.publicize = function(model) {
  return model;
}

module.exports = function() {};
