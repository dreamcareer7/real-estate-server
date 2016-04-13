/**
 * @namespace Contact
 */

var validator = require('../utils/validator.js');
var db        = require('../utils/db.js');
var config    = require('../config.js');
var sql       = require('../utils/require_sql.js');
var async     = require('async');
var _u        = require('underscore');

Contact = {};

var schema = {
  type: 'object',
  properties: {
    user: {
      uuid: true,
      type: 'string',
      required: true
    },

    contact: {
      uuid: true,
      type: 'string',
      required: false
    },

    first_name: {
      type: 'string',
      required: false
    },

    last_name: {
      type: 'string',
      required: false
    },

    phone_number: {
      type: 'string',
      minLength: 2,
      maxLength: 20,
      required: false
    },

    email: {
      type: 'string',
      format: 'email',
      maxLength: 50,
      required: false
    },

    cover_image_url: {
      type: 'string',
      required: false
    },

    profile_image_url: {
      type: 'string',
      required: false
    },

    invitation_url: {
      type: 'string',
      required: false
    },

    company: {
      type: 'string',
      required: false
    },

    address: {
      type: 'object',
      required: false
    },

    birthday: {
      type: 'number',
      required: false
    }
  }
};

var validate = validator.bind(null, schema);

// SQL queries to work with User object
var sql_get           = require('../sql/contact/get.sql');
var sql_user          = require('../sql/contact/user.sql');
var sql_add           = require('../sql/contact/add.sql');
var sql_delete        = require('../sql/contact/delete.sql');
var sql_update        = require('../sql/contact/update.sql');
var sql_search        = require('../sql/contact/search.sql');
var sql_patch_avatars = require('../sql/contact/patch_avatars.sql');
var sql_add_tag       = require('../sql/contact/add_tag.sql');
var sql_get_tags      = require('../sql/contact/get_tags.sql');
var sql_get_by_tag    = require('../sql/contact/get_by_tag.sql');
var sql_remove_tag    = require('../sql/contact/remove_tag.sql');
var sql_remove_tags   = require('../sql/contact/remove_tags.sql');
var sql_connected     = require('../sql/contact/connected.sql');
var sql_dup           = require('../sql/contact/is_dup.sql');

function getContacts(family, user_id, paging, cb) {
  db.query(family, [user_id, paging.type, paging.timestamp, paging.limit], function(err, res) {
    if (err)
      return cb(err);

    var contact_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(contact_ids, Contact.get, function(err, contacts) {
      if (err)
        return cb(err);

      return cb(null, contacts);
    });
  });
}

Contact.getForUser = function(user_id, paging, cb) {
  getContacts(sql_user, user_id, paging, cb);
};

Contact.get = function(contact_id, cb) {
  db.query(sql_get, [contact_id], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Contact not found'));

    var contact = res.rows[0];
    async.parallel({
      contact_user: cb => {
        if (!contact.contact_user)
          return cb();

        return User.getCompact(contact.contact_user, cb);
      },
      tags: cb => {
        Contact.getTags(contact_id, cb);
      }
    }, function(err, results) {
      contact.contact_user = results.contact_user || null;
      contact.tags = results.tags || null;

      return cb(null, contact);
    });
  });
};

Contact.isDup = function(user_id, contact, cb) {
  db.query(sql_dup, [user_id, contact.contact_user, contact.email, contact.phone_number], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows[0].is_dup);
  });
};

Contact.add = function(user_id, contact, cb) {
  if (!(contact.email || contact.phone_number))
    return cb(Error.Validation('You must supply at least an email or a phone number for a contact'));

  if (contact.phone_number)
    contact.phone_number = ObjectUtil.cleanPhoneNumber(contact.phone_number);

  contact.user = user_id;

  async.auto({
    resolve: cb => {
      Contact.resolve(contact.email, contact.phone_number, cb);
    },
    validate: [
      'resolve',
      (cb, results) => {
        contact.contact_user = results.resolve;

        validate(contact, cb);
      }],
    dup: [
      'resolve',
      'validate',
      (cb, results) => {
        return Contact.isDup(user_id, contact, cb);
      }],
    create: [
      'resolve',
      'validate',
      'dup',
      (cb, results) => {
        if ((!contact.match_credentials) ||
            (contact.match_credentials && contact.contact_user && !results.dup)) {
          db.query(sql_add, [
            user_id,
            contact.contact_user,
            contact.first_name,
            contact.last_name,
            contact.phone_number,
            contact.email,
            contact.cover_image_url,
            contact.profile_image_url,
            contact.invitation_url,
            contact.company,
            contact.birthday,
            contact.address
          ], function(err, res) {
            if (err)
              return cb(err);

            return cb(null, res.rows[0].id);
          });
        } else {
          return cb();
        }
      }],
    add_tag: [
      'resolve',
      'validate',
      'create',
      (cb, results) => {
        if (results.create && contact.tags)
          return Contact.addTag(results.create, contact.tags, user_id, cb);
        else
          return cb();
      }],
    get: [
      'resolve',
      'validate',
      'create',
      (cb, results) => {
        if (results.create) {
          Contact.get(results.create, function(err, data) {
            if (err)
              return cb(err);

            data.device_contact_id = contact.device_contact_id;
            return cb(null, data);
          });
        } else {
          return cb();
        }
      }]
  }, function(err, results) {
    if (err)
      return cb(err);

    return cb(null, results.get);
  });
};

