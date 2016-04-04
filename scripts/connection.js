var Domain = require('domain');
var db = require('../lib/utils/db');
var deasync = require('deasync');
require('../lib/models/index.js')();

var domain = Domain.create();

var getConnection = deasync(db.conn);
domain.db = getConnection();
domain.jobs = [];
domain.jobs.push = job => Job.handle([job], () => {})
domain.enter();