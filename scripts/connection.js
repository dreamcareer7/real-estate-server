var Domain = require('domain');
var db = require('../lib/utils/db');
var deasync = require('deasync');

var domain = Domain.create();

var getConnection = deasync(db.conn);
domain.db = getConnection();
domain.enter();