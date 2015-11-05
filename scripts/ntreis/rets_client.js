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
var timing = JSON.parse(fs.readFileSync(__dirname+'/timing.config.js', 'utf8'));

Date.prototype.toNTREISString = function() {
  return this.toISOString().replace('Z', '+');
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


          Address.updateGeo(address_id, function(err, result) {
            if(err)
              return cb(err);

            Client.emit('address geocoded', address);
            if (result)
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
  if (Client.options.initial) {
    if (timing.last_id)
      return timing.last_id;

    return '0';
  } else {
    if (timing.last_run)
      return timing.last_run;

    var initial = new Date(Date.now() - timing.initial * 24 * 3600 * 1000);
    return initial.toNTREISString();
  }
}

function applyTimeDelta(dt) {
  var dt_ = new Date(dt);
  var lapsed = new Date(dt_.getTime() + 100);

  return lapsed.toNTREISString();
}

function saveLastRun(last_item) {
  if (Client.options.initial) {
    var last_run = last_item.Matrix_Unique_ID;
    timing.last_id = last_run;
  } else {
    var last_run = applyTimeDelta(last_item.MatrixModifiedDT + 'Z');
    timing.last_run = last_run;
  }

  fs.writeFileSync("timing.config.js", JSON.stringify(timing, null, 2));
}

function fetch(cb, results) {
  var last_run = getLastRun();
  console.log('Fetching listings with', ((Client.options.initial) ? 'Matrix_Unique_ID greater than' : 'modification time after'), last_run.cyan);

  var timeoutReached = false;
  var timeout = setTimeout(function() {
    timeoutReached = true;
    cb('Timeout on RETS client reached');
  }, config.ntreis.timeout);

  client.once('connection.success', function() {
    if(timeoutReached)
      return console.log('We got a response, but it was way too late. We already consider it a timeout.');

    client.getTable("Property", "Listing");
    var fields;
    var query = (Client.options.initial) ? ('(MATRIX_UNIQUE_ID=' + last_run + '+),(STATUS=A,AC,AOC,AKO)')
              : ('(MatrixModifiedDT=' + last_run + ')')

    Client.emit('starting query', query);
    client.once('metadata.table.success', function(table) {
      if(timeoutReached)
        return console.log('We got a response, but it was way too late. We already consider it a timeout.');

      fields = table.Fields;

      client.query("Property",
                    "Listing",
                    query,
                    function(err, data) {
                      if(timeoutReached)
                        return console.log('We got a response, but it was way too late. We already consider it a timeout.');

                      clearTimeout(timeout);

                      if (err)
                        return cb(err);

                      data.sort((Client.options.initial) ? byMatrix_Unique_ID : byMatrixModifiedDT);

                      var limited_data = data.slice(0, Client.options.limit);
                      Client.emit('data fetched', limited_data)
                      return cb(null, limited_data);
                    });
    });
  });
}

Client.work = function(options, cb) {
  Client.options = options;

  async.auto({
    mls: [fetch],
    objects: ['mls',
              (cb, results) =>
                async.mapLimit(results.mls, config.ntreis.parallel, createObjects, cb)
             ],
    recs: ['objects',
           (cb, results) => {
             if(!Client.options.enableRecs)
               return cb(null, false);

             var listing_ids = results.objects.map( (r) => r.listing_id )

             async.map(listing_ids, Recommendation.generateForListing, cb);
           }],
    update_last_run: ['mls', 'objects',
                      (cb, results) => {
                        saveLastRun(results.mls[results.mls.length - 1]);
                        cb();
                      }
                     ]
  }, cb);
}

module.exports = Client;