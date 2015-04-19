var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var async = require('async');
var sql = require('../utils/require_sql.js');

Shortlist = {};

var schema = {
  type: 'object',
  properties: {
    shortlist_type: {
      type: 'string',
      required: true,
      enum: [ 'Shoppers', 'Sellers' ]
    },

    title: {
      type: 'string',
      required: false
    },

    owner: {
      type: 'string',
      uuid: true,
      required: true
    },

    status: {
      type: 'string',
      enum: ['New', 'Searching', 'Touring', 'OnHold', 'Closing', 'ClosedCanceled', 'ClosedSuccess'],
      required: false
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with Shortlist object
var sql_insert = require('../sql/shortlist/insert.sql');
var sql_get = require('../sql/shortlist/get.sql');
var sql_update = require('../sql/shortlist/update.sql');
var sql_delete = require('../sql/shortlist/delete.sql');
var sql_delete_users = require('../sql/shortlist/delete_users.sql');
var sql_delete_invitations = require('../sql/shortlist/delete_invitations.sql');
var sql_delete_recommendations = require('../sql/shortlist/delete_recommendations.sql');
var sql_delete_notifications = require('../sql/shortlist/delete_notifications.sql');
var sql_delete_alerts = require('../sql/shortlist/delete_alerts.sql');
var sql_get_for_user = require('../sql/shortlist/get_for_user.sql');
var sql_add_user = require('../sql/shortlist/add_user.sql');
var sql_get_users = require('../sql/shortlist/get_users.sql');
var sql_add_missing = require('../sql/shortlist/add_missing.sql');
var sql_rooms = require('../sql/shortlist/rooms.sql');
var sql_user_rooms = require('../sql/shortlist/user_rooms.sql');
var sql_others = require('../sql/shortlist/others.sql');
var sql_dup = require('../sql/shortlist/dup.sql');
var sql_join_default = require('../sql/shortlist/join_default.sql');
var sql_get_default = require('../sql/shortlist/get_default.sql');
var sql_get_one_to_ones = require('../sql/shortlist/get_one_to_ones.sql');
var sql_join_comments = require('../sql/shortlist/join_comments.sql');
var sql_set_alert_index = require('../sql/shortlist/set_alert_index.sql');

function insert(shortlist, cb) {
  db.query(sql_insert, [
    shortlist.shortlist_type,
    shortlist.title,
    shortlist.owner
  ], function(err, res) {
       if(err)
         return cb(err);

       return cb(null, res.rows[0].id);
     });
}

function add_user(user_id, shortlist_id, cb) {
  db.query(sql_add_user, [user_id, shortlist_id], function(err, res) {
    if(err) {
      if (err.code === '23505')
        return cb();

      return cb(err);
    }

    db.query(sql_add_missing, [user_id, shortlist_id], function(err, res) {
      if(err)
        return cb(err);

      cb(null, false);
    });
  });
}

Shortlist.getAllForUser = function(id, cb) {
  db.query(sql_get_for_user, [id], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, []);

    var shortlist_ids = res.rows.map(function(r) {
                          return r.id;
                        });
    async.map(shortlist_ids, Shortlist.get, function(err, shortlists) {
      cb(null, shortlists);
    });
  });
}

Shortlist.getUsers = function(id, cb) {
  db.query(sql_get_users, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, false);

    cb(null, res.rows);
  });
}

Shortlist.getUserIds = function(id, cb) {
  Shortlist.getUsers(id, function(err, users) {
    if(err)
      return cb(err);

    var user_ids = users.map(function(r) {
      return r.id;
    });

    return cb(null, user_ids);
  });
}

Shortlist.get = function(id, cb) {
  var res_final;
  var res_owner;

  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(Error.ResourceNotFound('Shortlist not found'));

    User.get(res_base.rows[0].owner, function(err, user) {
      if (err)
        return cb(err);

      Shortlist.getUsers(id, function(err, users) {
        if (err)
          return cb(err);

        res_owner = user;
        res_final = res_base.rows[0];
        res_final.owner = res_owner;
        res_final.users = users;

        cb(null, res_final);
      });
    });
  });
}

