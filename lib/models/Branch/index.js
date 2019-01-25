/**
 * @namespace Branch
 */

const request = require('request-promise-native')
const config = require('../../config.js')

if (process.env.NODE_ENV === 'tests') require('./mock.js')

class Branch {
  static async createURL(data) {
    const body = await request.post(config.branch.base_url + '/v1/url', {
      body: {
        branch_key: config.branch.branch_key,
        data
      },
      json: true
    })

    if (!body) {
      throw Error.Branch('Branch response is empty')
    }

    if (!body.url) throw Error.Branch('Branch url is invalid')

    return body.url
  }
}

global['Branch'] = Branch
module.exports = Branch
