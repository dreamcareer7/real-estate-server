/**
 * @namespace Invitations
 */

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
      required: false
    },

    phone_number: {
      type: 'string',
      required: false
    },

    invitee_first_name: {
      type: 'string',
      required: false
    },

    invitee_last_name: {
      type: 'string',
      required: false
    },

    room: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
};

var validate = validator.bind(null, schema);

// SQL queries to work with recommendation objects
var sql_get                  = require('../sql/invitation/get.sql');
var sql_get_room             = require('../sql/invitation/get_room.sql');
var sql_insert               = require('../sql/invitation/insert.sql');
var sql_patch                = require('../sql/invitation/patch.sql');
var sql_delete               = require('../sql/invitation/delete.sql');
var sql_user                 = require('../sql/invitation/user.sql');
var sql_get_email            = require('../sql/invitation/get_email.sql');

text_current_user            = require('../asc/invitation/current_user.asc');
text_new_user                = require('../asc/invitation/new_user.asc');
text_new_user_rechat         = require('../asc/invitation/new_user_rechat.asc');
text_new_user_rechat_phone   = require('../asc/invitation/new_user_rechat_phone.asc');
text_subject_current_user    = require('../asc/invitation/subject_current_user.asc');
text_subject_new_user        = require('../asc/invitation/subject_new_user.asc');
text_subject_new_user_rechat = require('../asc/invitation/subject_new_user_rechat.asc');

html_body                    = require('../html/email.html');
html_new_user                = require('../html/invitation/new_user.html');
html_new_user_rechat         = require('../html/invitation/new_user_rechat.html');
html_current_user            = require('../html/invitation/current_user.html');