Shortlist.create = function(shortlist, cb) {
  validate(shortlist, function(err) {
    if(err)
      return cb(err);

    User.get(shortlist.owner, function(err, user) {
      if (err)
        return cb(err);

      insert(shortlist, function(err, shortlist_id) {
        if(err)
          return cb(err);

        Shortlist.createDefaultRoom(shortlist_id, shortlist.owner, function(err, message_room_id) {
            if(err)
              return cb(err);

          Shortlist.addUser(shortlist.owner, shortlist_id, function(err, ok) {
            if(err)
              return cb(err);
            return cb(null, shortlist_id);
          });
        });
      });
    });
  });
}

Shortlist.update = function(shortlist_id, shortlist, cb) {
  Shortlist.get(shortlist_id, function(err, data) {
    if(err)
      return cb(err);

    validate(shortlist, function(err) {
      if(err)
        return cb(err);

      db.query(sql_update, [
        shortlist.shortlist_type,
        shortlist.title,
        shortlist.owner,
        shortlist.status,
        shortlist_id
      ], function(err, res) {
           if(err)
             return cb(Error.Database());

           return cb(null, false);
         });
    });
  });
}

Shortlist.patch = function(shortlist_id, shortlist, cb) {
  Shortlist.get(shortlist_id, function(err, data) {
    if(err)
      return cb(err);

    data.owner = data.owner.id;

    for(var i in shortlist)
      data[i] = shortlist[i];


    Shortlist.update(shortlist_id, data, function(err, res) {
      if(err)
        return cb(err);

      Shortlist.get(shortlist_id, function(err, shortlist) {
        if(err)
          return cb(err);

        return cb(null, shortlist);
      });
    });
  });
}

