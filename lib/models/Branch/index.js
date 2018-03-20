/**
 * @namespace Branch
 */

const request = require('request')
const config = require('../../config.js')

if (process.env.NODE_ENV === 'tests') require('./mock.js')

const DEFAULT_OPTIONS = {
  uri: config.branch.base_url,
  json: {
    branch_key: config.branch.branch_key
  }
}

class Branch {
  static createURL(data, cb) {
    const options = {
      ...DEFAULT_OPTIONS
    }

    options.method = 'POST'
    options.uri += '/v1/url'
    options.json.data = data

    request(options, (err, response, body) => {
      if (err) return cb(err)

      if (!body)
        return cb(
          Error.Branch(
            'Branch response is empty with status ' + response.statusCode
          )
        )

      if (!body.url) return cb(Error.Branch('Branch url is invalid'))

      return cb(null, body.url)
    })
  }
}

global['Branch'] = Branch
module.exports = Branch
