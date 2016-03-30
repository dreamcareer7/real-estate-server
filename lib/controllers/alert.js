var async     = require('async');
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
  alert.created_by = req.user.id;

  Alert.check(alert, function(err, compact_listings) {
    if(err)
      return res.error(err);

    res.collection(compact_listings);
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

  Alert.getForRoom(room_id, function(err, alerts) {
    if(err)
      return res.error(err);

    return res.collection(alerts);
  });
}

function getAlertsForUser(req, res) {
  var user_id = req.user.id;

  Alert.getForUser(user_id, function(err, alerts) {
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

  var override = {
    title: 'Alert: ' + alert.title
  };

  alert.created_by = req.user.id;

  validator(bulk_alert_create, req.body, function(err) {
    if(err)
      return res.error(err);

    async.auto({
      shadows: cb => {
        async.map(req.body.emails, (r, cb) => {
          User.getOrCreateByEmail(r, (err, user) => {
            if(err)
              return cb(err);

            return cb(null, user.id);
          });
        }, cb);
      },
      user_rooms: (cb, results) => {
        var e = req.body.users || [];
        var s = results.shadows || [];

        var users = e.concat(s).filter(Boolean);
        console.log(users);
        Room.bulkCreateWithUsers(user_id, users, override, cb);
      },
      share: [
        'user_rooms',
        (cb, results) => {
          var rooms = results.user_rooms.concat(req.body.rooms).filter(Boolean);
          async.map(rooms, function(r, cb) {
            Alert.create(r, alert, cb);
          }, cb);
        }
      ],
      comment: [
        'user_rooms',
        'share',
        (cb, results) => {
          if(!message)
            return cb();

          var rooms = results.user_rooms.concat(req.body.rooms).filter(Boolean);
          Room.bulkSendMessage(user_id, rooms, message, cb);
        }
      ]
    }, function(err, results) {
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
  app.post('/valerts', b(checkAlert));
  app.post('/rooms/:id/alerts', b(createAlert));
  app.put('/rooms/:rid/alerts/:id', b(patchAlert));
  app.get('/rooms/:id/alerts', b(getAlertsForRoom));
  app.get('/alerts', b(getAlertsForUser));
  app.delete('/rooms/:rid/alerts/:id', b(deleteAlert));
  app.get('/alerts/search', b(stringSearch));
};

module.exports = router;
