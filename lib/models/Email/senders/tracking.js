const Context = require('../../Context')
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
    const obj  = { redirect: $(link).attr('href'), email, origin }
    const enc  = Crypto.encrypt(JSON.stringify(obj))
    const url  = Url.api({ uri: '/emails/events/redirect' })
    const data = encodeURIComponent(enc)

    Context.log('Creating link', `${url}/${data}`)

    try {
      JSON.parse(Crypto.decrypt(decodeURIComponent(data)))
    } catch (ex) {
      Context.log('handleTracking-failed', JSON.stringify(obj), enc, data)
    }

    $(link).attr('href', `${url}/${data}`)
  })

  const enc   = Crypto.encrypt(JSON.stringify({ email, origin }))
  const url   = Url.api({ uri: '/emails/events' })
  const pixel = `<img src="${url}/${encodeURIComponent(enc)}">`

  Context.log('Creating pixel link', `${url}/${encodeURIComponent(enc)}`)

  $.root().append(pixel)

  return $.html()
}


module.exports = handleTracking