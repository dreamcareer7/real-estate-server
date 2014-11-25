require('../lib/models/index.js')();

var fs = require('fs');

function error(desc) {
  console.log(desc);
  process.exit();
}

var filename = process.argv[2];

if(!filename) error('Usage: node import.js /path/to/data.json');

var raw = fs.readFileSync(filename);

try {
  var properties = JSON.parse(raw);
} catch(e) {
  error('Invalid JSON file');
}

properties.map(importProperty);

function importProperty(property) {
  importAddress(property.address[0], function(err, address_id) {
    console.log(err, address_id);
    
    Property.create(property, function(err, id) {
      Property.setAddress(id, address_id, function() {

      });
    });
  });
}

function importAddress(addr, cb) {
  addr.type = 'address';
  addr.title = 'title';
  addr.subtitle = 'subtitle';

  Address.create(addr, cb);
}