Invitation.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(Error.ResourceNotFound('Invitation not found'));

    var invitation = res_base.rows[0];

    async.parallel({
      room: function(cb) {
        if (!invitation.room)
          return cb();

        return Room.get(invitation.room, cb);
      },
      invited_user: function(cb) {
        if(!invitation.invited_user)
          return cb();

        return User.get(invitation.invited_user, cb);
      },
      inviting_user: function(cb) {
        if(!invitation.inviting_user)
          return cb();

        return User.get(invitation.inviting_user, cb);
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
};

Invitation.create = function(invitation, cb) {
  async.auto({
    validate: function(cb) {
      return validate(invitation, cb);
    },
    resolve: function(cb) {
      return Contact.resolve(invitation.email, invitation.phone_number, cb);
    },
    inviting_user: function(cb) {
      return User.get(invitation.inviting_user, cb);
    },
    room: function(cb) {
      if (!invitation.room)
        return cb();

      return Room.get(invitation.room, cb);
    },
    user: ['resolve',
           function(cb, results) {
             if(results.resolve)
               return User.get(results.resolve, cb);

             return cb();
           }],
    type: ['user',
           function(cb, results) {
             if(results.user) {
               if(invitation.room)
                 return cb(null, 'current_user');
               else
                 return cb(null, 'current_user_rechat');
             } else {
               if(invitation.room)
                 return cb(null, 'new_user');
               else
                 return cb(null, 'new_user_rechat');
             }

             return cb();
           }],
    record_email_verification: ['user',
                                'validate',
                                function(cb, results) {
                                  if(!invitation.email || results.user)
                                    return cb();

                                  EmailVerification.create({email: invitation.email}, false, function(err, id) {
                                    if(err)
                                      return cb(err);

                                    EmailVerification.get(id, function(err, verification) {
                                      if(err)
                                        return cb(err);

                                      return cb(null, verification.code);
                                    });
                                  });
                                }],
    record_phone_verification: ['user',
                                'validate',
                                function(cb, results) {
                                  if(!invitation.phone_number || results.user)
                                    return cb();

                                  PhoneVerification.create({phone_number: invitation.phone_number}, false, function(err, id) {
                                    if(err)
                                      return cb(err);

                                    PhoneVerification.get(id, function(err, verification) {
                                      if(err)
                                        return cb(err);

                                      return cb(null, verification.code);
                                    });
                                  });
                                }],
    branch: ['room',
             'user',
             'record_email_verification',
             'record_phone_verification',
             function(cb, results) {
               var data = {};

               if(invitation.room) {
                 data.room = invitation.room;
               }

               if(results.user) {
                 data.user = results.user.id;
               }

               if(invitation.phone_number) {
                 data.phone_code = results.record_phone_verification;
                 data.phone_number = invitation.phone_number;
               }

               if(invitation.email) {
                 data.email_code = results.record_email_verification;
                 data.email = invitation.email;
               }

               Branch.getURL(data, cb);
             }],
    record_invitation: ['user',
                        'room',
                        'branch',
                        function(cb, results) {
                          db.query(sql_insert, [invitation.inviting_user,
                                                invitation.invited_user,
                                                invitation.email,
                                                invitation.phone_number,
                                                invitation.invitee_first_name,
                                                invitation.invitee_last_name,
                                                results.branch,
                                                invitation.room],
                                   function(err, res) {
                                     if(err)
                                       return cb(err);

                                     return cb(null, res.rows[0].id);
                                   });
                        }],
    send_notification: ['user',
                        'room',
                        'inviting_user',
                        'record_invitation',
                        function(cb, results) {
                          if(results.room) {
                            var notification = {};

                            var name = (results.user) ? results.user.first_name :
                                  ((invitation.invitee_first_name) ? invitation.invitee_first_name :
                                   ((invitation.email) ? invitation.email : invitation.phone_number));


                            notification.message = '@' + results.inviting_user.first_name + ' invited ' +
                              name + ' to join #' + results.room.title;
                            notification.action = 'Invited';
                            notification.subject = invitation.inviting_user;
                            notification.subject_class = 'User';
                            notification.object = invitation.room;
                            notification.object_class = 'Room';
                            if (results.user) {
                              notification.auxiliary_object = results.user.id;
                              notification.auxiliary_object_class = 'User';
                            }
                            notification.room = invitation.room;

                            return Notification.issueForRoom(notification, cb);
                          } else {
                            return cb();
                          }
                        }],
    add_user_to_room: ['send_notification',
                       'type',
                       'room',
                       'user',
                       function(cb, results) {
                         if(results.type != 'current_user')
                           return cb();

                         Room.isMember(results.user.id, results.room.id, function(err, member) {
                           if(member)
                             return cb();

                           return Room.addUser(results.user.id, results.room.id, cb);
                         });
                       }],
    invitation: ['record_invitation',
                 function(cb, results) {
                   return Invitation.get(results.record_invitation, cb);
                 }],
    send_email: ['invitation',
                 'inviting_user',
                 'user',
                 'room',
                 'type',
                 'branch',
                 function(cb, results) {
                   if(!results.type || results.type == 'current_user_rechat' || !invitation.email)
                     return cb();

                   return SES.sendMail({from: config.email.from,
                                        to: [ invitation.email ],
                                        source: config.email.source,
                                        html_body: html_body,
                                        message: {
                                          body: {
                                            html: {
                                              data: global['html_' + results.type]
                                            },
                                            text: {
                                              data: global['text_' + results.type]
                                            }
                                          },
                                          subject: {
                                            data: global['text_subject_' + results.type]
                                          }
                                        },
                                        template_params: {
                                          first_name: results.inviting_user.first_name,
                                          last_name: results.inviting_user.last_name,
                                          invitee_email: invitation.email,
                                          invitee_first_name: (results.user) ? results.user.first_name :
                                            ((invitation.invitee_first_name) ? invitation.invitee_first_name : null),
                                          invitee_last_name: (results.user) ? results.user.last_name :
                                            ((invitation.invitee_last_name) ? invitation.invitee_last_name : null),
                                          user_code: results.inviting_user.user_code,
                                          branch_url: results.branch,
                                          room_title: (results.room) ? results.room.title : null,
                                          _title: 'Invitation'
                                        }
                                       }, cb);
                 }],
    send_sms: ['invitation',
               'inviting_user',
               'user',
               'room',
               'branch',
               function(cb, results) {
                 if(!invitation.phone_number)
                   return cb();

                 return Twilio.sendSMS({
                   from: config.twilio.from,
                   to: invitation.phone_number,
                   body: text_new_user_rechat_phone,
                   template_params: {
                     first_name: results.inviting_user.first_name,
                     last_name: results.inviting_user.last_name,
                     invitee_email: invitation.email,
                     invitee_first_name: (results.user) ? results.user.first_name :
                       ((invitation.invitee_first_name) ? invitation.invitee_first_name : null),
                     invitee_last_name: (results.user) ? results.user.last_name :
                       ((invitation.invitee_last_name) ? invitation.invitee_last_name : null),
                     user_code: results.inviting_user.user_code,
                     branch_url: results.branch
                   }
                 }, cb);
               }]
  }, function(err, results) {
    if(err)
      return cb(err);

    return cb(null, results.invitation);
  });
};

Invitation.patch = function(invitation_id, action, cb) {
  Invitation.get(invitation_id, function(err, invitation) {
    if(err)
      return cb(err);

    db.query(sql_patch, [invitation_id, action], function(err, res) {
      if(err)
        return cb(err);

      if(action === true) {
        if(invitation.room) {
          Room.addUser(invitation.invited_user.id, invitation.room.id, function(err) {
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
};

Invitation.delete = function(invitation_id, cb) {
  db.query(sql_delete, [invitation_id], cb);
};

Invitation.getForUser = function(user_id, type, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

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
};

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
};

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
};

Invitation.publicize = function(model) {
  if (model.invited_user) User.publicize(model.invited_user);
  if (model.inviting_user) User.publicize(model.inviting_user);
  if (model.room) Room.publicize(model.room);
  if (model.url) delete model.url;

  return model;
};

module.exports = function(){};
