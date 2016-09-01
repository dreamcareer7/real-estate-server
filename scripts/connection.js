var Domain = require('domain');
var db = require('../lib/utils/db');
var deasync = require('deasync');
require('colors');
require('../lib/models/index.js')();

var domain = Domain.create();

var getConnection = deasync(db.conn);
domain.db = getConnection();
domain.jobs = [];
domain.jobs.push = job => Job.handle([job], () => {})
domain.enter();


process.on('uncaughtException', (e) => {
  delete e.domain;
  delete e.domainThrown;
  delete e.domainEmitter;
  delete e.domainBound;
  
  console.log(e);
  Slack.send({
    channel: 'server-errors',
    text: 'Uncaught exception on ' + __filename + '\n `'+e+'`',
    emoji: ':skull:'
  }, process.exit);
});

foo();