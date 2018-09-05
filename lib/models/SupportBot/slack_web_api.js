const request = require('request-promise-native')

const config = require('../../config')

async function callMethodJson(method, payload) {
  const res = await request({
    method: 'POST',
    uri: 'https://slack.com/api/' + method,
    headers: {
      Authorization: 'Bearer ' + config.slack.support.oauth2_token,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: payload,
    json: true
  })
  
  console.log(res)
  // const resp = await res.json()

  return res
}

module.exports = {
  callMethodJson
}