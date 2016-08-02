#!/usr/bin/env node

require('../../connection.js');
require('../../../lib/utils/db.js');
require('../../../lib/models/index.js');

Listing.refreshSubdivisions( err => {
  if(err)
    console.log(err);

  var job = {
    name:'refresh_subdivisions',
  };

  MLSJob.insert(job, process.exit);
})