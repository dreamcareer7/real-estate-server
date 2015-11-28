#!/usr/bin/env node

var startTime = (new Date()).getTime();

var Client = require('./rets_client.js');
var colors = require('colors');
var program = require('commander');
var util = require('util');
var request = require('request');
var config = require('../../lib/config.js');

program.version(config.ntreis.version)
.option('-e, --enable-recs', 'Enable recommending listings to matching alerts')
.option('-p, --enable-photo-fetch', 'Disable fetching photos of properties')
.option('-r, --enable-cf-links', 'Disable displaying of CloudFront links')
.option('-l, --limit <limit>', 'Limit RETS server response manually (default: 100)')
.option('--start-from <hours_ago>', 'Fetches all the updates since <hours_ago>')
.option('-n, --enable-notifications', 'Enable Listing change notifications')
.parse(process.argv);

(function notice() {
  console.log('NTREIS connector'.cyan, config.ntreis.version.cyan);
  console.log('Instant Recommendation:'.yellow, (program.enableRecs) ? 'yes'.green : 'no'.red);
  console.log('Photo Fetching:'.yellow, (program.enablePhotoFetch) ? 'yes'.green : 'no'.red);
  console.log('Show CloudFront Links:'.yellow, (program.enableCfLinks) ? 'yes'.green : 'no'.red);
  console.log('Initial Fetch:'.yellow, (program.initial) ? 'yes'.green : 'no'.red);
  console.log('Listing Change Notifications:'.yellow, (program.enableNotifications) ? 'yes'.green : 'no'.red);
  console.log('Manual RETS Response Limit:'.yellow, program.limit);
  console.log('Manual starting point:'.yellow, program.startFrom);
})();

var itemsStart;
var itemsEnd;
var counts = {};

[
  'new property',
  'updated property',
  'new address',
  'updated address',
  'new listing',
  'updated listing',
  'address geocoded',
  'photo added'
].map( (event) => {
  counts[event] = 0;

  Client.on(event, (model) => {
    console.log(event.green, (++counts[event]).toString().yellow);
  });
});

Client.on('data fetched', (data) => {
  console.log('Total items to be processes', data.length);

  counts['total'] = data.length;
  itemsStart = data[0];
  itemsEnd = data[data.length-1];
});

Client.on('starting query', (query) => console.log('Notice:'.cyan, 'Performing', query));

if(program.enableCfLinks)
  Client.on('photo added', (listing, links) => {
    if(links && links.length > 0) console.log(links);
  });

function getElapsed() {
  return ((new Date()).getTime()) - startTime;
}

function reportToSlack(text, cb) {
  var payload = {
    channel: '#ntreis-updates',
    username: config.slack.this,
    icon_emoji: ':house:',
    text: text
  };

  var headers = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  var options = {
    url: config.slack.webhook,
    method: 'POST',
    headers: headers,
    form: {
      payload:JSON.stringify(payload)
    }
  };

  request.post(options, function(err, res, body) {
    if(err) {
      console.log('Error sending update to slack:', err);
    }
    cb(err);
  });
}

var options = {
  limit: program.limit ? parseInt(program.limit) : config.ntreis.default_limit,
  enablePhotoFetch: program.enablePhotoFetch,
  enableRecs: program.enableRecs,
  enableNotifications: program.enableNotifications,
  startFrom:program.startFrom
};

var considerExit = () => {
  var remaining = parseInt(config.ntreis.pause - getElapsed());

  if (remaining < 0)
    process.exit();

  console.log('Pausing for'.yellow,
              remaining,
              'milliseconds before termination to meet NTREIS limit on heavy requests...'.yellow);

  setTimeout(process.exit, remaining);
};

var initialCompleted = false;

function processResponse(err) {
  console.log('Total Running Time:', (getElapsed()/1000) + 's');
  var text;

  if(err) {
    console.log('INFO: (TERM) Script terminated with error:'.red, err);
    text = 'Error on NTRES script: '+err;
  } else {
    console.log('INFO: (TERM) Script finished successfully'.green);

    var miss_rate = Math.round(((counts['new address'] - counts['address geocoded']) / counts['new address']) * 100);

    text = [
      'Execution time: %d seconds',
      'Total items: %d',
      'First item: %s',
      'Last item: %s',
      'Listings: %s new, %s updated',
      'Properties: %s new, %s updated',
      'Addresses: %s new, %s updated',
      'Images: %s',
      'Geocoded: %s',
      'Miss rate: %s%',
      '----------------------------------'
    ].join('\n');

    text = util.format(text,
      getElapsed()/1000,
      counts.total,
      itemsStart.Matrix_Unique_ID,
      itemsEnd.Matrix_Unique_ID,
      counts['new listing'], counts['updated listing'],
      counts['new property'], counts['updated property'],
      counts['new address'], counts['updated address'],
      counts['photo added'],
      counts['address geocoded'],
      miss_rate
    );
    console.log(text);
  }

  if(initialCompleted) {
    console.log('Marking inital completed');
    var options = {
      enablePhotoFetch: program.enablePhotoFetch,
      enableRecs: program.enableRecs,
      enableNotifications: program.enableNotifications,
      startFrom:24
    };

    Client.work(options, processResponse);
    initialCompleted = false;

  } else {
    reportToSlack(text, considerExit);
  }
}

Client.work(options, processResponse);

Client.on('initial completed', () => {
  console.log('Initial process completed. We will now fetch last 24 hours data');
  initialCompleted = true;
});