var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var crypto = require('crypto');
var async = require('async');
var _u = require('underscore');

require('../utils/require_sql.js');
require('../utils/require_asc.js');
require('../utils/require_html.js');

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

    room: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with recommendation objects
var sql_get                      = require('../sql/invitation/get.sql');
var sql_get_room                 = require('../sql/invitation/get_room.sql');
var sql_insert                   = require('../sql/invitation/insert.sql');
var sql_patch                    = require('../sql/invitation/patch.sql');
var sql_delete                   = require('../sql/invitation/delete.sql');
var sql_user                     = require('../sql/invitation/user.sql');
var sql_get_email                = require('../sql/invitation/get_email.sql');

var text_current_user            = require('../asc/invitation/current_user.asc');
var text_new_user                = require('../asc/invitation/new_user.asc');
var text_new_user_rechat         = require('../asc/invitation/new_user_rechat.asc');
var text_subject_current_user    = require('../asc/invitation/subject_current_user.asc');
var text_subject_new_user        = require('../asc/invitation/subject_new_user.asc');
var text_subject_new_user_rechat = require('../asc/invitation/subject_new_user_rechat.asc');

var html_body                    = require('../html/email.html');
var html_new_user                = require('../html/invitation/new_user.html');
var html_new_user_rechat         = require('../html/invitation/new_user_rechat.html');
var html_current_user            = require('../html/invitation/current_user.html');

Invitation.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(null, false);

    var invitation = res_base.rows[0];

    async.parallel({
      room: function(cb) {
        if (!invitation.room)
          return cb();

        Room.get(invitation.room, cb);
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
         if(err)
           return cb(err);

         invitation.room = results.room || null;
         invitation.invited_user = results.invited_user || null;
         invitation.inviting_user = results.inviting_user || null;

         return cb(null, invitation);
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
    room: function(cb) {
      if (!invitation.room)
        return cb();

      return Room.get(invitation.room, cb);
    },
    is_member: ['validate',
                'user',
                'room',
                function(cb, results) {
                  if(results.user) {
                    invitation.invited_user = results.user.id;

                    if(results.room) {
                      return Room.isMember(invitation.room, results.user.id, cb);
                    } else {
                      return cb(null, false);
                    }
                  } else {
                    return cb(null, false);
                  }
                }],
    record_invitation: ['is_member',
                        'user',
                        'room',
                        function(cb, results) {
                          if(!results.is_member) {
                            db.query(sql_insert, [invitation.inviting_user,
                                                  invitation.invited_user,
                                                  invitation.email,
                                                  invitation.room],
                                     function(err, res) {
                                       if(err)
                                         return cb(err);

                                       return cb(null, res.rows[0].id);
                                     });
                          } else {
                            return cb(Error.Conflict());
                          }
                        }],
    send_notification: ['is_member',
                        'user',
                        'room',
                        'inviting_user',
                        'record_invitation',
                        function(cb, results) {
                          // if(results.room) {
                          //   if(!results.is_member && results.user) {
                          //     var notification = {};

                          //     var sh_users = _u.clone(results.room.users);
                          //     var count = sh_users.length;
                          //     var aux;

                          //     for (var i in sh_users) {
                          //       if(sh_users[i].id == results.inviting_user.id)
                          //         sh_users.splice(i, 1);
                          //     }

                          //     switch (count) {
                          //       case 0:
                          //       aux = '';
                          //       break;
                          //       case 1:
                          //       aux = '';
                          //       break;
                          //       case 2:
                          //       aux = ' with @' + sh_users[0].first_name;
                          //       break;
                          //       default:
                          //       aux = ' with @' + sh_users[0].first_name + ' and ...';
                          //       break;
                          //     }

                          //     var base_message = '@' + results.inviting_user.first_name + ' invited you to join #' + results.room.title + ' team';
                          //     notification.action = 'Invited';
                          //     notification.subject = invitation.inviting_user;
                          //     notification.subject_class = 'User';
                          //     notification.object = invitation.invited_user;
                          //     notification.object_class = 'User';
                          //     notification.auxiliary_object = invitation.room;
                          //     notification.auxiliary_object_class = 'Room';
                          //     notification.message = base_message + aux;

                          //     // return Notification.issueForUser(results.user.id, results.room.id, notification, cb);
                          //     return cb(null, true);
                          //   } else {
                          //     return cb(null, false);
                          //   }
                          // } else {
                            return cb(null, false);
                          // }
                        }],
    invitation: ['record_invitation',
                 function(cb, results) {
                   return Invitation.get(results.record_invitation, cb);
                 }],
    send_email: ['invitation', 'inviting_user', 'user', 'room',
                 function(cb, results) {
                   if(results.room) {
                     if(results.user) {
                       // Sending email to a user already on our service for a specific room
                       SES.sendMail({from: config.email.from,
                                     to: [ invitation.email ],
                                     source: config.email.source,
                                     html_body: html_body,
                                     message: {
                                       body: {
                                         html: {
                                           data: html_current_user
                                         },
                                         text: {
                                           data: text_current_user
                                         }
                                       },
                                       subject: {
                                         data: text_subject_current_user
                                       }
                                     },
                                     template_params: {
                                       first_name: results.inviting_user.first_name,
                                       last_name: results.inviting_user.last_name,
                                       invitee_email: invitation.email,
                                       invitee_first_name: results.user.first_name,
                                       invitee_last_name: results.user.last_name,
                                       room_title: results.room.title,
                                       user_code: results.inviting_user.user_code,
                                       download_base_url: config.webapp.download_base_url
                                     }
                                    }, cb);
                     } else {
                       // Sending email to a user not on our service for a specific room
                       SES.sendMail({from: config.email.from,
                                     to: [ invitation.email ],
                                     source: config.email.source,
                                     html_body: html_body,
                                     message: {
                                       body: {
                                         html: {
                                           data: html_new_user
                                         },
                                         text: {
                                           data: text_new_user
                                         }
                                       },
                                       subject: {
                                         data: text_subject_new_user
                                       }
                                     },
                                     template_params: {
                                       first_name: results.inviting_user.first_name,
                                       last_name: results.inviting_user.last_name,
                                       invitee_email: invitation.email,
                                       room_title: results.room.title,
                                       user_code: results.inviting_user.user_code,
                                       download_base_url: config.webapp.download_base_url
                                     }
                                    }, cb);
                     }
                   } else {
                     if(results.user) {
                       // Sending a generic invite to app to a user already on our service is not required
                       return cb(null, false);
                     } else {
                       // Sending email to a user not on our service for a generic invite to app
                       SES.sendMail({from: config.email.from,
                                     to: [ invitation.email ],
                                     source: config.email.source,
                                     html_body: html_body,
                                     message: {
                                       body: {
                                         html: {
                                           data: html_new_user_rechat
                                         },
                                         text: {
                                           data: text_new_user_rechat
                                         }
                                       },
                                       subject: {
                                         data: text_subject_new_user_rechat
                                       }
                                     },
                                     template_params: {
                                       first_name: results.inviting_user.first_name,
                                       last_name: results.inviting_user.last_name,
                                       invitee_email: invitation.email,
                                       invitee_first_name: results.user.first_name,
                                       invitee_last_name: results.user.last_name,
                                       user_code: results.inviting_user.user_code,
                                       download_base_url: config.webapp.download_base_url
                                     }
                                    }, cb);
                    }
                   }
                 }]
  }, function(err, results) {
       if(err) {
         if(err.code == '23505')
           return cb(Error.Conflict());
         else
           return cb(err);
       } else {
         return cb(null, results.invitation);
       }
     });
}

