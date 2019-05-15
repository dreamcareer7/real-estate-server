const { expect } = require('chai')
const Context = require('../Context')

const { getLoginPayLoad, getAjaxPayLoad } = require('./crawler_payload')
const { showingsParser} = require('./parser')
const Showings = require('../../../lib/models/Showings/showings')
const ShowingsCredential = require('../../../lib/models/Showings/credential')

const request = require('request-promise-native')
const jar = request.jar()

const crawlerMock = require('./crawler_mock')


const crawler = async data => {
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
    
    let customDate = null

    if( data.meta.isFirstCrawl ) {
      const startDate = new Date()
      const endtDate = new Date(startDate)
      startDate.setMonth(endtDate.getMonth() - 3)

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
    ShowingsCredential.updateLastCrawledDate(data.showingCredential.id, ts)

  } catch(err) {

    Context.log('<- (CSS-HTML-Parser) Error in crawling process'.red, ':', JSON.stringify(err))
    throw err
  }

  return true
}

const startCrawler = async data => {
  if (process.env.NODE_ENV === 'tests')
    return await crawlerMock(data)

  return await crawler(data)
}


module.exports = {
  startCrawler
}