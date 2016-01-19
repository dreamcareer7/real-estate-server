require('../lib/models/index.js')();
require('./connection.js');

var db     = require('../lib/utils/db.js');
var config = require('../lib/config.js');
var sql    = require('../lib/utils/require_sql.js');
var geo    = require('../lib/utils/geo.js');
var _      = require('underscore');
var Client = require('./mls/rets_client.js');
var async  = require('async');

var search = function (criteria, cb) {
  var options = {};
  options.resource = 'Property';
  options.class = 'Listing';
  options.dontSave = true;
  options.query = ('( Longitude=' + criteria.points[0].longitude + '+),(Latitude=' + criteria.points[0].latitude + '-),' +
                   '( Longitude=' + criteria.points[1].longitude + '-),(Latitude=' + criteria.points[2].latitude + '+),' +
                   '(STATUS=A), (ListPrice=' + criteria.maximum_price + '-), (ListPrice=' + criteria.minimum_price + '+),' +
                   '(SqFtTotal=' + criteria.maximum_square_meters + '-), (SqFtTotal=' + criteria.minimum_square_meters + '+),' +
                   '(BedsTotal=' + criteria.minimum_bedrooms + '+),' +
                   '(PropertyType=RES), (PropertySubType=RESFAM,RESDUP,RESRAN,RESCON,RESTOW),' +
                   '(YearBuilt=' + criteria.minimum_year_built + '+), (YearBuilt=' + criteria.maximum_year_built + '-),' +
                   '(LotSizeAreaSQFT=' + criteria.maximum_lot_square_meters + '-), (LotSizeAreaSQFT=' + criteria.minimum_lot_square_meters + '+)'
                  );
  //options.query = ('( MLSNumber=13227035)');

  options.processor = (done, results) => {
    done();
    cb(null, results.mls);
  };

  Client.work(options, (err)=> {
    if (err)
      console.log(err);
  });
};

var searchMlsByNumbers = function (criteria, cb) {
  var options = {};
  options.resource = 'Property';
  options.class = 'Listing';
  options.dontSave = true;
  options.query = (criteria);

  options.processor = (done, results) => {
    done();
    cb(null, results.mls);
  };

  Client.work(options, (err)=> {
    if (err)
      console.log(err);
  });
};

var randomLocation = {
  longitude: -96.7981853613128,
  latitude: 32.84284394397976
};

var randomGeoPoints = geo.generateRandomPoints({
  'lat': randomLocation.latitude,
  'lng': randomLocation.longitude
}, 5000);

var criteria = {
  from: '2015-11-05T00:00:00.000',
  maximum_price: 9223372036854776000,
  limit: '1000',
  limit: '10000',
  maximum_lot_square_meters: 856872169904754400,
  minimum_lot_square_meters: 0,
  minimum_bathrooms: 0,
  maximum_square_meters: 856872169904754400,
  location: {
    longitude: randomLocation.longitude,
    latitude: randomLocation.latitude
  },
  horizontal_distance: 1200,
  property_type: 'Residential',
  vertical_distance: 1200,
  minimum_square_meters: 0,
  minimum_lot_square_meters: 0,
  currency: 'USD',
  maximum_year_built: 2015,
  minimum_year_built: 0,
  points: [
    {longitude: randomGeoPoints[0][0].longitude, latitude: randomGeoPoints[0][0].latitude},
    {longitude: randomGeoPoints[0][1].longitude, latitude: randomGeoPoints[0][1].latitude},
    {longitude: randomGeoPoints[0][2].longitude, latitude: randomGeoPoints[0][2].latitude},
    {longitude: randomGeoPoints[0][3].longitude, latitude: randomGeoPoints[0][3].latitude},
    {longitude: randomGeoPoints[0][0].longitude, latitude: randomGeoPoints[0][0].latitude}
  ],
  mpoints: [
    {longitude: randomGeoPoints[1][0].longitude, latitude: randomGeoPoints[1][0].latitude},
    {longitude: randomGeoPoints[1][1].longitude, latitude: randomGeoPoints[1][1].latitude},
    {longitude: randomGeoPoints[1][2].longitude, latitude: randomGeoPoints[1][2].latitude},
    {longitude: randomGeoPoints[1][3].longitude, latitude: randomGeoPoints[1][3].latitude},
    {longitude: randomGeoPoints[1][0].longitude, latitude: randomGeoPoints[1][0].latitude}
  ],
  minimum_bedrooms: 0,
  minimum_price: 100000,
  property_subtypes: [
    'RES-Single Family',
    'RES-Half Duplex',
    'RES-Farm/Ranch',
    'RES-Condo',
    'RES-Townhouse'
  ],
  listing_statuses: [
    'Active'
  ],
  open_house: true,
  created_by: '66f30c4e-6d33-11e5-8206-230211c15dec'
};

