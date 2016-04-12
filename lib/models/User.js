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
var _u                                  = require('underscore');
var pnu                                 = require('google-libphonenumber').PhoneNumberUtil.getInstance();
var pnf                                 = require('google-libphonenumber').PhoneNumberFormat;
var debug                               = require('debug')('rechat:users');

var sql_insert                          = require('../sql/user/insert.sql');
var sql_update                          = require('../sql/user/update.sql');
var sql_get                             = require('../sql/user/get.sql');
var sql_get_by_email                    = require('../sql/user/get_by_email.sql');
var sql_get_by_phone                    = require('../sql/user/get_by_phone.sql');
var sql_get_by_code                     = require('../sql/user/get_by_code.sql');
var sql_delete                          = require('../sql/user/delete.sql');
var sql_set_address                     = require('../sql/user/set_address.sql');
var sql_unset_address                   = require('../sql/user/unset_address.sql');
var sql_change_password                 = require('../sql/user/change_password.sql');
var sql_get_hashed                      = require('../sql/user/get_hashed.sql');
var sql_claim_invitations               = require('../sql/user/claim_invitations.sql');
var sql_claim_contacts                  = require('../sql/user/claim_contacts.sql');
var sql_record_pw_recovery              = require('../sql/user/record_pw_recovery.sql');
var sql_check_pw_reset_token            = require('../sql/user/check_pw_reset_token.sql');
var sql_remove_pw_reset_token           = require('../sql/user/remove_pw_reset_token.sql');
var sql_get_all                         = require('../sql/user/get_all.sql');
var sql_patch_timezone                  = require('../sql/user/patch_timezone.sql');
var sql_patch_avatars                   = require('../sql/user/patch_avatars.sql');
var sql_ok_push                         = require('../sql/user/ok_push.sql');
var sql_string_search                   = require('../sql/user/string_search.sql');
var sql_get_office                      = require('../sql/user/get_office.sql');
var sql_confirm_email                   = require('../sql/user/confirm_email.sql');
var sql_check_shadow_token              = require('../sql/user/check_shadow_token.sql');

var text_register                       = require('../asc/user/register.asc');
var text_subject_register               = require('../asc/user/subject_register.asc');
var text_password_recovery              = require('../asc/user/password_recovery.asc');
var text_subject_password_recovery      = require('../asc/user/subject_password_recovery.asc');
var text_password_recovery_done         = require('../asc/user/password_recovery_done.asc');
var text_activation                     = require('../asc/user/activation.asc');
var text_activation_done                = require('../asc/user/activation_done.asc');
var text_subject_password_recovery_done = require('../asc/user/subject_password_recovery_done.asc');
var text_subject_activation             = require('../asc/user/subject_activation.asc');
var text_subject_activation_done        = require('../asc/user/subject_activation_done.asc');

var html_body                           = require('../html/email.html');
var html_password_recovery              = require('../html/user/password_recovery.html');
var html_password_recovery_done         = require('../html/user/password_recovery_done.html');
var html_activation                     = require('../html/user/activation.html');
var html_activation_done                = require('../html/user/activation_done.html');
var html_register                       = require('../html/user/register.html');

sql_bulk_search_email = require('../sql/user/bulk_search_email.sql');
sql_bulk_search_phone = require('../sql/user/bulk_search_phone.sql');

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
      required: true
    },

    last_name: {
      type: 'string',
      required: true
    },

    email: {
      type: 'string',
      format: 'email',
      required: true
    },

    phone_number: {
      type: 'string',
      phone: true,
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

    agent: {
      type: 'string',
      uuid: true,
      required: false
    },

    user_type: {
      type: 'string',
      required: true,
      enum: ['Client', 'Agent']
    },

    user_connect: {
      type: 'string',
      uuid: true,
      required: false
    },

    room_connect: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
};

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
      minLength: 1
    },

    last_name: {
      type: 'string',
      required: false,
      minLength: 1
    },

    email: {
      type: 'string',
      format: 'email',
      required: false
    },

    phone_number: {
      type: 'string',
      phone: true,
      required: false
    },

    user_type: {
      type: 'string',
      required: true,
      enum: ['Client', 'Agent', 'Brokerage']
    }
  }
};

