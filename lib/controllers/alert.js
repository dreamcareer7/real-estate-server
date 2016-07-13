var async     = require('async');
var _u        = require('underscore');
var validator = require('../utils/validator.js');

var bulk_alert_create = {
  type: 'object',
  properties: {
    notification: {
      type: 'boolean',
      required: false
    },
    emails: {
      type: 'array',
      required: false,
      minItems: 1,
      items: {
        type: 'string',
        format: 'email'
      }
    },
    phone_numbers: {
      type: 'array',
      required: false,
      minItems: 1,
      items: {
        type: 'string',
        phone: true
      }
    },
    users: {
      type: 'array',
      required: false,
      minItems: 1,
      items: {
        type: 'string',
        uuid: true
      }
    },
    rooms: {
      type: 'array',
      required: false,
      minItems: 1,
      items: {
        type: 'string',
        uuid: true
      }
    },
    alert: {
      type: 'object',
      required: true
    }
  }
};

function createAlert(req, res) {
  var room_id = req.params.id;
  var alert = req.body;
  alert.created_by = req.user.id;

  Alert.create(room_id, alert, function(err, alert) {
    if(err)
      return res.error(err);

    res.model(alert);
  });
}

function checkAlert(req, res) {
  var alert = req.body;

  if(req.user)
    alert.created_by = req.user.id;

  Listing.getStatuses((err, allStatuses) => {
    alert.listing_statuses = req.body.listing_statuses ? req.body.listing_statuses : allStatuses;

    if(!req.user) {
      alert.listing_statuses = alert.listing_statuses;
//         .filter( state => state !== 'Leased' )
//         .filter( state => state !== 'Sold' );
    }

    Alert.check(alert, function(err, compact_listings) {
      if(err)
        return res.error(err);

      return res.collection(compact_listings);
    });
  });
}

function patchAlert(req, res) {
  var room_id = req.params.rid;
  var user_id = req.user.id;
  var alert_id = req.params.id;
  var alert = req.body;

  Alert.patch(room_id, user_id, alert_id, alert, function(err, alert) {
    if(err)
      return res.error(err);

    return res.model(alert);
  });
}

function getAlertsForRoom(req, res) {
  var room_id = req.params.id;
  var paging = {};
  req.pagination(paging);

  Alert.getForRoom(room_id, paging, function(err, alerts) {
    if(err)
      return res.error(err);

    return res.collection(alerts);
  });
}

function get(req, res) {
  var alert_id = req.params.id;

  Alert.get(alert_id, (err, alert) => {
    if(err)
      return res.error(err);

    return res.model(alert);
  });
}

function getAlertsForUser(req, res) {
  var user_id = req.user.id;
  var paging = {};
  req.pagination(paging);

  Alert.getForUser(user_id, paging, function(err, alerts) {
    if(err)
      return res.error(err);

    return res.collection(alerts);
  });
}

function deleteAlert(req, res) {
  var room_id = req.params.rid;
  var alert_id = req.params.id;

  Alert.delete(alert_id, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function bulkAlertShare(req, res) {
  var user_id = req.user.id;
  var alert = req.body.alert;
  var message = req.body.message;

  if(message) {
    message.message_type = 'SubLevel';
    message.author = user_id;
  }

  validator(bulk_alert_create, req.body, function(err) {
    if(err)
      return res.error(err);

    var override = {
      title: 'Alert: ' + Alert.getTitle(alert)
    };

    alert.created_by = req.user.id;

    async.auto({
      phones: cb => {
        return User.classifyPhoneNumbers(req.body.phone_numbers, cb);
      },
      sender: cb => {
        return User.get(user_id, cb);
      },
      count: cb => {
        return Alert.check(alert, (err, listings) => {
          if(err)
            return cb(err);

          var count = listings.length > 1 ? listings[0].total : 0;

          return cb(null, count);
        });
      },
      non_existing: [
        'phones',
        'sender',
        'count',
        (cb, results) => {
          async.map(results.phones.non_existing, (r, cb) => {
            var data = {
              user: {
                phone_number: r
              },
              alert: alert,
              room: {

              },
              sender: results.sender.id,
              count: results.count
            };

            return Alert.sendAsSMSToNonUser(user_id, data, r, cb);
          }, (err, results) => {
            if(err)
              return cb(err);

            return cb(null, results);
          });
        }
      ],
      shadows: cb => {
        return User.getOrCreateByEmailBulk(req.body.emails, cb);
      },
      user_rooms: [
        'shadows',
        'phones',
        (cb, results) => {
          var users = User.combineCurrentShadowAndPhone(user_id, req.body.users, results);
          Room.bulkCreateWithUsers(user_id, users, override, cb);
        }
      ],
      all: [
        'user_rooms',
        'shadows',
        'non_existing',
        (cb, results) => {
          var r = req.body.rooms || [];
          var u = results.user_rooms || [];
          var n = results.non_existing || [];

          var rooms = r.concat(u).concat(n).filter(Boolean);
          rooms = _u.unique(rooms);

          return cb(null, rooms);
        }
      ],
      share: [
        'all',
        (cb, results) => {
          async.map(results.all, (r, cb) => {
            Alert.create(r, alert, cb);
          }, cb);
        }
      ],
      comment: [
        'all',
        'share',
        (cb, results) => {
          if(!message)
            return cb();

          return Room.bulkSendMessage(user_id, results.all, message, cb);
        }
      ]
    }, (err, results) => {
      if(err)
        return res.error(err);

      return res.collection(results.share);
    });
  });
}

function stringSearch(req, res) {
  var user_id = req.user.id;
  var strings = ObjectUtil.queryStringArray(req.query.q);

  Alert.stringSearch(user_id, strings, function (err, alerts) {
    if (err)
      return res.error(err);

    return res.collection(alerts);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/alerts', b(bulkAlertShare));
  app.post('/valerts', app.auth.optionalBearer(checkAlert));
  app.post('/rooms/:id/alerts', b(createAlert));
  app.put('/rooms/:rid/alerts/:id', b(patchAlert));
  app.get('/rooms/:id/alerts', b(getAlertsForRoom));
  app.get('/alerts', b(getAlertsForUser));
  app.delete('/rooms/:rid/alerts/:id', b(deleteAlert));
  app.get('/alerts/search', b(stringSearch));
  app.get('/alerts/:id', b(get));
};

module.exports = router;
