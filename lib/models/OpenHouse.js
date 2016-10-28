var moment        = require('moment');
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
  Listing.getByMUI(openhouse.listing_mui, (err, listing) => {
    if(err) {
      if (err.http === 404) {
        // We cannot find the listing associated for this OH.
        // This would prevent the OS script from moving on and it will be stuck.
        // However, if we cant find the listing, that means we really dont have anyone using it
        // Which means no notification is needed
        // So, pass silently.
        console.log('Cannot find listing for OpenHouse', openhouse)
        return cb();
      }
      return cb(err);
    }

    var address = Address.getLocalized(listing.property.address);
    var time = moment(openhouse.start_time).format('MMM Do LT');

    var issue = (interested, cb) => {
      var notification = {};
      notification.action = 'Available';
      notification.object = listing.id;
      notification.object_class = 'Listing';
      notification.subject = openhouse.id;
      notification.subject_class = 'OpenHouse';
      notification.message = '# Open House available for ' + address + ' on ' + time;
      notification.room = interested.room;
      notification.recommendation = interested.recommendation;

      Metric.increment('openhouse_notification');

      Notification.issueForRoom(notification, cb);
    };

    Listing.getInterestedRooms(listing.id, (err, interested) => {
      if(err)
        return cb(err);

      async.each(interested, issue, cb);
    });
  });
};

module.exports = function(){};
