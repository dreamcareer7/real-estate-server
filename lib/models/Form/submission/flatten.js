const AttachedFile = require('../../AttachedFile')

const request = require('request-promise-native')

const { getServiceUrl } = require('./get')

const flatten = async (rev) => {
  const file = await AttachedFile.get(rev.file)

  const r = {
    url: getServiceUrl(rev.created_at),
    method: 'POST',
    json: true,
    body: {
      url: file.url,
      flat: true
    },
    encoding: null
  }

  return request(r)
}


module.exports = {
  flatten
}