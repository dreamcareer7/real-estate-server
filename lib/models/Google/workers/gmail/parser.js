const { unescape } = require('lodash')

const sq      = require('../../../../utils/squel_extensions')
const mimelib = require('mimelib')
const base64  = require('js-base64').Base64


const bodyParser = function (message) {
  function decode(input) {
    /*
      More: https://stackoverflow.com/questions/37445865/gmail-api-where-to-find-body-of-email-depending-of-mimetype/57361821

      The below method does not escape special "B" characters, So I changed it to the next solution.
      const text = Buffer.from(input, 'base64').toString('ascii')
      return decodeURIComponent(escape(text))
    */

    return base64.decode(input.replace(/-/g, '+').replace(/_/g, '/'))
  }

  const result = {
    snippet: unescape(message.snippet),
    text: '',
    html: ''
  }

  let parts = [message.payload]

  while (parts.length) {
    const part = parts.shift()

    if (part.parts) {
      parts = parts.concat(part.parts)
    }

    if ( part.mimeType === 'text/plain' && !result.text ) {
      if(part.body.data) {
        result.text = unescape(decode(part.body.data))
      }
    }

    if ( part.mimeType === 'text/html' && !result.html ) {
      if(part.body.data) {
        result.html = decode(part.body.data)
      }
    }

    if ( part.mimeType === 'multipart/mixed' || part.mimeType === 'multipart/alternative' ) {
      if (part.parts) {
        parts = parts.concat(part.parts)
      }
    }
  }

  if (!result.html)
    result.html = result.text

  return result
}

const parser = function (message) {
  const attachments   = []
  const recipients    = new Set()
  const targetHeaders = ['from', 'to', 'bcc', 'cc']

  let internetMessageId = null
  let inReplyTo = null
  let subject   = ''
  let from_raw  = {}
  let to_raw    = []
  let cc_raw    = []
  let bcc_raw   = []

  let parts = [message.payload]

  while (parts.length) {
    const part = parts.shift()

    if (part.parts)
      parts = parts.concat(part.parts)

    if (part.body.attachmentId) {

      let cid = ''

      if (part.headers) {
        for ( const header of part.headers ) {
          if ( header.name.toLowerCase() === 'content-id' )
            cid = header.value.substring(1, header.value.length - 1)
        }
      }

      attachments.push({
        'id': part.body.attachmentId,
        'cid': cid,
        'name': part.filename,
        'contentType': part.mimeType,
        'size': part.body.size,
        'isInline': ( Math.round(Number(part.partId)) === Number(part.partId) ) ? true : false
      })
    }
  }
 

  if (message.payload) {
    for (const header of message.payload.headers) {
      if ( targetHeaders.includes(header.name.toLowerCase()) ) {
        const addresses = mimelib.parseAddresses(header.value)
        addresses.filter(a => { if (a.address) return true }).map(a => recipients.add(a.address.toLowerCase()))
      }

      if ( header.name.toLowerCase() === 'message-id' )
        internetMessageId = header.value.substring(1, header.value.length - 1)
  
      if ( header.name.toLowerCase() === 'in-reply-to' )
        inReplyTo = header.value.substring(1, header.value.length - 1)
  
      if ( header.name.toLowerCase() === 'subject' ) {
        subject = header.value
        // subject = base64.decode(header.value.replace(/-/g, '+').replace(/_/g, '/'))
        // subject = ('=?utf-8?B?' + Buffer.from(header.value).toString('base64') + '?=')
      }
  
      if ( header.name.toLowerCase() === 'from' )
        from_raw = mimelib.parseAddresses(header.value)[0]
  
      if ( header.name.toLowerCase() === 'to' )
        to_raw = mimelib.parseAddresses(header.value)
  
      if ( header.name.toLowerCase() === 'cc' )
        cc_raw = mimelib.parseAddresses(header.value)
  
      if ( header.name.toLowerCase() === 'bcc' )
        bcc_raw = mimelib.parseAddresses(header.value)
    }
  }

  const recipientsArr = Array.from(recipients)

  const fromName    = from_raw['name']
  const fromAddress = from_raw['address'] ? from_raw['address'].toLowerCase() : ''
  const from        = `${fromName} <${fromAddress}>`

  const to    = to_raw.filter(rec => { if (rec.address) return true }).map(rec => rec.address.toLowerCase() )
  const cc    = cc_raw.filter(rec => { if (rec.address) return true }).map(rec => rec.address.toLowerCase() )
  const bcc  = bcc_raw.filter(rec => { if (rec.address) return true }).map(rec => rec.address.toLowerCase() )

  let inBound = false
  let isRead  = false

  if (message.labelIds) {
    inBound = (message.labelIds.includes('SENT')) ? false : true
    isRead  = (message.labelIds.includes('UNREAD')) ? false : true

    if ( message.labelIds.length === 0 ) {
      // Messages without labels are archived messages.
      isRead = true
    }

  } else {

    // Messages without labels are archived messages.
    isRead = true
  }


  return {
    recipientsArr,
    attachments,
    internetMessageId,
    inReplyTo,
    subject,
    inBound,
    isRead,

    from_raw,
    to_raw,
    cc_raw,
    bcc_raw,

    from,
    to: sq.SqArray.from(to || []),
    cc: sq.SqArray.from(cc || []),
    bcc: sq.SqArray.from(bcc || [])
  }
}


module.exports = {
  bodyParser,
  parser
}
