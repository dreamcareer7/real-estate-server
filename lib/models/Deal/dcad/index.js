const request = require('request')
const cheerio = require('cheerio')

const cities = require('./cities')
const base_params = require('./params')

if (process.env.NODE_ENV === 'tests')
  require('./mock.js')

Deal.scrape = (deal, cb) => {
  const save = (text) => {
    if (!deal.context)
      deal.context = {}

    deal.context.legal_description = text

    Deal.update(deal, cb)
  }

  const baseurl = 'http://www.dallascad.org/'

  const city = Deal.getContext(deal, 'city')

  let city_id = ''

  if (city && cities[city.toUpperCase()])
    city_id = cities[city.toUpperCase()]

  const params = JSON.parse(JSON.stringify(base_params))

  params.url = `${baseurl}SearchAddr.aspx`
  params.txtAddrNum = Deal.getContext(deal, 'street_number') || ''
  params.listStDir = Deal.getContext(deal, 'street_dir_prefix') || ''
  params.txtStName = Deal.getContext(deal, 'street_name') || ''
  params.txtUnitID = Deal.getContext(deal, 'unit_number') || ''
  params.listCity = city_id

  let text
  const searchResults = (err, res, body) => {
    if (err)
      return cb(err)

    const $ = cheerio.load(body)
    const $links = $('#SearchResults1_dgResults tr a')
    if ($links.length > 1) {
      return save(`We tried searching <a target="_blank" href="http://www.dallascad.org/SearchAddr.aspx">DCAD</a> for this listing but found more than one matching result.
      Setting the full adress of the listing, including unit number, helps us find the proper listing automatically.`)
    }

    if ($links.length < 1) {
      return save('We could not find any listing on <a target="_blank" href="http://www.dallascad.org/SearchAddr.aspx">DCAD</a> with provided information')
    }

    const href = baseurl + $links.attr('href')
    text = `Legal description automatically pulled <a target="_blank" href="${href}">from DCAD:</a><br><br>`

    request(href, scrapeResult)
  }

  const scrapeResult = (err, res, body) => {
    if (err)
      return save('Error while fetching DCAD results page')

    const $ = cheerio.load(body)
    const $table = $('#lblLegalDesc').parents('.HalfCol')
    text += $table.html()
    save(text)
  }

  request(params, searchResults)
}