const config = require('../../config')
const { expect } = require('chai')
const Context = require('../Context')

const { getLoginPayLoad, getAjaxPayLoad } = require('./crawler_payload')
const { showingsParser} = require('./parser')
const Showings = require('../../../lib/models/Showings/showings')
const ShowingsCredential = require('../../../lib/models/Showings/credential')

const cheerio = require('cheerio')
const request = require('request-promise-native')
const jar = request.jar()

const crawlerMock = require('./crawler_mock')



const onlineLoginTestLogic = async function (html) {
  const $ = cheerio.load(html)
    
  const error = $('body').find('.main-wrap form div.notification p strong').text().trim() // Error:
  const desc = $('body').find('.main-wrap form div.notification p small').text().trim() // Sorry, your username or password was incorrect. Please try again.

  if( error === 'Error:' && desc === 'Sorry, your username or password was incorrect. Please try again.' )
    return false

  return true
}

const onlineLoginTest = async function (data) {
  try {

    // Setup coockie
    let response = await request.get({ url: 'https://app.showings.com/Login', jar: jar })
    
    // Send login request
    const loginPayload = await getLoginPayLoad(data)
    response = await request.post({
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

    return await onlineLoginTestLogic(response)

  } catch(err) {

    Context.log('<- (CSS-HTML-Parser) Error In Login Test'.red, ':', JSON.stringify({ err: err, data: data }))
    throw err
  }
}

const onlineCrawler = async data => {
  try {
    let response

    // Setup coockie
    response = await request.get({ url: 'https://app.showings.com/Login', jar: jar })
    
    // Send login request
    const loginPayload = await getLoginPayLoad(data.showingCredential)
    response = await request.post({
      url: 'https://app.showings.com/Login',
      headers: { 
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73',
        'Origin': 'https://app.showings.com/Login'
      },
      method: 'post',
      jar,
      followAllRedirects: true,
      body: loginPayload
    })

    const successLogin = await onlineLoginTestLogic(response)

    if(successLogin) {
      let customDate = null
  
      if( data.meta.isFirstCrawl ) {
        const startDate = new Date()
        const endtDate = new Date(startDate)
        startDate.setDate(endtDate.getDate() - config.showings.first_crawl_time_window)
  
        const startDateTxt = `${startDate.getMonth() + 1}/${startDate.getDate()}/${startDate.getFullYear()}`
        const endDateTxt = `${endtDate.getMonth() + 1}/${endtDate.getDate()}/${endtDate.getFullYear()}`
  
        customDate = {
          startDate: startDateTxt,
          endDate: endDateTxt
        }
      }
  
      // Retrive showings list
      const payLoad = await getAjaxPayLoad(data.meta.action, customDate)
      response = await request.post({
        url: 'https://app.showings.com/ClassicReport/ShowingsOnYourListings/',
        headers: { 
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://app.showings.com'
        },
        method: 'post',
        jar,
        followAllRedirects: true,
        body: payLoad
      })
  
      // Add <body> as root element
      const html = `<body>${response}</body>`
  
      // Pass raw-html to parser
      const bookedShowings = await showingsParser(html)
  
      // Iterate on booked-showings and persist on DB
      for(const bookedShowing of bookedShowings) {
        const showingBody = {
          credential_id: data.showingCredential.id,
          ...bookedShowing
        }
  
        let taskStatus = 'PENDING'
        const resultArr = bookedShowing.resultArr.map(elm => elm.toLowerCase())
  
        if( resultArr['declined by seller'] || resultArr['cancelled by agent'] )
          taskStatus = 'DONE'
  
        const taskBody = {
          user: data.showingCredential.user,
          brand: data.showingCredential.brand,
          title: bookedShowing.mls_title,
          due_date: new Date(bookedShowing.start_date).getTime(),
          status: taskStatus,
          task_type: 'Showing'
        }
  
        const showingId = await Showings.create(showingBody, taskBody)
        expect(showingId).to.be.uuid
      }
  
      // Update current credential last_crawled_date
      const ts = new Date().getTime()
      await ShowingsCredential.updateLastCrawledDate(data.showingCredential.id, ts)
      
      return true

    }

    await ShowingsCredential.updateCredentialLoginStatus(data.showingCredential.user, data.showingCredential.brand, false)
    return true

  } catch(err) {

    Context.log('<- (CSS-HTML-Parser) Error in crawling process'.red, ':', JSON.stringify({ err: err, data: data }))
    throw err
  }
}


const startCrawler = async data => {
  if (process.env.NODE_ENV === 'tests')
    return await crawlerMock.offlineCrawler(data)

  return await onlineCrawler(data)
}

const loginTest = async data => {
  if (process.env.NODE_ENV === 'tests')
    return await crawlerMock.offlineLoginTest(data)

  return await onlineLoginTest(data)
}

module.exports = {
  startCrawler,
  loginTest
}