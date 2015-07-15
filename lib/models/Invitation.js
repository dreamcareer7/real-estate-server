var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var crypto = require('crypto');
var sql = require('../utils/require_sql.js');
var async = require('async');
var _u = require('underscore');

Invitation = {};

var schema = {
  type: 'object',
  properties: {
    invited_user: {
      type: 'string',
      uuid: true,
      required: false
    },

    inviting_user: {
      type: 'string',
      uuid: true,
      required: true
    },

    email: {
      type: 'string',
      format: 'email',
      required: true
    },

    resource: {
      type: 'string',
      uuid: true,
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with recommendation objects
var sql_get = require('../sql/invitation/get.sql');
var sql_get_shortlist = require('../sql/invitation/get_shortlist.sql');
var sql_insert = require('../sql/invitation/insert.sql');
var sql_patch = require('../sql/invitation/patch.sql');
var sql_delete = require('../sql/invitation/delete.sql');
var sql_user = require('../sql/invitation/user.sql');

Invitation.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(null, false);

    var invitation = res_base.rows[0];

    async.parallel({
      resource: function(cb) {
        if (!invitation.resource)
          return cb();

        Shortlist.get(invitation.resource, cb);
      },
      invited_user: function(cb) {
        if(!invitation.invited_user)
          return cb();

        User.get(invitation.invited_user, cb);
      },
      inviting_user: function(cb) {
        if(!invitation.inviting_user)
          return cb();

        User.get(invitation.inviting_user, cb);
      }
    }, function(err, results) {
         var res_final = invitation;
         res_final.resource = results.resource || null;
         res_final.invited_user = results.invited_user || null;
         res_final.inviting_user = results.inviting_user || null;

         cb(null, res_final);
       });
  });
}

Invitation.create = function(invitation, cb) {
  async.auto({
    validate: function(cb) {
      return validate(invitation, cb);
    },
    user: function(cb) {
      return User.getByEmail(invitation.email, cb);
    },
    inviting_user: function(cb) {
      return User.get(invitation.inviting_user, cb);
    },
    shortlist: function(cb) {
      return Shortlist.get(invitation.resource, cb);
    },
    is_member: ['validate', 'user', 'shortlist',
                function(cb, results) {
                  if(results.user) {
                    invitation.invited_user = results.user.id;
                    return Shortlist.isMember(invitation.resource, results.user.id, cb);
                  } else {
                    return cb(null, false);
                  }
                }],
    record_invitation: ['is_member', 'user', 'shortlist',
                        function(cb, results) {
                          if(!results.is_member) {
                            db.query(sql_insert, [invitation.inviting_user,
                                                  invitation.invited_user,
                                                  invitation.email,
                                                  invitation.resource],
                                     function(err, res) {
                                       if(err)
                                         return cb(err);

                                       return cb(null, res.rows[0].id);
                                     });
                          } else {
                            return cb(Error.Conflict());
                          }
                        }],
    send_notification: ['is_member', 'user', 'shortlist', 'inviting_user', 'record_invitation',
                        function(cb, results) {
                          if(!results.is_member && results.user) {
                            var notification = {};

                            var sh_users = _u.clone(results.shortlist.users);
                            var count = sh_users.length;
                            var aux;

                            for (var i in sh_users) {
                              if(sh_users[i].id == results.inviting_user.id)
                                sh_users.splice(i, 1);
                            }

                            switch (count) {
                              case 0:
                              aux = '';
                              break;
                              case 1:
                              aux = '';
                              break;
                              case 2:
                              aux = ' with @' + sh_users[0].first_name;
                              break;
                              default:
                              aux = ' with @' + sh_users[0].first_name + ' and ...';
                              break;
                            }

                            var base_message = '@' + results.inviting_user.first_name + ' invited you to join #' + results.shortlist.title + ' team';
                            notification.action = 'Invited';
                            notification.object_class = 'Shortlist';
                            notification.message = base_message + aux;
                            notification.object = invitation.resource;
                            notification.notifying_users = invitation.inviting_user;
                            notification.subject = invitation.invited_user;
                            notification.subject_class = 'User';

                            return Notification.issueForUser(results.user.id, results.shortlist.id, notification, cb);
                          } else {
                            return cb(null, false);
                          }
                        }],
    invitation: ['record_invitation',
                 function(cb, results) {
                   return Invitation.get(results.record_invitation, cb);
                 }]
  }, function(err, results) {
       if(err) {
         if(err.code = '23505')
           return cb(Error.Conflict());
         else
           return cb(err);
       } else {
         return cb(null, results.invitation);
       }
     });
}

Invitation.patch = function(invitation_id, action, cb) {
  db.query(sql_patch, [invitation_id, action], function(err, res) {
    if(err)
      return cb(err);

    Invitation.get(invitation_id, function(err, invitation) {
      if(err)
        return cb(err);

      if(action === true) {
        Shortlist.addUser(invitation.invited_user.id, invitation.resource.id, function(err, res) {
          if(err)
            return cb(err);

          return cb(null, invitation);
        });
      } else {
        return cb(null, invitation);
      }
    });
  });
}

Invitation.delete = function(invitation_id, cb) {
  db.query(sql_delete, [invitation_id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, true);
  });
}

Invitation.getForUser = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err)

    db.query(sql_user, [user_id], function(err, res) {
      if(err)
        return cb(err);

      if(res.rows.length < 1)
        return cb(null, []);

      var invitation_ids = res.rows.map(function(r) {
                             return r.id;
                           });

      async.map(invitation_ids, Invitation.get, function(err, invitations) {
        if(err)
          return cb(err);

        return cb(null, invitations);
      });
    });
  });
}

Invitation.getForShortlist = function(shortlist_id, cb) {
  Shortlist.get(shortlist_id, function(err, shortlist) {
    if(err)
      return cb(err);

    db.query(sql_get_shortlist, [shortlist_id], function(err, res) {
      if(err)
        return cb(err);

      if(res.rows.length < 1)
        return cb(null, []);

      var invitee_ids = res.rows.map(function(r) {
                          return r.id;
                        });

      async.map(invitee_ids, Invitation.get, function(err, invitees) {
        if(err)
          return cb(err);

        return cb(null, invitees);
      });
    });
  });
}


Invitation.publicize = function(model) {
  if (model.invited_user) User.publicize(model.invited_user);
  if (model.inviting_user) User.publicize(model.inviting_user);
  if (model.resource) Shortlist.publicize(model.resource);

  return model;
}