var validate = validator.bind(null, schema);
var validate_patch = validator.bind(null, schema_patch);

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
    user.user_type,
    user.agent,
    user.is_shadow
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
 * Checks whether an email address address is available for registration
 * @memberof User
 * @instance
 * @public
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 */
User.emailAvailable = function(user, cb) {
  User.getByEmail(user.email, (err, user) => {
    if(err)
      return cb(err);

    if(user) {
      return cb(Error.Conflict({
        details: {
          attributes: {
            email: 'Provided email already exists'
          },
          info: {
            is_shadow: user.is_shadow,
            id: user.id
          }
        }
      }));
    } else {
      return cb();
    }
  });
}

User.phoneAvailable = function(user, cb) {
  if(!user.phone_number)
    return cb();

  User.getByPhoneNumber(user.phone_number, function(err, user) {
    if(err)
      return cb(err);

    if(user) {
      return cb(Error.Conflict(
        {
          details: {
            attributes: {
              phone_number: 'Provided phone number is already registered to another user'
            }
          }
        }
      ));
    } else {
      return cb();
    }
  });
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
      address: cb => {
        if(!user.address)
          return cb();

        return Address.get(user.address, cb);
      },
      agent: cb => {
        if(!user.agent)
          return cb();

        return Agent.get(user.agent, cb);
      }
    }, function(err, results) {
      if(err)
        return cb(err);

      user.address = results.address || null;
      user.invitation_url = config.webapp.base_url + config.webapp.download_suffix + '/' + user.user_code;
      user.agent = results.agent || null;

      return cb(null, user);
    });
  });
};

User.getCompact = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    user.type = 'compact_user';
    return cb(null, user);
  });
};

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
};

/**
 * Retrieves a full `user` object by phone number
 * @name getByPhoneNumber
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} email - phone number of the user being retrieved
 * @param {callback} cb - callback function
 * @returns {User#user} full `user` object
 */
User.getByPhoneNumber = function(phone, cb) {
  db.query(sql_get_by_phone, [phone], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb();

    return User.get(res.rows[0].id, cb);
  });
};

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
      return cb();

    return User.get(res.rows[0].id, cb);
  });
};

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
  async.auto({
    validate: cb => {
      return validate(user, cb);
    },
    email_available: [
      'validate',
      cb => {
        return User.emailAvailable(user, cb);
      }
    ],
    phone_available: [
      'validate',
      cb => {
        return User.phoneAvailable(user, cb);
      }
    ],
    hash_password: [
      'email_available',
      'phone_available',
      cb => {
        User.hashPassword(user.password, cb);
      }
    ],
    agent: [
      'email_available',
      cb => {
        User.getAgent(user.email, cb);
      }
    ],
    insert: [
      'hash_password',
      'agent',
      (cb, results) => {
        user.password = results.hash_password;
        user.agent = results.agent;

        return insert(user, cb);
      }
    ],
    claim_invitations: [
      'insert',
      (cb, results) => {
        return User.claimInvitations(results.insert, user.email, cb);
      }
    ],
    claim_contacts: [
      'insert',
      (cb, results) => {
        return User.claimContacts(results.insert,
                                  user.email,
                                  user.phone_number,
                                  user.invitation_email,
                                  user.invitation_phone_number,
                                  cb);
      }
    ],
    user_connect: [
      'insert',
      (cb, results) => {
        if(!user.user_connect) {
          debug('>>> (User::create::user_connect) No connect user specified');
          return cb();
        }

        User.get(user.user_connect, err => {
          if(err)
            return cb(err);

          var override = {
            title: 'Welcome to Rechat'
          };

          debug('>>> (User::create::user_connect) Creating a room with user', user.user_connect);
          return Room.bulkCreateWithUsers(results.insert, [user.user_connect], override, cb);
        });
      }
    ],
    room_connect: [
      'insert',
      (cb, results) => {
        if(!user.room_connect) {
          debug('>>> (User::create::user_connect) No connect room specified');
          return cb();
        }

        Room.get(user.room_connect, err => {
          if(err)
            return cb(err);

          debug('>>> (User::create::user_connect) Connecting this user with room', user.room_connect);
          return Room.addUser(results.insert, user.room_connect, cb);
        });
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results.insert);
  });
};

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
  async.auto({
    validate: cb => {
      validate_patch(user, cb);
    },
    get_by_email: cb => {
      if(!user.email)
        return cb();

      User.getByEmail(user.email, function(err, user) {
        if(user && user.id != user_id)
          return cb(Error.Conflict('Provided email is already associated with another user'));

        return cb();
      });
    },
    get_by_phone_number: cb => {
      if(!user.phone_number)
        return cb();

      User.getByPhoneNumber(user.phone_number, function(err, user) {
        if(user && user.id != user_id)
          return cb(Error.Conflict('Provided phone number is already associated with another user'));

        return cb();
      });
    }
  }, function(err, results) {
    if(err)
      return cb(err);

    return update(user_id, user, cb);
  });
};

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
};

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
};

