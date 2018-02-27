const fs = require('fs')
const _ = require('lodash')
const copy = require('copy-dir')

copy.sync(__dirname + '/../api_docs/', '/tmp/rechat')

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
  console.log('✓ ' + suite + '\n')
})

function findParams (url, params, qs, docs) {
  const res = {}

  if (params)
    Object.keys(params).forEach((param_name) => {
      res[param_name] = { example: params[param_name] }
    })

  if (qs)
    Object.keys(qs).forEach((q) => {
      res[q] = { example: qs[q] }
    })
  
  return _.merge({}, docs, res)
}

function generate () {
  calls.forEach((call) => {
    const suite = call.req.headers['x-suite']
    const test = call.req.headers['x-test-name']

    let doc_override

    try {
      doc_override = require(`./docs/${suite}.js`)
    }
    catch (ex) {
      doc_override = {}
    }

    const md = generateTest(call, doc_override)
    try {
      fs.mkdirSync('/tmp/rechat/tests/' + suite)
    } catch (e) {
      // If directory exists, we're all good. Don't need to do anything.
    }

    fs.writeFileSync('/tmp/rechat/tests/' + suite + '/' + test + '.md', md)
  })

  process.exit()
}

function generateTest (call, doc_override) {
  return bf(cleanup(call.req, call.res, call.data, doc_override))
}

function cleanup (req, res, data, doc_override) {
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

  const route_path = req.route ? req.route.path : null
  if (!req.route) {
    console.log(`Check ${req.headers['x-suite']} ${req.headers['x-test-name']}`.red)
  }

  const case_doc_override = _.get(doc_override, [`${req.method} ${route_path}`, 'params'])

  return {
    request: {
      method: req.method,
      headers: reqHeaders,
      query: findParams(req.url, req.params, req.query, case_doc_override),
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

function bf(pair) {
  const indent = '    '
  const newline = '\n'
  const req = pair['request']
  const res = pair['response']
  let output = ''

  if (req.query) {
    output += '+ Parameters' + newline

    for (const name in req.query) {
      output += indent + '+ ' + name

      const example = req.query[name].example
      if (example)
        output += ': `' + example + '`'
      
      let type = req.query[name].type || 'string'
      if (req.query[name].enum)
        type = `enum[${type}]`

      const required = req.query[name].required === false ? 'optional' : 'required'
      output += ` (${type}, ${required})`

      const description = req.query[name].description
      if (description)
        output += ' - ' + description + newline
      
      const default_value = req.query[name].default
      if (default_value)
        output += newline + indent + indent + '+ Default: `' + default_value + '`'
      
      if (Array.isArray(req.query[name].enum)) {
        output += newline + indent + indent + '+ Members:'
        for (const enum_item of req.query[name].enum) {
          output += newline + indent + indent + indent + '+ `' + enum_item + '`'
        }
      }

      if (!_.endsWith(output, newline))
        output += newline
    }
  }

  if (req.body !== '{}') {
    output += '+ Request' + newline
//   output += indent + "+ Headers" + newline;
//   output += newline;
//   Object.keys(req['headers']).forEach(function(key) {
//     return output += indent + indent + indent + key + ":" + req['headers'][key] + newline;
//   });

    req['body'].split('\n').forEach(function (line) {
      output += indent + indent + indent + line + newline
      return output
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
    output += indent + indent + indent + line + newline
    return output
  })

  output += newline
  return output
}

module.exports = () => {}
