const path = require('path')
const fs = require('fs')

const { getLoginPayLoad, getAjaxPayLoad } = require('./crawler_payload')

const { promisify } = require('util')
const { get, post, del } = require('request')
const jar = require('request').jar()

const [ getPm, postPm ] = [ get, post, del ].map(promisify)
let response // { statusCode, statusMessage, body }



const startCrawler = async function (data) {
  console.log(new Date(), 'startCrawler', data)

  // Setup coockie
  console.log('Setup coockie')
  response = await getPm({ url: 'https://app.showings.com/Login', jar: jar })
  
  // Send login request
  console.log('Send login request')
  const loginPayload = await getLoginPayLoad(data)
  response = await postPm({
    url: 'https://app.showings.com/Login',
    headers: { 
      'content-type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73',
      'Origin': 'https://app.showings.com/Login'
    },
    method: 'post',
    jar: jar,
    followAllRedirects: true,
    body: loginPayload
  })
  
  // Retrive showings list
  const payLoad = await getAjaxPayLoad(data.action)
  console.log('Retrive showings list')
  response = await postPm({
    url: 'https://app.showings.com/ClassicReport/ShowingsOnYourListings/',
    headers: { 
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': 'https://app.showings.com'
    },
    method: 'post',
    jar: jar,
    followAllRedirects: true,
    body: payLoad
  })

  // Persist on disk
  console.log('Persist on disk')
  const unixTS = new Date().getTime()
  const fileName = '-showings-' + unixTS + '.html'
  const filePath = path.resolve(fileName)

  const html = '<body>' + response.body + '</body>'
  fs.writeFileSync(filePath, html)

  return fileName
}


module.exports = {
  startCrawler
}