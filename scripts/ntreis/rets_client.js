require('../connection.js');

var async = require('async');
var db = require('../../lib/utils/db.js');
var error = require('../../lib/models/Error.js');
var config = require('../../lib/config.js');
var fs = require('fs');
var _u = require('underscore');
var colors = require('colors');
var EventEmitter = require('events');

[
  'Address',
  'Property',
  'Listing',
  'Room',
  'User',
  'Message',
  'Recommendation',
  'S3',
  'Notification',
  'SES',
  'Crypto',
  'Invitation',
  'ObjectUtil'
].map( (model) => require('../../lib/models/'+model+'.js') );

Error.autoReport = false;

var Client = new EventEmitter;
Client.options = {};

var retsLoginUrl = config.ntreis.login_url;
var retsUser = config.ntreis.user;
var retsPassword = config.ntreis.password;

var client = require('rets-client').getClient(retsLoginUrl, retsUser, retsPassword);

Date.prototype.toNTREISString = function() {
  var pad = function(number) {
    if (number < 10) {
      return '0' + number;
    }
    return number;
  }

  return this.getUTCFullYear() +
    '-' + pad(this.getMonth() + 1) +
    '-' + pad(this.getDate()) +
    'T' + pad(this.getHours()) +
    ':' + pad(this.getMinutes()) +
    ':' + pad(this.getSeconds()) +
    '.' + (this.getMilliseconds() / 1000).toFixed(3).slice(2, 5) +
    '+';
}

function byMatrixModifiedDT(a, b) {
  var a_ = new Date(a.MatrixModifiedDT);
  var b_ = new Date(b.MatrixModifiedDT);

  if(a_ > b_)
    return 1;
  else if(b_ > a_)
    return -1;
  else
    return 0;
}

function byMatrix_Unique_ID(a, b) {
  var a_ = a.Matrix_Unique_ID;
  var b_ = b.Matrix_Unique_ID;

  if(a_ > b_)
    return 1;
  else if(b_ > a_)
    return -1;
  else
    return 0;
}

function upsertAddress(address, cb) {
  Address.getByMUI(address.matrix_unique_id, function(err, current) {
    if (err) {
      if (err.code == 'ResourceNotFound') {
        Client.emit('new address', address);
        Address.create(address, function(err, address_id) {
          if(err)
            return cb(err);

          if(!Client.options.geocode)
            return cb(null, address_id);

          Address.updateGeo(address_id, function(err, result) {
            if(err)
              return cb(err);

            if (result) {
              Client.emit('address geocoded', address);
            }

            return cb(null, address_id);
          });
        });
        return ;
      }

      return cb(err);
    } else {
      Client.emit('updated address', address);
      Address.update(current.id, address, function(err, next) {
        if(err)
          return cb(err);

        return cb(null, next.id);
      });
    }
  });
}

function upsertProperty(property, address_id, cb) {
  property.address_id = address_id;

  Property.getByMUI(property.matrix_unique_id, function(err, current) {
    if(err) {
      if(err.code == 'ResourceNotFound') {
        Client.emit('new property', property);
        return Property.create(property, cb);
      }

      return cb(err);
    }

    Client.emit('updated property', property);
    Property.update(current.id, property, function(err, next) {
      if(err)
        return cb(err);

      return cb(null, next.id);
    });
  });
}

function upsertListing(listing, property_id, cb) {
  listing.property_id = property_id;

  Listing.getByMUI(listing.matrix_unique_id, function(err, current) {
    if (err && err.code !== 'ResourceNotFound')
      return cb(err);

    if (err && err.code === 'ResourceNotFound') {
      Client.emit('new listing', listing);

      async.waterfall([
        function(cb) {
          if (!Client.options.enablePhotoFetch)
            return cb(null, []);

          Listing.fetchPhotos(listing.matrix_unique_id, client, config, cb);
        },
        function(links, cb) {
          listing.cover = links[0] || '';

          // If array length is greater than 2, we shuffle everything except the first element which is always our cover
          // This fixes issue #17 and is caused by duplicate photos being returned by the NTREIS
          // We shuffle them to make duplicate images less annoying.
          // I hate this hack.
          // links = (links.length > 2) ? Array.prototype.concat(links.slice(0, 1), _u.shuffle(links.slice(1))) : links;
          // listing.gallery_images = '{' + links.join(',') + '}';
          links = links.splice(1);
          listing.gallery_images = '{' + links.join(',') + '}';

          Client.emit('photo added', listing, links);

          Listing.create(listing, cb);
        }
      ], cb);
      return ;
    }

    Client.emit('updated listing', listing);
    async.auto({
      issue_change_notifications: function(cb) {
        if(Client.options.enableNotifications) {
          return Listing.issueChangeNotifications(current.id, current, listing, cb);
        } else {
          return cb();
        }
      },
      listing_photos: function(cb) {
        if((Client.options.enablePhotoFetch) && (listing.photo_count > 0) && (current.photo_count != listing.photo_count)) {
          Listing.fetchPhotos(listing.matrix_unique_id, client, config, function(err, links) {
            if(err)
              return cb(err);

            Client.emit('photo added', listing, links);
            listing.cover = links[0] || '';
            var tmp = links.splice(1);
            listing.gallery_images = '{' + tmp.join(',') + '}';
            return cb(null, null);
          });
        } else {
          return cb(null, null);
        }
      },
      update: ['listing_photos',
        function(cb, results) {
          Listing.update(current.id, listing, cb);
        }]
    }, function(err, results) {
      if(err)
        return cb(err);

      return cb(null, results.update.id);
    });
  });
}

