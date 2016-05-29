#!/usr/bin/env node

require('../../connection.js');
require('../../../lib/utils/db.js');
require('../../../lib/models/index.js');

Agent.refreshContacts( err => {
  if(err)
    console.log(err);

  var job = {
    name:'refresh_agents',
  };

  MLSJob.insert(job, process.exit);
})