function logDiff(rechat, mls) {
  if (rechat.status != mls.Status) {
    console.log((rechat.mls_number + ' => status is different: RECHAT: ' + rechat.status + ' MLS: ' + mls.Status).red);
  }
  else if (Math.round(rechat.square_meters * 10.764) != mls.SqFtTotal)
    console.log((rechat.mls_number + ' => square_meters is different: RECHAT: ' + (Math.round(rechat.square_meters * 10.764)).toString() + ' MLS: ' + mls.SqFtTotal).red);
  else if ((rechat.lot_square_meters * 10.764).toFixed(2) != mls.LotSizeAreaSQFT)
    console.log((rechat.mls_number + ' => lot_square_meters is different: RECHAT: ' + (rechat.lot_square_meters * 10.764).toFixed(2) + ' MLS: ' + mls.LotSizeAreaSQFT).red);
  else if (rechat.bedroom_count != mls.BedsTotal)
    console.log((rechat.mls_number + ' => bedroom_count is different: RECHAT: ' + rechat.bedroom_count + ' MLS: ' + mls.BedsTotal).red);
  else if (rechat.property_type != mls.PropertyType)
    console.log((rechat.mls_number + ' => property_type is different: RECHAT: ' + rechat.property_type + ' MLS: ' + mls.PropertyType).red);
  else if (rechat.property_subtype != mls.PropertySubType)
    console.log((rechat.mls_number + ' => property_subtype is different: RECHAT: ' + rechat.property_subtype + ' MLS: ' + mls.PropertySubType).red);
  else if (rechat.year_built != mls.YearBuilt)
    console.log((rechat.mls_number + ' => year_built is different: RECHAT: ' + rechat.year_built + ' MLS: ' + mls.YearBuilt).red);
  else if (rechat.pool_yn != mls.PoolYN)
    console.log((rechat.mls_number + ' => pool_yn is different: RECHAT: ' + rechat.pool_yn + ' MLS: ' + mls.PoolYN).red);
  else
    console.log('all attributes were the same, difference is probably because of location diff'.magenta);
}

function compare(rechat, mls) {
  var both = [];
  var rechat_only = [];
  var mls_only = [];

  for (var i in rechat) {
    //check if exist in mls
    if (mls[i]) {
      both.push(i);
      delete mls[i];
    }
    else {
      rechat_only.push(i);
    }
  }
  //check if there is remaining item in mls
  if (mls)
    mls_only = Object.keys(mls);

  //check detail for what we found only in rechat
  if (rechat_only.length > 0) {
    var search_criteria = '(MLSNumber=' + rechat_only.join() + ')';
    searchMlsByNumbers(search_criteria, (err, mls_listings) => {
      if (err)
        if (err.replyCode == '20201')
          console.log('No MLS Records Found.');
        else
          console.log('RETS error. please try again');

      mls_listings.forEach(function (listing) {
        Alert.getByMlsNumber(listing.MLSNumber, function (err, res) {
          if (res) {
            logDiff(res, listing);
          }
          else
            console.log((mls_number + ' => found in MLS bot not found in local DB').red);
        });
      });
    });
  }

  //check detail for what we found only in mls
  if (mls_only.length > 0) {
    mls_only.forEach(function (mls_number) {
      Alert.getByMlsNumber(mls_number, function (err, res) {
        if (res) {
          logDiff(res, mls[mls_number]);
        }
        else
          console.log((mls_number + ' => found in MLS bot not found in local DB').red);
      });
    });
  }

  console.log(('SAME RESULTS (' + both.length + ')').toString().green);
  console.log(('ONLY IN RECHAT (' + rechat_only.length + ')').toString().red);
  console.log(('ONLY IN MLS (' + mls_only.length + ')').toString().yellow);
};


Alert.check(criteria, function (err, rechat_listings) {
  if (err)
    console.log(err);

  search(criteria, (err, mls_listings) => {
    if (err)
      if (err.replyCode == '20201')
        console.log('No MLS Records Found.');
      else
        console.log('RETS error. please try again');

    var rechat = {};
    rechat_listings.map(function (r) {
      var key = r.mls_number;
      rechat[key] = r;
    });

    var mls = {};
    mls_listings.map(function (r) {
      var key = r.MLSNumber;
      mls[key] = r;
    });

    console.log('Found ' + Object.keys(rechat).length + ' listings in rechat database and ' + Object.keys(mls).length + ' in MLS database');
    compare(rechat, mls);
  });
});
