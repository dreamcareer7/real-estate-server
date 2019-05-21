const { expect } = require('chai')
const Context = require('../Context')
const promisify = require('../../utils/promisify')
const fs = require('fs')
const readFile = promisify(fs.readFile)
const cheerio = require('cheerio')

const { showingsParser} = require('./parser')
const Showings = require('../../../lib/models/Showings/showings')
const ShowingsCredential = require('../../../lib/models/Showings/credential')


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
      "selected_location": "6,1,DFW",
      "selected_location_string": "Dallas/Fort Worth",
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
      "remote_agent_phone": {
        "office": "214-254-4430",
        "cell": "682-888-3569",
        "direct": "Private",
        "vmail": "Private"
      },
      
      "result": "Showing / Setup",

      "feedback_text": "We had a total of nine families out to open house...",
      "cancellation_reason": "No Reason Given",
      "note_text": "my-note"
  }

  resultArr: 

    PENDING
      ["Preview", "Setup"]
      ["Showing", "Setup"]
      ["Showing", "Rescheduled by Agent"]

    DONE (deleted)
      ["Preview", "Declined By Seller"]
      ["Showing", "Cancelled by Agent"]
*/


const offlineCrawler = async data => {
  try {

    const html = await readFile('./tests/unit/showings/data/booked-showings.html')

    // Pass raw-html to parser
    const bookedShowings = await showingsParser(html)
    const tempArr = bookedShowings.slice(0, 5)

    // Iterate on booked-showings and persist on DB
    for(const bookedShowing of tempArr) {
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

  } catch(err) {

    Context.log('<- (CSS-HTML-Parser) Error in crawling process'.red, ':', JSON.stringify(err))
    throw err
  }

  return true
}

const offlineLoginTest = async data => {
  if( data.username === 'username' )
    return true

  const html = await readFile('./tests/unit/showings/data/failed-login.html')
  const $ = cheerio.load(html)
  
  const error = $('body').find('.main-wrap form div.notification p strong').text().trim()
  const desc = $('body').find('.main-wrap form div.notification p small').text().trim()

  if( error === 'Error:' && desc === 'Sorry, your username or password was incorrect. Please try again.' )
    return false

  return true
}


module.exports = {
  offlineCrawler,
  offlineLoginTest
}