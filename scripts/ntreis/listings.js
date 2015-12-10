#!/usr/bin/env node

var Client = require('./rets_client.js');
var colors = require('colors');
var exit   = require('./exit.js');
var async  = require('async');
var util   = require('util');

var program = require('./program.js')
  .option('-e, --enable-recs', 'Enable recommending listings to matching alerts')
  .option('-r, --enable-cf-links', 'Disable displaying of CloudFront links')
  .option('-np, --no-process', 'Prevent processing')
  .option('-ng, --no-geocode', 'Prevent geocoding')
  .option('-n, --enable-notifications', 'Enable Listing change notifications')
  .option('-a, --all', 'By default, script fetches only active listings. This options makes it fetch All listings');

var options = program.parse(process.argv);

(function notice() {
  console.log('--------- Listing options ---------'.yellow);
  console.log('Instant Recommendation:'.yellow, (options.enableRecs) ? 'yes'.green : 'no'.red);
  console.log('Show CloudFront Links:'.yellow, (options.enableCfLinks) ? 'yes'.green : 'no'.red);
  console.log('Listing Change Notifications:'.yellow, (options.enableNotifications) ? 'yes'.green : 'no'.red);
  console.log('Geocode:'.yellow, options.geocode);
  console.log('Process listings:'.yellow, options.process);
  console.log('Fetching all listings:'.yellow, options.all);
})();

if(options.process)
  options.processor = processData;

if(!options.all)
  options.query = '(STATUS=A,AC,AOC,AKO)';

options.resource = 'Property';
options.class = 'Listing';

Client.work(options, report);

function upsertAddress(address, cb) {
  Address.getByMUI(address.matrix_unique_id, function(err, current) {
    if (err) {
      if (err.code == 'ResourceNotFound') {
        Client.increment('new_address');
        Address.create(address, function(err, address_id) {
          if(err)
            return cb(err);

          if(!options.geocode)
            return cb(null, address_id);

          Address.updateGeo(address_id, function(err, result) {
            if(err)
              return cb(err);

            if (result) {
              Client.increment('geocoded_address');
            }

            return cb(null, address_id);
          });
        });
        return ;
      }

      return cb(err);
    } else {
      Client.increment('updated_address');
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
        Client.increment('new_property');
        return Property.create(property, cb);
      }

      return cb(err);
    }

    Client.increment('updated_property');
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
      Client.increment('new_listing');
      Listing.create(listing, cb);

      return ;
    }

    Client.increment('updated_listing');
    async.auto({
      issue_change_notifications: function(cb) {
        if(!options.enableNotifications)
          return cb();

        Listing.issueChangeNotifications(current.id, current, listing, cb);
      },
      update: function(cb, results) {
        Listing.update(current.id, listing, cb);
      }
    }, function(err, results) {
      if(err)
        return cb(err);

      return cb(null, results.update.id);
    });
  });
}

function processData(cb, results) {
  async.mapLimit(results.mls, 100, createObjects, cb);
}

var populate = require('./populate.js');
function createObjects(data, cb) {
  var populated = populate(data);
  var address = populated.address;
  var property = populated.property;
  var listing = populated.listing;

  Client.increment('processed_listing');

  async.waterfall([
    upsertAddress.bind(null, address),
    upsertProperty.bind(null, property),
    upsertListing.bind(null, listing),
    Recommendation.generateForListing
  ], cb);
}


var firstId, lastId = null;

Client.on('data fetched', (data) => {
    Client.rets.logout(); // We're done for the moment. Release the connection.

  firstId = data[0].Matrix_Unique_ID;
  lastId =  data[data.length - 1].Matrix_Unique_ID;
});

function report() {
  var text = [
    'Execution time: %d seconds',
    'Total items: %d',
    'First item: %s',
    'Last item: %s',
    'Listings: %s new, %s updated',
    'Properties: %s new, %s updated',
    'Addresses: %s new, %s updated',
    'Geocoded: %s',
    'Miss rate: %s%',
    '----------------------------------'
  ].join('\n');

  var miss_rate = Math.round(
    (
      (Client.getMetric('new_address') - Client.getMetric('geocoded_address')) / Client.getMetric('new_address')
    ) * 100
  );

  text = util.format(text,
    exit.elapsed()/1000,
    Client.getMetric('processed_listing'),
    firstId,
    lastId,
    Client.getMetric('new_listing'), Client.getMetric('updated_listing'),
    Client.getMetric('new_property'), Client.getMetric('updated_property'),
    Client.getMetric('new_address'), Client.getMetric('updated_address'),
    Client.getMetric('geocoded_address'),
    miss_rate
  );
  console.log(text);

  exit.slack(text, exit.exit);
}