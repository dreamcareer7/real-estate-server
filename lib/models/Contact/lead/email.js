const cheerio   = require('cheerio')
const parseName = require('parse-full-name').parseFullName

module.exports =  async function (body) {
  const $ = cheerio.load(body['body-html'])
  
  /** @type {import('./types').ILtsLead} */
  const result = {}
  
  // other email contacts meta
  /* body['from']
  body['sender'] */
  
  $('td').each((i, e) => {
    if (e.children.length < 1) return
    switch (i) {
      case 6:
        const name = parseName(e.children[0].data.trim().replace('Dear ', '').replace(':', ''))
        result.first_name = name.first
        result.last_name = name.last
        break
      case 9:
        result.email = e.children[0].data.trim()
        break
      case 10:
        result.phone_number = e.children[0].data.trim()
        break
      default:
        return
    }
  })
  result.note = $('span.servDetails').text().trim()
  result.note += '  address: ' + $('p span[style="font-size:16px"]').text().trim()

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