User.getOrCreateByEmail = function(email, cb) {
  User.getByEmail(email, (err, user) => {
    if(err)
      return cb(err);

    if(user)
      return cb(null, user);

    crypto.randomBytes(24, (err, buffer) => {
      if(err)
        return cb(err);


      var shadow_user = {
        first_name: email,
        last_name: '',
        email: email,
        password: buffer.toString('hex'),
        user_type: 'Client',
        is_shadow: true
      };

      User.create(shadow_user, (err, id) => {
        if(err)
          return cb(err);

        return User.get(id, cb);
      });
    });
  });
};

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
      return cb();

    Address.get(user.address, cb);
  });
};

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
};

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
};

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
};

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

    db.query(sql_change_password, [user_id, hashed], cb);
  });
};

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

      return cb(null, res.rows[0].password);
    });
  });
};

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
};

/**
 * Return agent id if there is an agent with supplied email
 * @name getAgent
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} email - email to be matched in agents
 * @param {callback} cb - callback function
 * @returns {uuid} agent id
 */
User.getAgent = function(email, cb) {
  Agent.getByEmail(email, function(err, agent) {
    if(err)
      return cb(err);

    if(!agent)
      return cb();

    return cb(null, agent);
  });
};

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
  db.query(sql_claim_invitations, [user_id, email], cb);
};

User.claimContacts = function(user_id, email, phone_number, invitation_email, invitation_phone_number, cb) {
  db.query(sql_claim_contacts, [user_id, email, phone_number, invitation_email, invitation_phone_number], cb);
};

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

    var token = crypto.randomBytes(20).toString('hex');

    db.query(sql_record_pw_recovery, [email, user.id, token], function(err, res) {
      if(err)
        return cb(err);

      var pw_token_plain = email + ':' + token;
      var pw_token = Crypto.encrypt(pw_token_plain);
      var url = config.webapp.base_url + config.webapp.password_reset_suffix + encodeURIComponent(pw_token);

      Email.send({
        from: config.email.from,
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
          password_recovery_url: url,
          _title: 'Password Recovery'
        }
      }, cb);
    });
  });
};

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

        Email.send({
          from: config.email.from,
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
            first_name: user.first_name,
            _title: 'Password Recovery'
          }
        }, function(err, status) {
          if(err)
            return cb(err);

          db.query(sql_remove_pw_reset_token, [email, token], cb);
        });
      });
    });
  });
};

User.resetPasswordByShadowToken = function(email, token, password, cb) {
  async.auto({
    user: cb => {
      User.getByEmail(email, (err, user) => {
        if(!user)
          return cb(Error.ResourceNotFound('User not found'));

        return cb(null, user);
      });
    },
    check: [
      'user',
      cb => {
        db.query(sql_check_shadow_token, [email, token], (err, res) => {
          if(err)
            return cb(err);

          else if(res.rows.length < 1)
            return cb(Error.Forbidden());

          else return cb();
        });
      }
    ],
    update_password: [
      'user',
      'check',
      (cb, results) => {
        return User.updatePassword(results.user.id, password, cb);
      }
    ],
    confirm: [
      'user',
      'check',
      'update_password',
      (cb, results) => {
        return User.confirmEmail(results.user.id, cb);
      }
    ],
    email: [
      'user',
      'check',
      'update_password',
      'confirm',
      (cb, results) => {
        Email.send({
          from: 'Rechat <' + config.email.from + '>',
          to: [ results.user.email ],
          source: config.email.source,
          html_body: html_body,
          message: {
            body: {
              text: {
                data: text_activation_done
              },
              html: {
                data: html_activation_done
              }
            },
            subject: {
              data: text_subject_activation_done
            }
          },
          template_params: {
            first_name: results.user.first_name,
            _title: 'Account Activated'
          }
        }, cb);
      }
    ]
  }, cb);
};

User.confirmEmail = function(id, cb) {
  db.query(sql_confirm_email, [id], (err, res) => {
    if(err)
      return cb(err);

    return cb();
  });
};

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

    email.template_params = {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      _title: 'Notification'
    };

    return Email.send(email, cb);
  });
};

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
};

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
};

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

      return cb(null, res.rows[0].remaining);
    });
  });
};