Shortlist.delete = function(id, cb) {
  async.series({
    get: function(cb) {
      Shortlist.get(id, function(err, shortlist) {
        if(err)
          return cb(err);

        return cb(null, shortlist);
      });
    },
    delete_rooms: function(cb) {
      Shortlist.deleteRooms(id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_recommendations: function(cb) {
      Shortlist.deleteRecommendations(id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_invitations: function(cb) {
      Shortlist.deleteInvitations(id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_notifications: function(cb) {
      Shortlist.deleteNotifications(id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_users: function(cb) {
      Shortlist.deleteUsers(id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_alerts: function(cb) {
      Shortlist.deleteAlerts(id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_object: function(cb) {
      Shortlist.deleteObject(id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    }
  }, function(err, results) {
       if(err)
         return cb(err);

       return cb(null, true);
     });
}

Shortlist.deleteUsers = function(id, cb) {
  db.query(sql_delete_users, [id], cb);
}

Shortlist.deleteInvitations = function(id, cb) {
  db.query(sql_delete_invitations, [id], cb);
}

Shortlist.deleteRecommendations = function(id, cb) {
  db.query(sql_delete_recommendations, [id], cb);
}

Shortlist.deleteNotifications = function(id, cb) {
  db.query(sql_delete_notifications, [id], cb);
}

Shortlist.deleteAlerts = function(id, cb) {
  db.query(sql_delete_alerts, [id], cb);
}

Shortlist.deleteObject = function(id, cb) {
  db.query(sql_delete, [id], cb);
}

Shortlist.addUser = function(user_id, shortlist_id, cb) {
    User.get(user_id, function(err, user) {
      if (err)
        return cb(err);
      Shortlist.get(shortlist_id, function(err, shortlist) {
        if (err)
          return cb(err);

        add_user(user_id, shortlist_id, function(err, ok) {
          if(err)
            return cb(err);

          Shortlist.joinDefaultRoom(user_id, shortlist_id, function(err, ok) {
            if(err)
              return cb(err);
            Shortlist.joinComments(user_id, shortlist_id, function(err, ok) {
              if(err)
                return cb(err);

              Shortlist.others(shortlist_id, user_id, function(err, others) {
                if(err)
                  return cb(err);

                var others_ids = others.map(function(r) {
                                   return r.user;
                                 });

                async.map(others_ids, function(other_id, cb) {
                  return Shortlist.createPrivateMessageOnShortlist(user_id, other_id, shortlist_id, cb);
                }, function(err, message_room_id) {
                     if(err)
                       return cb(err);

                     Notification.issueForShortlistExcept(shortlist_id,
                                                          user_id,
                                                          {
                                                            action: 'Joined',
                                                            object_class: 'Shortlist',
                                                            message: user.first_name + ' has joined this Room',
                                                            object: shortlist_id,
                                                            notifying_user: user_id
                                                          }, function(err, ok) {
                                                               if(err)
                                                                 return cb(err);

                                                               return cb(null, true);
                                                             });
                   });
              });
            });
          });
        });
      });
    });
}

Shortlist.createPrivateMessageOnShortlist = function(user_id, peer_id, shortlist_id, cb) {
  var message_room = {}
  message_room.shortlist = shortlist_id;
  message_room.message_room_type = 'OneToOneMessaging';
  message_room.users = [ user_id, peer_id ];

  MessageRoom.create(message_room, function(err, message_room) {
    if(err)
      return cb(err);

    return cb(null, message_room.id);
  });
}

Shortlist.getRoomIds = function(shortlist_id, cb) {
  db.query(sql_rooms, [shortlist_id], function(err, res) {
    if(err)
      return cb(err);

    var message_room_ids = res.rows.map(function(r) {
                             return r.id;
                           });

    cb(null, message_room_ids);
  });
}

Shortlist.getRooms = function(shortlist_id, cb) {
  Shortlist.getRoomIds(shortlist_id, function(err, message_room_ids) {
    if(err)
      return cb(err);

    async.map(message_room_ids, MessageRoom.get, function(err, message_rooms) {
      if(err)
        return cb(err);

      cb(null, message_rooms);
    });
  });
}

Shortlist.deleteRooms = function(shortlist_id, cb) {
  Shortlist.getRoomIds(shortlist_id, function(err, message_room_ids) {
    if(err)
      return cb(err);

    async.map(message_room_ids, MessageRoom.delete, function(err, message_rooms) {
      if(err)
        return cb(err);

      cb(null, true);
    });
  });
}

Shortlist.getUserRooms = function(shortlist_id, user_id, type, paging, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    Shortlist.get(shortlist_id, function(err, shortlist) {
      if(err)
        return cb(err);

      db.query(sql_user_rooms, [user_id, shortlist_id, type, paging.type, paging.timestamp, paging.limit], function(err, res) {
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
    });
  });
}

Shortlist.getUglyRooms = function(shortlist_id, user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    Shortlist.get(shortlist_id, function(err, shortlist) {
      if(err)
        return cb(err);

      Shortlist.getDefaultRoom(shortlist_id, function(err, default_room) {
        if(err)
          return cb(err);

        Shortlist.getOneToOneRooms(shortlist_id, user_id, function(err, one_to_one_rooms) {
          if(err)
            return cb(err);


          var ugly_rooms_ids = [default_room].concat(one_to_one_rooms);
          async.map(ugly_rooms_ids, MessageRoom.get, function(err, ugly_rooms) {
            if(err)
              return cb(err);

            cb(null, ugly_rooms);
          });
        });
      });
    });
  });
}

Shortlist.getOneToOneRooms = function(shortlist_id, user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    Shortlist.get(shortlist_id, function(err, shortlist) {
      if(err)
        return cb(err);

      db.query(sql_get_one_to_ones, [user_id, shortlist_id], function(err, res) {
        if(err)
          return cb(err);

        if(res.rows.length < 0)
          return cb(Error.ResourceNotFound());

        var message_room_ids = res.rows.map(function(r) {
                                 return r.message_room;
                               });

        return cb(null, message_room_ids);
      });
    });
  });
}

Shortlist.getDefaultRoom = function(shortlist_id, cb) {
  Shortlist.get(shortlist_id, function(err, shortlist) {
    if(err)
      return cb(err);

    db.query(sql_get_default, [shortlist_id], function(err, res) {
      if(err)
        return cb(err);

      if(res.rows.length < 0)
        return cb(Error.ResourceNotFound());

      return cb(null, res.rows[0].id);
    });
  });
}

Shortlist.joinDefaultRoom = function(user_id, shortlist_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    Shortlist.get(shortlist_id, function(err, shortlist) {
      if(err)
        return cb(err);

      db.query(sql_join_default, [user_id, shortlist_id], function(err, res) {
        if(err)
          return cb(err);

        cb(null, false);
      });
    });
  });
}

Shortlist.joinComments = function(user_id, shortlist_id, cb) {
  db.query(sql_join_comments, [user_id, shortlist_id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, false);
  });
}

Shortlist.createDefaultRoom = function(shortlist_id, owner, cb) {
  var message_room = {};
  message_room.shortlist = shortlist_id;
  message_room.owner = owner;
  message_room.message_room_type = 'Shortlist';

  MessageRoom.create(message_room, function(err, message_room) {
    if(err)
      return cb(err);

    return cb(null, message_room.id);
  });
}

Shortlist.others = function(shortlist_id, user_id, cb) {
  Shortlist.get(shortlist_id, function(err, shortlist) {
    if(err)
      return cb(err);

    db.query(sql_others, [shortlist_id, user_id], function(err, res) {
      if(err)
        return cb(err);

      cb(null, res.rows);
    });
  });
}

Shortlist.getNextAlertIndex = function(shortlist_id, cb) {
  Shortlist.get(shortlist_id, function(err, shortlist) {
    if(err)
      return cb(err);

    return cb(null, shortlist.alert_index);
  });
}

Shortlist.incAlertIndex = function(shortlist_id, cb) {
  Shortlist.get(shortlist_id, function(err, shortlist) {
    if(err)
      return cb(err);

    db.query(sql_set_alert_index, [shortlist_id, shortlist.alert_index + 1], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, true);
    });
  });
}

Shortlist.recommendListing = function(shortlist_id, listing_id, cb) {
  Listing.get(listing_id, function(err, listing) {
    if(err)
      return cb(err);

    var recommendation = {};
    var message_room = {};

    recommendation.source = 'MLS';
    recommendation.url = 'http://www.ntreis.net/';
    recommendation.referred_shortlist = shortlist_id;
    recommendation.object = listing_id;
    recommendation.recommendation_type = 'Listing';
    recommendation.matrix_unique_id = listing.matrix_unique_id;
    recommendation.status = 'Unacknowledged';

    message_room.message_room_type = 'Comment';
    message_room.listing = listing_id;
    message_room.shortlist = shortlist_id;

    async.auto({
      shortlist: function(cb) {
        return Shortlist.get(shortlist_id, cb);
      },
      dup: ['shortlist',
            function(cb) {
              db.query(sql_dup, [listing_id, shortlist_id], function(err, res) {
              if (err)
                return cb(err);

              if (res.rows[0].is_dup === true)
                return cb(Error.Conflict());

                return cb(null, true);
              });
            }],
      users: ['dup',
              function(cb) {
                return Shortlist.getUserIds(shortlist_id, cb);
              }],
      comment_room: ['dup',
                     function(cb) {
                       MessageRoom.create(message_room, function(err, mdata) {
                   if(err)
                     return cb(err);

                   return cb(null, mdata);
                 });
                     }],
      join_users: ['comment_room',
                   function(cb, results) {
                     MessageRoom.addUsersToRoom(results.comment_room.id,
                                                results.users,
                                                function(err, ok) {
                                                  if(err)
                                                    return cb(err);

                                                  return cb(null, ok);
                                                });
                   }],
      recommendations: ['users', 'comment_room',
                        function(cb, results) {
                          async.map(results.users, function(id, cb) {
                                  var clone = JSON.parse(JSON.stringify(recommendation));
                                  clone.referring_user = id;
                                  clone.message_room = results.comment_room.id;

                                  return Recommendation.create(clone, cb);
                                }, function(err, results) {
                      if(err)
                        return cb(err);

                      return cb(null, results);
                           });
                        }]
    }, function(err, results) {
         if(err)
           return cb(err);

         return cb(null, results.recommendations);
       });
  });
}

Shortlist.publicize = function(model) {
  if (model.owner) User.publicize(model.owner);
  if (model.users) model.users.map(User.publicize);
  delete model.alert_index;

  return model;
}

module.exports = function(){};