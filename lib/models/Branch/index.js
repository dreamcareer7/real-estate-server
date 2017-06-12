/**
 * @namespace Branch
 */

const _u = require('underscore')
const request = require('request')
const config = require('../../config.js')

Branch = {}

if (process.env.NODE_ENV === 'tests')
  require('./mock.js')

const options = {
  uri: config.branch.base_url,
  json: {
    branch_key: config.branch.branch_key
  }
}

Branch.createURL = function (data, cb) {
  const _options = _u.clone(options)

  _options.method = 'POST'
  _options.uri += '/v1/url'
  _options.json.data = data

  request(_options, (err, response, body) => {
    if (err)
      return cb(err)

    if (!body)
      return cb(Error.Branch('Branch response is empty with status ' + response.statusCode))

    if (!body.url)
      return cb(Error.Branch('Branch url is invalid'))

    return cb(null, body.url)
  })
}