Invitation.patch = function(invitation_id, action, cb) {
  Invitation.get(invitation_id, function(err, invitation) {
    if(err)
      return cb(err);

    db.query(sql_patch, [invitation_id, action], function(err, res) {
      if(err)
        return cb(err);

      if(action === true) {
        if(invitation.room) {
          Room.addUser(invitation.invited_user.id, invitation.room.id, function(err, res) {
            if(err)
              return cb(err);

            Invitation.get(invitation_id, function(err, invitation) {
              if(err)
                return cb(err);

              return cb(null, invitation);
            });
          });
        } else {
          return cb(null, invitation);
        }
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

Invitation.getForUser = function(user_id, type, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err)

    db.query(sql_user, [user_id, type], function(err, res) {
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

Invitation.getForRoom = function(room_id, cb) {
  Room.get(room_id, function(err, room) {
    if(err)
      return cb(err);

    db.query(sql_get_room, [room_id], function(err, res) {
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

Invitation.getByEmail = function(email, cb) {
  db.query(sql_get_email, [email], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.RoomNotFound('No invitations found for this user'));

    var invitation_ids = res.rows.map(function(r) {
                           return r.id;
                         });

    async.map(invitation_ids, Invitation.get, function(err, invites) {
      if(err)
        return cb(err);

      return cb(null, invites);
    });
  });
}

Invitation.publicize = function(model) {
  if (model.invited_user) User.publicize(model.invited_user);
  if (model.inviting_user) User.publicize(model.inviting_user);
  if (model.room) Room.publicize(model.room);

  return model;
}

module.exports = function(){};