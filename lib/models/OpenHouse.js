var db            = require('../utils/db.js');
var validator     = require('../utils/validator.js');
var async         = require('async');
var sql_insert    = require('../sql/open_house/insert.sql');

OpenHouse = {};

var schema = {
  type:'object',
  properties: {
    listing_mui: {
      required:true,
      type:'number',
    },

    description: {
      required:false,
      type:'string',
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
      type: 'string',
    },

    type: {
      type: 'string',
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

OpenHouse.create = function(openhouse, cb) {
  validate(openhouse, function(err) {
    if(err)
      return cb(err);


    if(openhouse.start_time > (new Date))
      issueNotification(openhouse);

    db.query(sql_insert, [
      openhouse.start_time,
      openhouse.end_time,
      openhouse.description,
      openhouse.listing_mui,
      openhouse.refreshments,
      openhouse.type,
      openhouse.matrix_unique_id
    ], cb);
  });
}



function issueNotification(openhouse, cb) {
  if(!cb) cb = () => {} //cb is optional

  Listing.getByMUI(openhouse.listing_mui, (err, listing) => {
    if(err)
      return cb(err);

    var issue = (room, cb) => {
      var notification = {};
      notification.action = 'Available';
      notification.subject = listing.id;
      notification.subject_class = 'Listing';
      notification.object = openhouse.id;
      notification.object_class = 'OpenHouse';
      notification.message = '# Open House available for '+Address.getLocalized(listing.property.address);
      notification.room = room.id;

      Metric.increment('openhouse_notification');

      Notification.issueForRoom(notification, cb);
    }

    Listing.getInterestedRooms(listing.id, (err, rooms) => {
      if(err)
        return cb(err);

      async.each(rooms, issue);
    });
  });
}

module.exports = function(){};