User.bulkSearchByFamily = function(family, queries, cb) {
  var _queries = '{' + queries.join(',') + '}';
  var _sql = global['sql_bulk_search_' + family];
  if (!_sql)
    return cb(Error.Validation('Search method not recognized'));

  db.query(_sql, [_queries], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var user_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(user_ids, User.getCompact, function(err, users) {
      if(err)
        return cb(err);

      users[0].total = res.rows[0].total;
      return cb(null, users);
    });
  });
};

User.stringSearch = function(user_id, terms, cb) {
  terms = terms.map(function(r) { return '.*' + r + '.*'; });

  db.query(sql_string_search, [user_id, terms], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var user_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(user_ids, User.get, function(err, users) {
      if(err)
        return cb(err);

      users[0].total = res.rows[0].total;
      return cb(null, users);
    });
  });
};

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
  delete model.secondary_password;
  delete model.address_id;

  return model;
};

User.patchAvatars = function(user_id, type, link, cb) {
  if(type != 'Profile' && type != 'Cover')
    return cb(Error.Validation('Invalid patch type'));

  return db.query(sql_patch_avatars, [user_id, type, link], cb);
};

User.classifyPhoneNumbers = function(phones, cb) {
  var existing = [];
  var non_existing = [];

  async.map(phones, (r, cb) => {
    User.getByPhoneNumber(r, (err, user) => {
      if(err)
        return cb(err);

      if(!user) {
        non_existing.push(r);
        return cb();
      }

      existing.push(r);
      return cb();
    });
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, {
      existing: existing,
      non_existing: non_existing
    });
  });
};

User.getOrCreateByEmailBulk = function(emails, cb) {
  async.map(emails, (r, cb) => {
    User.getOrCreateByEmail(r, (err, user) => {
      if(err)
        return cb(err);

      return cb(null, user.id);
    });
  }, cb);
};

User.getOffice = function(user_id, cb) {
  db.query(sql_get_office, [user_id], (err, res) => {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb();

    return cb(null, res.rows[0]);
  });
};

User.getFormattedPhoneNumber = function(phone) {
  if(!phone || phone == '' || typeof(phone) != 'string')
    return null;

  var p = pnu.parse(phone);
  return pnu.format(p, pnf.INTERNATIONAL);
};

User.getFormattedForLogs = function(user) {
  return (user.first_name + ' ' + user.last_name +
          ' <' + user.email + '>'.black.cyanBG + ' ' + ('(' + user.id.blue + ')').blue);
};

User.sendActivation = function(user_id, cb) {
  User.get(user_id, (err, user) => {
    if(err)
      return cb(err);

    if(!user.is_shadow)
      return cb(Error.Forbidden('User is already activated'));

    async.auto({
      branch: (cb, results) => {
        var data = {};

        var token_plain = user.email + ':' + user.secondary_password;
        var token = Crypto.encrypt(token_plain);
        var desktop_url = config.webapp.base_url + '/activate?token=' + encodeURIComponent(token);

        data.shadow_token = user.secondary_password;
        data.email = user.email;
        data['$desktop_url'] = desktop_url;

        Branch.createURL(data, cb);
      },
      send_email: [
        'branch',
        (cb, results) => {
          return Email.send({
            from: 'Rechat <' + config.email.from + '>',
            to: [ user.email ],
            source: config.email.source,
            html_body: html_body,
            message: {
              body: {
                html: {
                  data: html_activation
                },
                text: {
                  data: text_activation
                }
              },
              subject: {
                data: text_subject_activation
              }
            },
            template_params: {
              first_name: user.first_name,
              last_name: user.last_name,
              branch_url: results.branch,
              base_url: config.webapp.base_url,
              _title: 'Activation'
            }
          }, cb);
        }
      ]
    }, (err, results) => {
      if(err)
        return cb(err);

      return cb();
    });
  });
};

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
  var clone = _u.clone(model);
  for (var i in model) delete model[i];

  model.id = clone.id;
  model.first_name = clone.first_name;
  model.last_name = clone.last_name;
  model.profile_image_url = clone.profile_image_url;
  model.created_at = clone.created_at;
  model.updated_at = clone.updated_at;
  model.type = 'compact_user';

  return model;
};

module.exports = function() {};
