require('../lib/models/index.js')();

var fs = require('fs');
var async = require('async');

function error(desc) {
  console.log(desc);
  process.exit();
}

var filename = process.argv[2];
var user_id  = process.argv[3];

if(!filename || !user_id) error('Usage: node import.js /path/to/data.json user-id');

var raw = fs.readFileSync(filename);

try {
  var properties = JSON.parse(raw);
} catch(e) {
  error('Invalid JSON file');
}

async.map(properties, importProperty, function(err) {
  console.log(err);
});

function importProperty(property, cb) {
  async.auto({
    property_id         : Property.create.bind(null, property),
    property_address_id : ['property_id', setAddress.bind(null, property.address[0])],
    agency_id           : Agency.create.bind(null, property.agency[0]),
    agent_id            : ['agency_id', createAgent.bind(null, property.agent[0])],
    listing_id          : ['property_id', 'agency_id', 'agent_id', createListing],
    feed_id             : ['listing_id', createFeed]
  }, cb);

}

function setAddress(address, cb, results) {
  address.title = 'title';
  address.subtitle = 'subtitle';

  Property.setAddress(results.property_id, address, cb);
}

function createListing(cb, results) {
  var listing = {
    property_id:results.property_id,
    listing_agency_id:results.agency_id,
    listing_agent_id:results.agent_id,
    timestamp:(new Date).getTime()/1000
  }

  Listing.create(listing, cb);
}

function createAgent(agent, cb, results) {
  agent.type = 'agent';
  agent.agency_id = results.agency_id;
  agent.password = '1111';

  User.create(agent, cb);
}

function createFeed(cb, results) {
  var feed = {
    listing_id: results.listing_id,
    user_id   : user_id
  }
}