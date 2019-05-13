const cheerio = require('cheerio')


function setHours(input, h) {
  const s = /(\d+):(\d+)(.+)/.exec(h)
  input.setHours(s[3] === 'pm' ? 12 + parseInt(s[1], 10) : parseInt(s[1], 10))
  input.setMinutes(parseInt(s[2],10))
}

const cleanUpDate = function(input) {
  const dateTimeArr = input.split(' ')

  const year = new Date().getFullYear()
  const month = dateTimeArr[1]
  const dayOfMonth = Number(dateTimeArr[2].match(/\d+/g))
  const startHour = dateTimeArr[3]
  const endHour = dateTimeArr[6]

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
  setHours(endDate, `${endHour}pm`)

  return {
    startDate: startDate,
    endDate: endDate
  }
}


const showingsParser = async function(html) {
  const $ = cheerio.load(html)
  const tables = $('body').find('table.p_topgroup')
  const bookedShowings = []

  let currentListingTitle, tableRows, tempObj
  let showingId, mlsNumber, result
  let cleanDates, showingTime, showingDate
  let agentName, agentEmail, agentDescHTML, agentDesc
  let firstBRTagIndex, secondBRTagIndex
  let agentPhone, phoneArr, agentContact, contactArr
  let cancellationReasonKey, cancellationReason
  let feedbackText, feedbackId
  let noteText, noteId
  let firstIndex, secondIndex
  let showingSeparator = 0 // eslint-disable-line

  tables.each(async function(i, table) {
    currentListingTitle = $(this).find('caption > h2').text()

    tableRows = $(this).find('tbody > tr')
    let rowcounter = 0

    tableRows.each(async function(i, tableRow) {

      if( $(this).hasClass('p_showing') ) {
        tempObj = {}

        mlsNumber = Number(currentListingTitle.match(/\((\d+)\)/g)[0].match(/\d+/g)[0])

        showingDate = $(this).find('td:nth-child(1) > p').html().trim()
        firstIndex = showingDate.indexOf('<strong>')
        secondIndex = showingDate.indexOf('<br>')
        showingDate = showingDate.substring(firstIndex + '<strong>'.length, secondIndex).trim().toLowerCase()

        showingTime = $(this).find('td:nth-child(1) > p > strong > span').text().trim()
        showingTime = showingTime.replace(/(\r\n|\n|\r)/gm, '')
        showingTime = showingTime.replace(/ +(?= )/g,'')

        cleanDates = cleanUpDate(`${showingDate} ${showingTime}`)

        showingId = $(this).find('td:nth-child(2) > a').attr('rel').trim()
        agentName = $(this).find('td:nth-child(2) > a').text().trim().toLowerCase()
        agentEmail = $(this).find('td:nth-child(2) > div > input').attr('value').trim().toLowerCase()
        
        agentDescHTML = $(this).find('td:nth-child(2)').html().trim()
        firstBRTagIndex = agentDescHTML.indexOf('<br>')
        secondBRTagIndex = agentDescHTML.indexOf('<br>', firstBRTagIndex + 4)

        agentDesc = ''
        if( firstBRTagIndex > 0 && secondBRTagIndex > 0 )
          agentDesc = agentDescHTML.substring(firstBRTagIndex + 4, secondBRTagIndex).trim().toLowerCase()

        result = $(this).find('td:nth-child(5) > span').text().trim()

        agentPhone = $(this).find('td:nth-child(3) > div').text().trim()
        agentPhone = agentPhone.replace(/(\r\n|\n|\r)/gm, '')
        agentPhone = agentPhone.replace(/ +(?= )/g,'')
        agentPhone = agentPhone.replace(/\s\s+/g, ' ')
        phoneArr = agentPhone.split(' ').filter(function () { return true })

        agentContact = $(this).find('td:nth-child(4) > div').text().trim()
        agentContact = agentContact.replace(/(\r\n|\n|\r)/gm, '')
        agentContact = agentContact.replace(/ +(?= )/g,'')
        agentContact = agentContact.replace(/\s\s+/g, ' ')
        contactArr = agentContact.split(' ').filter(function () { return true })

        tempObj['remote_id'] = showingId
        tempObj['mls_number'] = mlsNumber
        tempObj['mls_title'] = currentListingTitle
        tempObj['date_raw'] = `${showingDate} ${showingTime}`
        tempObj['start_date'] = cleanDates.startDate
        tempObj['end_date'] = cleanDates.endDate
        tempObj['remote_agent_name'] = agentName
        tempObj['remote_agent_email'] = agentEmail
        tempObj['remote_agent_desc'] = agentDesc
        tempObj['result'] = result
        tempObj['remote_agent_phone'] = {
          'office': phoneArr[1] || '',
          'cell': phoneArr[3] || '',
          'direct': contactArr[1] || '',
          'vmail': contactArr[3] || '',
        }

        // Reset rowcounter
        rowcounter = 1
      }

      if( rowcounter === 3 ) {
        cancellationReasonKey = $(this).find('td:nth-child(1) > h5').text().trim() || null
        cancellationReason = ''

        if( cancellationReasonKey === 'Cancellation Reason' ) {
          cancellationReason = $(this).find('td:nth-child(2) > span').text().trim() || ''
          cancellationReason = cancellationReason.replace(/(\r\n|\n|\r)/gm, '')
          cancellationReason = cancellationReason.replace(/ +(?= )/g,'')
        }

        feedbackText = ''
        feedbackId = $(this).find('td:nth-child(1) > div.feedback_wrapper > div > a').attr('rel') || null
        
        if(feedbackId) {
          feedbackText = $(this).find('td:nth-child(1) > div.feedback_wrapper > div > p').text().trim()
          feedbackText = feedbackText.replace(/(\r\n|\n|\r)/gm, '')
          feedbackText = feedbackText.replace(/ +(?= )/g,'')
        }

        tempObj['feedback_text'] = feedbackText
        tempObj['cancellation_reason'] = cancellationReason
      }

      if( rowcounter === 5 ) {
        noteText = ''
        noteId = $(this).find('td:nth-child(1) > a').attr('rel') || null
        
        if(noteId)
          noteText = $(this).find('td:nth-child(1) > p').text().trim()

        tempObj['note_text'] = noteText

        bookedShowings.push(tempObj)
        showingSeparator ++
      }

      rowcounter ++
    })
  })

  return bookedShowings
}


module.exports = {
  showingsParser
}