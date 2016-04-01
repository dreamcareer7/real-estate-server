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
      phones: cb => {
        return User.classifyPhoneNumbers(req.body.phone_numbers, cb);
      },
      non_existing: [
        'phones',
        (cb, results) => {
          return Invitation.invitePhoneNumbersToNewRoom(user_id, results.phones.non_existing, cb);
        }
      ],
      shadows: cb => {
        return User.getOrCreateByEmailBulk(req.body.emails, cb);
      },
      user_rooms: [
        'shadows',
        'phones',
        (cb, results) => {
          var e = req.body.users || [];
          var s = results.shadows || [];
          var p = results.phones.existing || [];

          var users = e.concat(s).concat(p).filter(Boolean);
          users = _u.unique(users);
          users = _u.without(users, user_id);

          Room.bulkCreateWithUsers(user_id, users, override, cb);
        }
      ],
      share: [
        'user_rooms',
        'shadows',
        'non_existing',
        (cb, results) => {
          var r = req.body.rooms || [];
          var u = results.user_rooms || [];
          var n = results.non_existing || [];

          var rooms = r.concat(u).concat(n).filter(Boolean);
          rooms = _u.unique(rooms);

          async.map(rooms, function(r, cb) {
            var c = _u.clone(cma);
            c.room = r;
            c.user = req.user.id;

            CMA.create(c, cb);
          }, cb);
        }
      ],
      comment: [
        'user_rooms',
        'shadows',
        'non_existing',
        'share',
        (cb, results) => {
          if(!message)
            return cb();

          var r = req.body.rooms || [];
          var u = results.user_rooms || [];
          var n = results.non_existing || [];

          var rooms = r.concat(u).concat(n).filter(Boolean);
          rooms = _u.unique(rooms);

          Room.bulkSendMessage(user_id, rooms, message, cb);
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
