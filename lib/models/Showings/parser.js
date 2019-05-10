const cheerio = require('cheerio')
const fs = require('fs')


function setHours(dt, h) {
  const s = /(\d+):(\d+)(.+)/.exec(h)
  dt.setHours(s[3] === 'pm' ? 12 + parseInt(s[1], 10) : parseInt(s[1], 10))
  dt.setMinutes(parseInt(s[2],10))
}

const cleanUpDate = function(input) {
  const dateTimeArr = input.split(' ')

  const year = 2019
  const month = dateTimeArr[1]
  const dayOfMonth = Number(dateTimeArr[2].match(/\d+/g))
  const startHour = dateTimeArr[3]
  const endtHour = dateTimeArr[6]

  let monthNum = 0

  switch(month.toLowerCase()) {
    case 'january':
      monthNum = 0
      break

    case 'february':
      monthNum = 1
      break

    case 'march':
      monthNum = 2
      break

    case 'april':
      monthNum = 3
      break

    case 'may':
      monthNum = 4
      break

    case 'june':
      monthNum = 5
      break

    case 'july':
      monthNum = 6
      break

    case 'august':
      monthNum = 7
      break

    case 'september':
      monthNum = 8
      break

    case 'october':
      monthNum = 9
      break

    case 'november':
      monthNum = 1
      break

    case 'december':
      monthNum = 1
      break

    default:
      monthNum = 0
  }

  const startDate = new Date()
  const endDate = new Date()

  startDate.setYear(year)
  startDate.setMonth(monthNum)
  startDate.setDate(dayOfMonth)

  endDate.setYear(year)
  endDate.setMonth(monthNum)
  endDate.setDate(dayOfMonth)

  setHours(startDate, `${startHour}pm`)
  setHours(endDate, `${endtHour}pm`)

  return {
    startDate: startDate,
    endDate: endDate
  }
}


const showingsParser = async function(filePath) {
  const html = fs.readFileSync(filePath)
  const $ = cheerio.load(html)
  const tables = $('body').find('table.p_topgroup')

  const listings = {}
  let currentListingTitle
  let tableRows
  let mlsNumber
  let cleanDates
  let showingTime
  let showingDate
  let showingId
  let agentName
  let agentEmail
  let agentDescHTML
  let firstBRTagIndex
  let secondBRTagIndex
  let agentDesc
  let result
  let agentPhone
  let phoneArr
  let cancellationReasonKey
  let cancellationReason
  let feedbackText
  let feedbackId
  let noteText
  let noteId


  tables.each(async function(i, table) {
    currentListingTitle = $(this).find('caption > h2').text()
    listings[currentListingTitle] = {}

    tableRows = $(this).find('tbody > tr')
    let showingSeparator = 0
    let rowcounter = 0

    tableRows.each(async function(i, tableRow) {

      if( $(this).hasClass('p_showing') ) {
        listings[currentListingTitle][showingSeparator] = {}

        mlsNumber = Number(currentListingTitle.match(/\((\d+)\)/g)[0].match(/\d+/g)[0])

        showingTime = $(this).find('td:nth-child(1) > p > strong > span').text().trim()
        showingDate = $(this).find('td:nth-child(1) > p > strong').text().trim()
        showingTime = showingTime.replace(/(\r\n|\n|\r)/gm, '')
        showingTime = showingTime.replace(/ +(?= )/g,'')
        showingDate = showingDate.replace(/(\r\n|\n|\r)/gm, '')
        showingDate = showingDate.replace(/ +(?= )/g,'')

        cleanDates = cleanUpDate(showingDate)

        showingId = $(this).find('td:nth-child(2) > a').attr('rel').trim()
        agentName = $(this).find('td:nth-child(2) > a').text().trim().toLowerCase()
        agentEmail = $(this).find('td:nth-child(2) > div > input').attr('value').trim().toLowerCase()
        
        agentDescHTML = $(this).find('td:nth-child(2)').html().trim()
        firstBRTagIndex = agentDescHTML.indexOf('<br>')
        secondBRTagIndex = agentDescHTML.indexOf('<br>', firstBRTagIndex + 4)
        agentDesc = agentDescHTML.substring(firstBRTagIndex + 4, secondBRTagIndex).trim().toLowerCase()

        result = $(this).find('td:nth-child(5) > span').text().trim()
        agentPhone = $(this).find('td:nth-child(3) > div').text().trim()
        agentPhone = agentPhone.replace(/(\r\n|\n|\r)/gm, '')
        agentPhone = agentPhone.replace(/ +(?= )/g,'')

        listings[currentListingTitle][showingSeparator]['showing_id'] = showingId

        listings[currentListingTitle][showingSeparator]['mls_number'] = mlsNumber
        listings[currentListingTitle][showingSeparator]['mls_title'] = currentListingTitle

        listings[currentListingTitle][showingSeparator]['showingDate'] = showingDate
        listings[currentListingTitle][showingSeparator]['showing_start_date'] = cleanDates.startDate
        listings[currentListingTitle][showingSeparator]['showing_end_date'] = cleanDates.endDate

        listings[currentListingTitle][showingSeparator]['remote_agent_name'] = agentName
        listings[currentListingTitle][showingSeparator]['remote_agent_email'] = agentEmail
        listings[currentListingTitle][showingSeparator]['remote_agent_desc'] = agentDesc
        listings[currentListingTitle][showingSeparator]['result'] = result

        phoneArr = agentPhone.split(' ')

        listings[currentListingTitle][showingSeparator]['agentPhoneTxt'] = agentPhone
        listings[currentListingTitle][showingSeparator]['remote_agent_phone_office'] = phoneArr[1]
        listings[currentListingTitle][showingSeparator]['remote_agent_phone_cell'] = phoneArr[3]

        // Reset rowcounter
        rowcounter = 1
      }

      if( rowcounter === 3 ) {
        cancellationReasonKey = $(this).find('td:nth-child(1) > h5').text().trim() || null
        cancellationReason = null

        if( cancellationReasonKey === 'Cancellation Reason' ) {
          cancellationReason = $(this).find('td:nth-child(2) > span').text().trim() || null
          cancellationReason = cancellationReason.replace(/(\r\n|\n|\r)/gm, '')
          cancellationReason = cancellationReason.replace(/ +(?= )/g,'')
        }

        feedbackText = null
        feedbackId = $(this).find('td:nth-child(1) > div.feedback_wrapper > div > a').attr('rel') || null
        
        if(feedbackId) {
          feedbackText = $(this).find('td:nth-child(1) > div.feedback_wrapper > div > p').text().trim()
          feedbackText = feedbackText.replace(/(\r\n|\n|\r)/gm, '')
          feedbackText = feedbackText.replace(/ +(?= )/g,'')
        }

        listings[currentListingTitle][showingSeparator]['feedback_text'] = feedbackText
        listings[currentListingTitle][showingSeparator]['cancellation_reason'] = cancellationReason
      }

      if( rowcounter === 5 ) {
        noteText = null
        noteId = $(this).find('td:nth-child(1) > a').attr('rel') || null
        
        if(noteId)
          noteText = $(this).find('td:nth-child(1) > p').text().trim()

        listings[currentListingTitle][showingSeparator]['note_text'] = noteText

        showingSeparator ++
      }

      rowcounter ++
    })
  })


  console.log(listings)
}


module.exports = {
  showingsParser
}