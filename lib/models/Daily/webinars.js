const request = require('request-promise-native')
const config = require('../../config')

const mapper = session => {
  const { fields } = session

  return {
    topics: fields.Topics,
    topic: fields.Topic,
    host: {
      name: fields?.Host?.[0],
      role: fields?.Role?.[0],
      avatar: fields?.Avatar?.[0]?.thumbnails?.large?.url,
    },
    url: fields.Link,
    date: (new Date(fields.Date)).getTime() / 1000
  }
}

const getWebinars = async () => {
  const options = {
    uri: config.daily.webinars_url,
    json: true,
    headers: {
      'Authorization': `Bearer ${config.daily.webinars_api_key}`
    }
  }
  const { records }  = await request(options)

  return records.map(mapper)
}

module.exports = {
  getWebinars
}
