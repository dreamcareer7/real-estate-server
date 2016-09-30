const fs = require('fs')
const _ = require('underscore')
const aglio = require('aglio')
const copy = require('copy-dir')

copy.sync(__dirname + '/../api_docs/', '/tmp/rechat')

// Disable app's stdout so it wont noise our HTML
const writer = process.stdout.write.bind(process.stdout)
process.stdout.write = function () {}

try {
  fs.mkdirSync('/tmp/rechat/tests')
} catch (e) {
  // Dont do anything if it already exists. We're good.
}

const calls = []

function logger (req, res, next) {
  if (req.headers['x-suite'] !== req.headers['x-original-suite'])
    return next()  // Dont document dependencies.

  const end = res.end

  res.end = function (data, encoding, callback) {
    calls.push({req, res, data})

    end.call(res, data, encoding, callback)
  }

  next()
}
Run.on('app ready', (app) => {
  app.use(logger)
})

Run.on('done', generate)
Run.on('suite done', (suite) => {
  process.stderr.write('✓ ' + suite + '\n')
})

function findParams (url, params, qs) {
  const res = {}

  if (params)
    Object.keys(params).forEach((param_name) => {
      res[param_name] = params[param_name]
    })

  if (qs)
    Object.keys(qs).forEach((q) => {
      res[q] = qs[q]
    })

  return res
}

function generate () {
  calls.forEach((call) => {
    const suite = call.req.headers['x-suite']
    const test = call.req.headers['x-test-name']

    const md = generateTest(call)
    try {
      fs.mkdirSync('/tmp/rechat/tests/' + suite)
    } catch (e) {
      // If directory exists, we're all good. Don't need to do anything.
    }

    fs.writeFileSync('/tmp/rechat/tests/' + suite + '/' + test + '.md', md)
  })

  const md = fs.readFileSync('/tmp/rechat/index.md').toString()

  aglio.render(md, {
//     themeTemplate:'triple',
    themeFullWidth: true,
    includePath: '/tmp/rechat'
  }, (err, html) => {
    if (err)
      process.stderr.write(err)

    writer(html)
    process.exit()
  })
}

function generateTest (call) {
  return bf(cleanup(call.req, call.res, call.data))
}

function cleanup (req, res, data) {
  const reqHeaders = _.clone(req.headers)
  const resHeaders = _.clone(res._headers);

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
  ].map((h) => delete reqHeaders[h]);

  [
    'x-powered-by',
    'cache-control',
    'etag',
    'content-length'
  ].map((h) => delete resHeaders[h])

  return {
    request: {
      method: req.method,
      headers: reqHeaders,
      query: findParams(req.url, req.params, req.query),
      body: req.body ? JSON.stringify(req.body) : ''
    },
    response: {
      headers: resHeaders,
      body: data ? data.toString() : '',
      statusCode: res.statusCode,
      statusMessage: res.statusMessage
    }
  }
}

function bf (pair) {
  const indent = '    '
  const newline = '\n'
  const req = pair['request']
  const res = pair['response']
  let output = ''

  if (req.query) {
    output += '+ Parameters' + newline

    Object.keys(req.query).map(name => {
      output += indent + '+ ' + name + ': `' + req.query[name] + '`' + newline
    })
  }

  if (req.body !== '{}') {
    output += '+ Request' + newline
//   output += indent + "+ Headers" + newline;
//   output += newline;
//   Object.keys(req['headers']).forEach(function(key) {
//     return output += indent + indent + indent + key + ":" + req['headers'][key] + newline;
//   });

    req['body'].split('\n').forEach(function (line) {
      return output += indent + indent + indent + line + newline
    })
    output += newline
  }
  output += '+ Response' + ' ' + res['statusCode'] + newline
//   output += indent + "+ Headers" + newline;
//   output += newline;
//   Object.keys(res['headers']).forEach(function(key) {
//     return output += indent + indent + indent + key + ":" + res['headers'][key] + newline;
//   });
  res['body'].split('\n').forEach(function (line) {
    return output += indent + indent + indent + line + newline
  })
  output += newline
  return output
}

module.exports = () => {}
