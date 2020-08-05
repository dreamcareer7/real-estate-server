const config       = require('../../../config.js')
const AttachedFile = require('../../AttachedFile')

const request = require('request-promise-native')



const flatten = async (rev) => {
  const file = await AttachedFile.get(rev.file)

  const r = {
    url: `${config.forms.url}/generate.pdf`,
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