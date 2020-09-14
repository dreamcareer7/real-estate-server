const cheerio = require('cheerio')
const Crypto  = require('../../Crypto')
const Url     = require('../../Url')


/**
 * @param {String} html html_body
 * @param {UUID} email email.id
 * @param {String} origin gmail/outlook
 */
const handleTracking = function (html, email, origin) {
  const $ = cheerio.load(html, { xmlMode: false })

  $('a').each(function(i, link){
    const enc = Crypto.encrypt(JSON.stringify({ redirect: $(link).attr('href'), email, origin }))
    const url = Url.api({ uri: '/emails/events/redirect' })

    $(link).attr('href', `${url}/${encodeURIComponent(enc)}`)
  })

  const enc   = Crypto.encrypt(JSON.stringify({ email, origin }))
  const url   = Url.api({ uri: '/emails/events' })
  const pixel = `<img src="${url}/${encodeURIComponent(enc)}">`

  $.root().append(pixel)

  return $.html()
}


module.exports = handleTracking