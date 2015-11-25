require('../lib/models/index.js')();
var db = require('../lib/utils/db.js');
var config = require('../lib/config.js');
var sql = require('../lib/utils/require_sql.js');
var geo = require('../lib/utils/geo.js');
var criteria = require('../tests/suites/data/valert_criteria.js');
require('./connection.js')
var _ = require('underscore');
var client = require('./ntreis/rets_client.js')

var randomGeoPoints = geo.generateRandomPoints({
  'lat': criteria.location.latitude,
  'lng': criteria.location.longitude
}, 10000);


Alert.check(criteria, function (err, compact_listings) {
  if (err)
    console.log(err);
  client.searchByLocation(randomGeoPoints, function (err, res) {
    if (err)
      if (err.replyCode == '20201')
        console.log('No Records Found.');
      else
        console.log(err);
    else {
      console.log('our result: ' + compact_listings.length);
      console.log('MLS result: ' + res.length);
      console.log(_.isEqual(JSON.stringify(compact_listings), JSON.stringify(res)));
    }
    process.exit();

  });
})
;
