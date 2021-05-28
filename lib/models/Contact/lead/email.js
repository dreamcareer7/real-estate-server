const cheerio = require('cheerio')
const parseName = require('parse-full-name').parseFullName

module.exports = async function (body) {
  const $ = cheerio.load(body['body-html'])

  /** @type {import('./types').ILtsLead} */
  const result = {}

  // other email contacts meta
  /* body['from']
  body['sender'] */
  $('tr').each(function () {
    const tds = $(this).find('td')
    if (tds.length < 2) return

    const key = tds[0].children[0]?.data?.trim().replace(':', '')
    const value = $(tds[1])?.text()?.trim()

    switch (key) {
      case 'MLS #':
        result.listing_number = value
        break
      case 'Consumer Name':
        const name = parseName(value)
        result.first_name = name.first
        result.last_name = name.last
        break
      case 'Email Address':
        result.email = value
        break
      case 'Phone#':
        result.phone_number = value
        break
      case 'Address':
        result.address = value
        break
      case 'Comments':
        result.message = value
        break
      case 'Source':
        result.lead_source_url = value
        break
      default:
        break
    }
  })

  result.lead_source = 'Studio'
  result.note = result.message + '  address: ' + result.address

  const to_header = body['message-headers'].match(/(\["To",[^\]]+\])/)
  if (to_header.length < 1) {
    return { result }
  }

  const email_match = to_header[0].match(/<([^>]+)>/)
  if (email_match?.length !== 2) {
    return { result }
  }

  return { email: email_match[1], result }
}
