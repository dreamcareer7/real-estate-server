var fs = require('fs');
var _ = require('underscore');
var utils = require('util');
var aglio = require('aglio');
var spawn = require('child_process').spawn;

try {
  fs.mkdirSync('/tmp/rechat');
} catch (e) {}

var calls = [];

function logger(req, res, next) {
  if(req.headers['x-suite'] !== req.headers['x-original-suite'])
    return next();  //Dont document dependencies.

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

Run.on('done', generate);

function findOriginal(url, params, qs) {
  Object.keys(params).forEach( (param_name) => {
    url = url.replace(params[param_name], ':'+param_name);
  });

  Object.keys(qs).forEach( (q) => {
    url = url.replace(qs[q], '<'+q+'>');
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


  var templates = Object.keys(suites)
  .sort( (a, b) => {
    if(a < b) return -1;
    if(a < b) return 0;
    return 0;
  })
  .map( (suite_name) => generateSuite(suite_name, suites[suite_name]) )

  var templates = Object.keys(suites).map( (suite_name) => '<!-- include('+suite_name+'.md) -->' );

  var md = templates.join('\n\n');

  aglio.render(md, {
//     themeTemplate:'triple',
    includePath:'/tmp/rechat'
  },  (err, html) => {
    fs.writeFileSync('/tmp/rechat/full.html', html);

    spawn('xdg-open', ['/tmp/rechat/full.html']);
    console.log('Your browser is now opened. Documentation is stored at /tmp/rechat/full.html');
    process.exit();
  })
}

function generateSuite(name, calls) {
  var template = '# Group %s \n %s \n';

  try {
    var doc = fs.readFileSync(__dirname+'/../docs/'+name+'.md').toString();
  } catch(e) {
    var doc = '';
  }

  template = utils.format(template, capitalize(name), doc);

  calls.forEach( (call) => {
    template += generateTest(call)
  });

  fs.writeFileSync('/tmp/rechat/'+name+'.md', template);
}

function generateTest(call) {
  var t = bf(cleanup(call.req, call.res, call.data))+'\n';

  var description = capitalize(call.req.headers['x-test-description']);

  var suite = call.req.headers['x-suite'];
  var test  = call.req.headers['x-test-name'];

  try {
    var doc = fs.readFileSync(__dirname+'/../docs/'+suite+'/'+test+'.md').toString();
  } catch(e) {
    var doc = '';
  }

  return utils.format(t, description, doc);
}

function cleanup(req, res, data) {
  var reqHeaders = _.clone(req.headers);
  var resHeaders = _.clone(res._headers);

  [
    'x-suite',
    'x-test-name',
    'x-test-description',
    'x-original-suite',
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
      uri:findOriginal(req.url, req.params, req.query),
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

function capitalize(s) {
  return s.substr(0,1).toUpperCase()+s.substr(1);
}

function bf(pair, description) {
  var indent, newline, output, req, res,
    _this = this;
  output = "";
  indent = "    ";
  newline = "\n";
  req = pair['request'];
  res = pair['response'];
  output = "## " + req['method'] + " " + req['uri'] + newline;
  output += '## %s' + newline;
  output += newline+'%s'+newline;
  output += "+ Request" + newline;
//   output += indent + "+ Headers" + newline;
//   output += newline;
//   Object.keys(req['headers']).forEach(function(key) {
//     return output += indent + indent + indent + key + ":" + req['headers'][key] + newline;
//   });


  req['body'].split('\n').forEach(function(line) {
    return output += indent + indent + indent + line + newline;
  });
  output += newline;
  output += "+ Response" + " " + res['statusCode'] + newline;
//   output += indent + "+ Headers" + newline;
//   output += newline;
//   Object.keys(res['headers']).forEach(function(key) {
//     return output += indent + indent + indent + key + ":" + res['headers'][key] + newline;
//   });
  res['body'].split('\n').forEach(function(line) {
    return output += indent + indent + indent + line + newline;
  });
  output += newline;
  return output;
};


module.exports = () => {}