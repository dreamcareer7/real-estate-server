var async     = require('async');
var validator = require('../utils/validator.js');
var _u        = require('underscore');

var bulk_cma_create = {
  type: 'object',
  properties: {
    rooms: {
      type: 'array',
      required: false,
      minItems: 1,
      items: {
        type: 'string',
        uuid: true
      }
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
    cma: {
      type: 'object',
      required: true
    }
  }
};

function createCMA(req, res) {
  var room_id = req.params.id;
  var cma = req.body;

  cma.user = req.user.id;
  cma.room = room_id;

  CMA.create(cma, (err, cma) => {
    if(err)
      return res.error(err);

    return res.model(cma);
  });
}

function getCMAsForRoom(req, res) {
  var room_id = req.params.id;

  CMA.getForRoom(room_id, (err, cmas) => {
    if(err)
      return res.error(err);

    return res.collection(cmas);
  });
}

function deleteCMA(req, res) {
  var room_id = req.params.rid;
  var cma_id = req.params.id;

  CMA.delete(cma_id, (err) =>{
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function getListingsForCMA(req, res) {
  var cma_id = req.params.id;

  CMA.getListings(cma_id, function(err, listings) {
    if(err)
      return res.error(err);

    return res.collection(listings);
  });
}

function bulkCMAShare(req, res) {
  var user_id = req.user.id;
  var cma = req.body.cma;
  var message = req.body.message;

  validator(bulk_cma_create, req.body, err => {
    if(err)
      return res.error(err);

    var override = {
      title: 'New CMA'
    };

    async.auto({
      self: [
        'sender',
        'count',
        (cb, results) => {
          var opts = results;

          var ip = User.isPhoneInArray(results.sender.phone_number, req.body.phone_numbers);
          var ie = User.isEmailInArray(results.sender.email, req.body.emails);
          var ii = User.isIdInArray(results.sender.id, req.body.users);

          var should_send_self = ip || ie || ii;

          if (!should_send_self)
            return cb();

          var data = {
            user: results.sender,
            sender: user_id,
            cma: cma
          };

          async.auto({
            personal_room: cb => {
              return Room.get(opts.sender.personal_room, (err, results) => {
                if(err)
                  return cb(err);

                data.room = results;
                return cb();
              });
            },
            share: cb => {
              var c = _u.clone(cma);
              c.room = opts.sender.personal_room;
              c.user = user_id;

              return CMA.create(c, (err, cma) => {
                if(err)
                  return cb(err);

                data.cma = cma;
              });
            },
            send_email: [
              'share',
              'personal_room',
              (cb, results) => {
                if (!User.shouldTryEmail(opts.sender))
                  return cb();

                return CMA.sendAsEmail(data, cb);
              }
            ],
            send_sms: [
              'share',
              'personal_room',
              (cb, results) => {
                if (!User.shouldTrySMS(opts.sender))
                  return cb();

                return Alert.sendAsSMS(data, cb);
              }
            ]
          }, (err, results) => {
            if(err)
              return cb(err);

            return cb();
          });
        }
      ],
      cleanup_phones: cb => {
        var pa = req.body.phone_numbers.map(r => {
          var p = ObjectUtil.formatPhoneNumberForDialing(r);
          return p;
        });

        req.body.phone_numbers = pa;
        return cb(null, pa);
      },
      phone_shadows: [
        'cleanup_phones',
        (cb, results) => {
          return User.getOrCreateByPhoneNumberBulk(results.cleanup_phones, cb);
        }
      ],
      email_shadows: cb => {
        return User.getOrCreateByEmailBulk(req.body.emails, cb);
      },
      user_rooms: [
        'phone_shadows',
        'email_shadows',
        (cb, results) => {
          var users = User.combineAndUniqueUserReferences(user_id, req.body.users, results);

          Room.bulkSendPrivateToUsers(user_id, users, override, cb);
        }
      ],
      all: [
        'user_rooms',
        (cb, results) => {
          var r = req.body.rooms || [];
          var u = results.user_rooms || [];

          var rooms = r.concat(u).filter(Boolean);
          rooms = _u.unique(rooms);

          return cb(null, rooms);
        }
      ],
      share: [
        'all',
        (cb, results) => {
          async.map(results.all, (r, cb) => {
            var c = _u.clone(cma);
            c.room = r;
            c.user = req.user.id;

            CMA.create(c, cb);
          }, cb);
        }
      ],
      comment: [
        'all',
        'share',
        (cb, results) => {
          if(!message)
            return cb();

          Room.bulkSendMessage(user_id, results.all, message, cb);
        }
      ]
    }, (err, results) => {
      if(err)
        return res.error(err);

      return res.collection(results.share);
    });
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/rooms/:room/cmas/:id/listings', b(getListingsForCMA));
  app.post('/rooms/:id/cmas', b(createCMA));
  app.get('/rooms/:id/cmas', b(getCMAsForRoom));
  app.delete('/rooms/:rid/cmas/:id', b(deleteCMA));
  app.post('/cmas', b(bulkCMAShare));
};

module.exports = router;