Contact.delete = function(contact_id, cb) {
  db.query(sql_delete, [contact_id], cb);
};

Contact.patch = function(contact_id, user_id, contact, cb) {
  contact.user = user_id;

  Contact.resolve(contact.email, contact.phone_number, function(err, contact_user_id) {
    if (err)
      return cb(err);

    contact.contact_user = contact_user_id;
    for (var i in contact)
      if (contact[i] === null)
        delete contact[i];

    validate(contact, function(err) {
      if (err)
        return cb(err);

      Contact.removeTags(contact_id, err => {
        if(err)
          return cb(err);

        if (contact.tags)
          Contact.addTag(contact_id, contact.tags, function(err) {
            if (err)
              return cb(err);
          });


        return db.query(sql_update, [
          contact.contact_user,
          contact.first_name,
          contact.last_name,
          contact.phone_number,
          contact.email,
          contact.cover_image_url,
          contact.profile_image_url,
          contact.invitation_url,
          contact.company,
          contact.birthday,
          contact.address,
          contact_id
        ], cb);
      });
    });
  });
};

Contact.resolve = function(email, phone_number, cb) {
  User.getByEmail(email, function(err, user_email) {
    if (err)
      return cb(err);

    User.getByPhoneNumber(phone_number, function(err, user_phone) {
      if (err)
        return cb(err);

      if (user_email && user_phone)
        return cb(null, user_email.id);

      else if (user_email && !user_phone)
        return cb(null, user_email.id);

      else if (!user_email && user_phone)
        return cb(null, user_phone.id);

      else
        return cb(null, null);
    });
  });
};

Contact.stringSearch = function(user_id, strings, cb) {
  var regexps = ObjectUtil.makeRegexps(strings);

  db.query(sql_search, [user_id, regexps], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, []);

    var contact_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(contact_ids, Contact.get, function(err, contacts) {
      if (err)
        return cb(err);

      return cb(null, contacts);
    });
  });
};

Contact.patchAvatars = function(contact_id, type, link, cb) {
  if (type != 'Profile' && type != 'Cover')
    return cb(Error.Validation('Invalid patch type'));

  return db.query(sql_patch_avatars, [contact_id, type, link], cb);
};

Contact.addTag = function(contact_id, tags, user_id, cb) {
  var insert = (contact_id, user_id, tag, cb) => {
    db.query(sql_add_tag, [contact_id, tag, user_id], cb);
  };
  async.each(tags, insert.bind(null, contact_id, user_id), cb);
};

Contact.getByTags = function(user_id, tags, cb) {
  var tag_arr = tags.split(',');

  db.query(sql_get_by_tag, ['Contact', tag_arr, user_id], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows.legnth < 1)
      return cb(null, true);


    var contact_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(contact_ids, Contact.get, function(err, contacts) {
      if (err)
        return cb(err);

      return cb(null, contacts);
    });
  });
};

Contact.getTags = function(contact_id, cb) {
  db.query(sql_get_tags, [contact_id, 'Contact'], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, false);

    var tags = res.rows.map(function(r) {
      return r.tag;
    });

    return cb(null, tags);
  });
};

Contact.removeTag = function(contact_id, tag, cb) {
  db.query(sql_remove_tag, [contact_id, tag], cb);
};

Contact.removeTags = function(contact_id, cb) {
  Contact.get(contact_id, err => {
    if(err)
      return cb(err);

    return db.query(sql_remove_tags, [contact_id], cb);
  });
};

Contact.isConnected = function(user_id, peer_id, cb) {
  db.query(sql_connected, [user_id, peer_id], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows[0].is_connected > 0)
      return cb(null, true);
    else
      return cb();
  });
};

Contact.connect = function(user_id, peer_id, cb) {
  Contact.join(user_id, peer_id, function(err) {
    if (err)
      return cb(err);

    Contact.join(peer_id, user_id, function(err) {
      if (err)
        return cb(err);

      return cb();
    });
  });
};

Contact.join = function(user_id, peer_id, cb) {
  Contact.isConnected(user_id, peer_id, function(err, connected) {
    if (err)
      return cb(err);

    if (connected)
      return cb();

    User.get(peer_id, function(err, peer) {
      if (err)
        return cb(err);

      var contact = {
        contact_user: peer_id,
        first_name: (peer.first_name) ? peer.first_name : undefined,
        last_name: (peer.last_name) ? peer.last_name : undefined,
        phone_number: (peer.phone_number) ? peer.phone_number : undefined,
        email: peer.email,
        profile_image_url: (peer.profile_image_url) ? peer.profile_image_url : undefined,
        cover_image_url: (peer.cover_image_url) ? peer.cover_image_url : undefined
      };

      return Contact.add(user_id, contact, cb);
    });
  });
};

Contact.publicize = function(model) {
  if (model.contact_user) User.publicize(model.contact_user);
  if (model.user) delete model.user;

  return model;
};

module.exports = function() {
};
