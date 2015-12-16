var program = require('commander');

module.exports = program
.option('-l, --limit <limit>', 'Limit RETS server response manually (default: 100)')
.option('--start-from <hours_ago>', 'Fetches all the updates since <hours_ago>')