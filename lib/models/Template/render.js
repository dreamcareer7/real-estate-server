const request = require('request-promise-native')
const config = require('../../config')

if ( process.env.NODE_ENV === 'tests' )
  require('./mock')

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
