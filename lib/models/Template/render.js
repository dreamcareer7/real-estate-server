const request = require('request-promise-native')
const config = require('../../config')

if ( process.env.NODE_ENV === 'tests' )
  require('./mock')

const SCREENSHOTS = config.screenshots.endpoint
const SCREENCASTS = config.screencasts.endpoint

const render = async ({ template, html, presigned, width, height, type, maxHeight }) => {
  const url = template.video ? SCREENCASTS : SCREENSHOTS

  return request.post({
    url,
    json: {
      html,
      presigned,
      width,
      height,
      type,
      maxHeight
    }
  })
}

module.exports = render
