const request = require('request-promise-native')
const config = require('../../config')

const mapper = item => {
  const { fields } = item

  return {
    title: fields.Title,
    icon: fields.Icon?.[0]?.url,
    url: fields.Link,
    date: (new Date(fields.Date)).getTime() / 1000
  }
}

const getWhatsNew = async () => {
  const options = {
    uri: config.daily.whatsnew_url,
    json: true,
    headers: {
      'Authorization': `Bearer ${config.daily.whatsnew_api_key}`
    }
  }
  const { records }  = await request(options)

  return records.map(mapper)
}

module.exports = {
  getWhatsNew
}