var populate = require('./populate.js');
function createObjects(data, cb) {
  var populated = populate(data);
  var address = populated.address;
  var property = populated.property;
  var listing = populated.listing;

  async.waterfall([
    upsertAddress.bind(null, address),
    upsertProperty.bind(null, property),
    upsertListing.bind(null, listing)
  ], function(err, result) {
    if(err)
      return cb(err);

    return cb(null, {address: address, listing: listing, property: property, listing_id: result});
  });
}

function getLastRun(cb) {
  if(Client.options.startFrom) {
    var t = new Date((new Date()).getTime() - (Client.options.startFrom * 3600000));

    Client.last_run = {
      last_modified_date:t,
      is_initial_completed:true
    };

    return cb();
  }

  db.query('SELECT * FROM ntreis_jobs ORDER BY created_at DESC LIMIT 1', [], (err, res) => {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      Client.last_run = {};
    else {
      Client.last_run = res.rows[0];
      Client.last_run.last_modified_date.setTime
    }

    cb();
  });
}

function saveLastRun(data, cb) {
  var last_date = null;
  var last_mui  = null;

  if(data.length > 0) {
    data.sort(byMatrixModifiedDT);
    var last_date = data[data.length -1].MatrixModifiedDT;

    data.sort(byMatrix_Unique_ID);
    var last_mui =  data[data.length -1].Matrix_Unique_ID;
  }

  db.query('INSERT INTO ntreis_jobs (last_modified_date, last_id, results, query, is_initial_completed) VALUES ($1, $2, $3, $4, $5)', [
    last_date,
    last_mui,
    data.length,
    Client.query,
    Client.last_run.is_initial_completed,
  ], cb);
}

Client.on('initial completed', () => Client.last_run.is_initial_completed = true );

var connected = false;
function connect(cb) {
  if(connected)
    return cb();

  var timeoutReached = false;
  var timeout = setTimeout(function() {
    timeoutReached = true;
    cb('Timeout while connecting to RETS server');
  }, config.ntreis.timeout);

  var timeoutMessage = console.log.bind(console.log,
    'We got a response, but it was way too late. We already consider it a timeout.');

  client.once('connection.success', function() {
    if(timeoutReached)
      return timeoutMessage();

    clearTimeout(timeout);

    connected = true;
    cb();
  });
}

function fetch(cb) {
  var by_id    = !(Client.last_run.is_initial_completed);
  var last_id  = Client.last_run.last_id ? Client.last_run.last_id : 0;
  var last_run = Client.last_run.last_modified_date;

  var timeoutReached = false;
  var timeout = setTimeout(function() {
    timeoutReached = true;
    cb('Timeout while querying RETS server');
  }, config.ntreis.timeout);

  var timeoutMessage = console.log.bind(console.log,
    'We got a response, but it was way too late. We already consider it a timeout.');



  var query = (by_id) ? ('(MATRIX_UNIQUE_ID='+last_id +'+)') :
            ('(MatrixModifiedDT=' + last_run.toNTREISString() + ')');

  if(by_id && !Client.options.all)
    query += ',(STATUS=A,AC,AOC,AKO)';

  Client.query = query;
  console.log('Query'.yellow, query.cyan);

  var processResponse = function(err, data) {
    if(!Client.options.enablePhotoFetch)
      client.logout(); // We're done for the moment. Release the connection.

    if(timeoutReached)
      return timeoutMessage();

    clearTimeout(timeout);

    if(by_id) {
      if(err && err.replyCode == '20201') {
        Client.emit('initial completed');
        return cb(null, []);
      }
    }

    if (err)
      return cb(err);

    Client.emit('data fetched', data);

    if(by_id && (data.length < Client.options.limit)) {
      Client.emit('initial completed');
    }

    return cb(null, data);
  }

  Client.emit('starting query', query);
  client.query('Property', 'Listing', query, processResponse, Client.options.limit);
}

var raw_insert = 'INSERT INTO raw_listings (listing) VALUES ';

var raw = (cb, results) => {
  var data = _u.clone(results.mls);

  var parts = []
  for(var i=1; i<=data.length; i++) {
    parts.push('($'+i+')');
  }

  raw_insert += parts.join(',');

  db.query(raw_insert, data, cb);
}

Client.work = function(options, cb) {
  Client.options = options;

  var objects = (cb, results) => async.mapLimit(results.mls, config.ntreis.parallel, createObjects, cb);

  var recs = (cb, results) => {
    var listing_ids = results.objects.map( (r) => r.listing_id )

    async.map(listing_ids, Recommendation.generateForListing, cb);
  }

  var save = (cb, results) => saveLastRun(results.mls, cb)

  var steps = {
    connect:connect,
    last_run:getLastRun,
    mls: ['connect', 'last_run', fetch],
    raw: ['mls', raw]
  };

  if(Client.options.process)
    steps.objects = ['mls', objects];

  if(Client.options.process && Client.options.enableRecs)
    steps.recs = ['objects', recs];

  async.auto(steps, (err, results) => save(cb, results))
}

module.exports = Client;
