require('../lib/models/index.js')();
var db = require('../lib/utils/db.js');
var config = require('../lib/config.js');
var sql = require('../lib/utils/require_sql.js');
var geo = require('../lib/utils/geo.js');
require('./connection.js')
var _ = require('underscore');
var client = require('./ntreis/rets_client.js')

var randomLocation = {
  longitude: -96.7981853613128,
  latitude: 32.84284394397976
}

var randomGeoPoints = geo.generateRandomPoints({
  'lat': randomLocation.latitude,
  'lng': randomLocation.longitude
}, 5000);

var criteria = {
  from: '2015-11-05T00:00:00.000',
  maximum_price: 9223372036854776000,
  limit: '1000',
  maximum_lot_square_meters: 856872169904754400,
  minimum_bathrooms: 1,
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
    {longitude: randomGeoPoints[0].longitude, latitude: randomGeoPoints[0].latitude},
    {longitude: randomGeoPoints[1].longitude, latitude: randomGeoPoints[1].latitude},
    {longitude: randomGeoPoints[2].longitude, latitude: randomGeoPoints[2].latitude},
    {longitude: randomGeoPoints[3].longitude, latitude: randomGeoPoints[3].latitude},
    {longitude: randomGeoPoints[0].longitude, latitude: randomGeoPoints[0].latitude}
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
  created_by: '66f30c4e-6d33-11e5-8206-230211c15dec'
};


function compare(rechat, mls) {
  var same = "";
  var diff = "";
  for (var i = 0; i < rechat.length; i++) {
    //check if exist in mls
    var mls_index = mls.indexOf(rechat[i]);
    if (mls_index > 0) {
      same += rechat[i] + ', ';
      mls.splice(mls_index, 1);
    }
    else {
      diff += rechat[i] + ', ';
    }
  }
  //check if there is remaining item in mls
  if (mls.length > 0)
    for (var i = 0; i < mls.length; i++) {
      diff += mls[i] + ', ';
    }

  console.log('same result count: ', same.split(',').length - 1);
  console.log('different result count: ', diff.split(',').length - 1);
  console.log(same.green);
  console.log(diff.red);
};

Alert.check(criteria, function (err, rechat_listings) {
  if (err)
    console.log(err);
  client.searchByLocation(criteria, function (err, mls_listings) {
    if (err)
      if (err.replyCode == '20201')
        console.log('No MLS Records Found.');
      else
        console.log(err);
    else {
      var rechat_array = []
      for (var i = 0; i < rechat_listings.length; i++) {
        rechat_array.push(rechat_listings[i].mls_number)
      }

      var mls_array = []
      for (var i = 0; i < mls_listings.length; i++) {
        mls_array.push(mls_listings[i].MLSNumber)
      }

      console.log('Found ' + rechat_array.length + ' listings in rechat database and ' + mls_listings.length + ' in MLS database');
      compare(rechat_array, mls_array);
    }
    process.exit();

  });
})
;
