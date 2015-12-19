require('../lib/models/index.js')();
var db = require('../lib/utils/db.js');
var config = require('../lib/config.js');
var sql = require('../lib/utils/require_sql.js');
var geo = require('../lib/utils/geo.js');
require('./connection.js')
var _ = require('underscore');
var Client = require('./mls/rets_client.js')

var search = function (criteria, cb) {
  var options = {};
  options.resource = 'Property';
  options.class = 'Listing';
  options.dontSave = true;
  options.query = ('( Longitude=' + criteria.points[0].longitude + '+),(Latitude=' + criteria.points[0].latitude + '-),' +
    '( Longitude=' + criteria.points[1].longitude + '-),(Latitude=' + criteria.points[2].latitude + '+),' +
    '(STATUS=A,AC,AOC,AKO), (ListPrice=' + criteria.maximum_price + '-), (ListPrice=' + criteria.minimum_price + '+),' +
    '(SqFtTotal=' + criteria.maximum_square_meters + '-), (SqFtTotal=' + criteria.minimum_square_meters + '+),' +
    '(BedsTotal=' + criteria.minimum_bedrooms + '+),' +
    //'(PropertyType=' + criteria.property_type + '), (PropertySubType=' + criteria.property_subtypes.join() + '),' +
    '(YearBuilt=' + criteria.minimum_year_built + '+), (YearBuilt=' + criteria.maximum_year_built + '-),' +
    '(PoolYN=1), LotSizeAreaSQFT=' + criteria.maximum_lot_square_meters + '-), (LotSizeAreaSQFT=' + criteria.minimum_lot_square_meters + '+)'
  )

  options.processor = (done, results) => {
    done();
    cb(null, results.mls)
  }

  Client.work(options, (err)=> {
    if (err)
      console.log(err);
  });
}

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
  minimum_lot_square_meters: 0,
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
  var both = "";
  var rechat_only = "";
  var mls_only = "";
  for (var i = 0; i < rechat.length; i++) {
    //check if exist in mls
    var mls_index = mls.indexOf(rechat[i]);
    if (mls_index > 0) {
      both += rechat[i] + ', ';
      mls.splice(mls_index, 1);
    }
    else {
      rechat_only += rechat[i] + ', ';
    }
  }
  //check if there is remaining item in mls
  if (mls.length > 0)
    for (var i = 0; i < mls.length; i++) {
      mls_only += mls[i] + ', ';
    }

  var same_count = both.split(',').length - 1;
  var rechat_count = rechat_only.split(',').length - 1;
  var mls_count = mls_only.split(',').length - 1;

  console.log('SAME RESULTS (' + same_count + ')', both.green);
  console.log('ONLY IN RECHAT (' + rechat_count + ')', rechat_only.red);
  console.log('ONLY IN MLS (' + mls_count + ')', mls_only.yellow);
};

Alert.check(criteria, function (err, rechat_listings) {
  if (err)
    console.log(err);

  search(criteria, (err, mls_listings) => {
    if (err)
      if (err.replyCode == '20201')
        console.log('No MLS Records Found.');
      else
        console.log(err);

    var rechat_array = rechat_listings.map(function (r) {
      return r.mls_number;
    });

    var mls_array = mls_listings.map(function (r) {
      return r.MLSNumber;
    });

    console.log('Found ' + rechat_array.length + ' listings in rechat database and ' + mls_listings.length + ' in MLS database');

    compare(rechat_array.sort(), mls_array.sort());

    process.exit();
  });
});
