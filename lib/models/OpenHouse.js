var db            = require('../utils/db.js');
var validator     = require('../utils/validator.js');
var async         = require('async');
var sql_insert    = require('../sql/open_house/insert.sql');
var sql_get       = require('../sql/open_house/get.sql');

OpenHouse = {};

Orm.register('open_house', OpenHouse);

var schema = {
  type:'object',
  properties: {
    listing_mui: {
      required:true,
      type: 'number'
    },

    description: {
      required:false,
      type: 'string'
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    start_time: {
      type: 'string',
      required: true
    },

    end_time: {
      type: 'string',
      required: true
    },

    refreshments: {
      type: 'string'
    },

    type: {
      type: 'string',
      required: true
    }
  }
};

var validate = validator.bind(null, schema);

OpenHouse.get = function(id, cb) {
  db.query(sql_get, [id], (err, res) => {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('OpenHouse ' + id + ' not found'));

    cb(null, res.rows[0]);
  })
}

OpenHouse.create = function(openhouse, cb) {
  validate(openhouse, function(err) {
    if(err)
      return cb(err);

    var tasks = [];

    var insert = cb => {
      db.query(sql_insert, [
        openhouse.start_time,
        openhouse.end_time,
        openhouse.description,
        openhouse.listing_mui,
        openhouse.refreshments,
        openhouse.type,
        openhouse.matrix_unique_id
      ], (err, res) => {
        if(err)
          return cb(err);

        openhouse.id = res.rows[0].id;
        cb();
      });
    }

    var notification = cb => issueNotification(openhouse, cb);

    tasks.push(insert);

    if(new Date(openhouse.start_time) > (new Date))
      tasks.push( notification );

    async.series(tasks, cb);
  });
};



function issueNotification(openhouse, cb) {
  console.log('Issuing notification for OpenHouse', openhouse.listing_mui);

  Listing.getByMUI(openhouse.listing_mui, (err, listing) => {
    if(err)
      return cb(err);

    var issue = (room_id, cb) => {
      var notification = {};
      notification.action = 'Available';
      notification.object = listing.id;
      notification.object_class = 'Listing';
      notification.subject = openhouse.id;
      notification.subject_class = 'OpenHouse';
      notification.message = '# Open House available for '+ Address.getLocalized(listing.property.address);
      notification.room = room_id;

      Metric.increment('openhouse_notification');

      Notification.issueForRoom(notification, cb);
    };

    console.log('Getting OpenHouse rooms', openhouse.listing_mui);
    Listing.getInterestedRooms(listing.id, (err, rooms) => {
      console.log('Interested rooms for OpenHouse on listing', listing.id, err, rooms ? rooms.length : null);
      if(err)
        return cb(err);

      async.each(rooms, issue, cb);
    });
  });
};

module.exports = function(){};
