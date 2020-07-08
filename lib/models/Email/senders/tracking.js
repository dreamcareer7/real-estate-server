const cheerio = require('cheerio')
const Url = require('../../Url')
const Context = require('../../Context')



/**
 * @param {String} html html_body
 * @param {UUID} email email.id
 * @param {String} origin gmail/outlook
 */
const handleTracking = function (html, email, origin) {  
  const $ = cheerio.load(html, { xmlMode: true })

  $('a').each(function(i, link){
    const obj = {
      redirect: $(link).attr('href'),
      email,
      origin
    }
    const enc = Crypto.encrypt(JSON.stringify(obj))
    const url = Url.api({ uri: '/emails/events/redirect' })

    $(link).attr('href', `${url}/${enc}`)
  })

  const enc   = Crypto.encrypt(JSON.stringify({ email, origin }))
  const url   = Url.api({ uri: '/emails/events' })
  const pixel = `<img src="${url}/${enc}">`

  const returnVal = $.root().append(pixel)

  Context.log('Adding email event: returnVal', returnVal)

  return returnVal
}



module.exports = handleTracking