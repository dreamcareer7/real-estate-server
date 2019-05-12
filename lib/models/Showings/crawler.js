const { expect } = require('chai')

const { getLoginPayLoad, getAjaxPayLoad } = require('./crawler_payload')
const { showingsParser} = require('./parser')
const Showings = require('../../../lib/models/Showings/showings')

const request = require('request-promise-native')
const jar = request.jar()

let response



/*
Sample Data

data = {
  meta: {
    isFirstCrawl: Boolean,
    action: 'Enum (showings, appoinmentsForBuyers)'
  },

  "showingCredential": {
    "id": uuid,
    "agent": uuid,
    "username": text,
    "password": text,
    "last_crawled_at": timestamptz
  }
}

Smaple Booked Showing
  {
    "remote_id": "895dcc2b-2923-4ebc-b927-ff8424bc2294",
    "mls_number": "14065743",
    "mls_title": "2744 FUENTE (14065743)",
    "date_raw": "Monday, May 6th 12:00 PM - 12:45 PM",
    "start_date": "2019-05-06T19:30:38.846Z",
    "end_date": "2019-05-06T20:15:38.846Z",
    "remote_agent_name": "amy zirbel",
    "remote_agent_email": "amy.zirbel@winansbhg.com",
    "remote_agent_desc": "jp and associates arlington",
    "result": "Showing / Setup",
    "remote_agent_phone_office": "817-540-2905",
    "remote_agent_phone_cell": "682-500-9582",
    "feedback_text": "We had a total of nine families out to open house...",
    "cancellation_reason": "No Reason Given",
    "note_text": "my-note"
}
*/

const startCrawler = async function (data) {
  try {

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
      startDate.setMonth(endtDate.getMonth() - 1)

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
    let body, showingId

    for(const bookedShowing of bookedShowings) {
      body = {
        agent: data.showingCredential.agent,
        ...bookedShowing
      }
    
      showingId = await Showings.create(body)

      expect(showingId).to.be.uuid
    }

  } catch(err) {

    Context.log('<- (CSS-HTML-Parser) Error in crawling process'.red, ':', JSON.stringify(err))
    throw err
  }

  return true
}


module.exports = {
  startCrawler
}