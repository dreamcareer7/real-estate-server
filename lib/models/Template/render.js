const request = require('request-promise-native')

const Context = require('../Context')
const config = require('../../config')

const SCREENSHOTS = '/screenshot'
const SCREENCASTS = '/screencast'

const render = async ({template, html, presigned, width, height, type}) => {
  const endpoint = template.video ? SCREENCASTS : SCREENSHOTS
  const url = `${config.screenshots.host}${endpoint}`

  return request.post({
    url,
    json: {
      html,
      presigned,
      width,
      height,
      type
    }
  })
}

module.exports = render
