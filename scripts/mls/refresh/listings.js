#!/usr/bin/env node

require('../../connection.js');
require('../../../lib/utils/db.js');
require('../../../lib/models/index.js');

Alert.refreshFilters( err => {
  if(err)
    console.log(err);

  var job = {
    name:'refresh_listings',
  };

  MLSJob.insert(job, process.exit);
})