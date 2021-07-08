/**
 * @namespace Branch
 */

const request = require('request-promise-native')
const config = require('../../config.js')
const Context = require('../Context')

if (process.env.NODE_ENV === 'tests') require('./mock.js')

class Branch {
  static async createURL(data, metadata = {}) {
    const body = await request.post(config.branch.base_url + '/v1/url', {
      body: {
        branch_key: config.branch.rechat.key,
        data,
        ...metadata
      },
      json: true
    })

    if (!body) {
      throw Error.Branch('Branch response is empty')
    }

    if (!body.url) throw Error.Branch('Branch url is invalid')

    Context.log(`Branch.createURL - ${JSON.stringify(data)} -> ${body.url}`)
    
    return body.url
  }
}

module.exports = Branch
