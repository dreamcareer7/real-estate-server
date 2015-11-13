var bf = require('api-blueprint-http-formatter').format;
var fs = require('fs');
var _ = require('underscore');

var calls = [];

function logger(req, res, next) {
  var end = res.end;


  res.end = function(data, encoding, callback) {
    calls.push({req,res,data});

    end.call(res, data, encoding, callback);
  }

  next();
}
Run.on('app ready', (app) => {
  app.use(logger);
});

process.on('exit', generate);

function findOriginal(url, params) {
  Object.keys(params).forEach( (param_name) => {
    url = url.replace(params[param_name], ':'+param_name);
  });

  return url;
}


function generate() {
  var suites = {};

  calls.forEach( (call) => {
    var suite = call.req.headers['x-suite'];
    if(!suites[suite])
      suites[suite] = [];

    suites[suite].push(call);
  });

  var templates = Object.keys(suites).map( (suite_name) => generateSuite(suite_name, suites[suite_name]) );

  var templates = Object.keys(suites).map( (suite_name) => '<!-- include('+suite_name+'.md) -->' );

  fs.writeFileSync('/tmp/docs/all.md', templates.join('\n\n'));
}

function generateSuite(name, calls) {
  var template = '# '+name+' \n';

  calls.forEach( (call) => {
    template += bf(cleanup(call.req, call.res, call.data))+'\n';
  })

  fs.writeFileSync('/tmp/docs/'+name+'.md', template);
}

function cleanup(req, res, data) {
  var reqHeaders = _.clone(req.headers);
  var resHeaders = _.clone(res._headers);

  [
    'x-suite',
    'x-test-name',
    'x-test-description',
    'content-length',
    'connection',
    'host',
    'accept',
    'pragma'
  ].map( (h) => delete reqHeaders[h] );

  [
    'x-powered-by',
    'cache-control',
    'etag',
    'content-length'
  ].map( (h) => delete resHeaders[h] )

  return {
    request:{
      method:req.method,
      headers:reqHeaders,
      uri:findOriginal(req.url, req.params),
      body:req.body ? JSON.stringify(req.body) : ''
    },
    response:{
      headers:resHeaders,
      body:data ? data.toString() : '',
      statusCode:res.statusCode,
      statusMessage:res.statusMessage
    }
  }
}