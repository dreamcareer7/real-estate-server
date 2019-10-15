// Credit: https://github.com/EmilTholin/gmail-api-create-message-body
// For Demonstarate: https://www.qcode.co.uk/post/70

function createJson(threadId) {
  const thread = threadId ? `"threadId": "${threadId}"\r\n` : ''

  return [
    'Content-Type: application/json; charset="UTF-8"\r\n\r\n',
    `{\r\n${thread}}`
  ].join('')
}

function createHeaders(headers) {
  if ( !headers || headers.length === 0 )
    return ''

  const result = []

  for (const h in headers) {
    if (headers.hasOwnProperty(h)) {
      result.push(`${h}: ${headers[h]}\r\n`)
    }
  }

  return result.join('')
}

function createPlain(text) {
  return [
    'Content-Type: text/plain; charset="UTF-8"\r\n',
    'MIME-Version: 1.0\r\n',
    'Content-Transfer-Encoding: 7bit\r\n\r\n',
    text
  ].join('')
}

function createHtml(html) {
  return [
    'Content-Type: text/html; charset="UTF-8"\r\n',
    'MIME-Version: 1.0\r\n',
    'Content-Transfer-Encoding: 7bit\r\n\r\n',
    html
  ].join('')
}

function createAlternative(text, html) {
  return [
    'Content-Type: multipart/alternative; boundary="foo"\r\n\r\n',

    '--foo\r\n',
    createPlain(text),
    '\r\n\r\n',

    '--foo\r\n',
    createHtml(html),
    '\r\n\r\n',

    '--foo--',
  ].join('')
}

function createBody(text, html) {
  if (text && html)
    return createAlternative(text, html)

  if (text)
    return createPlain(text)

  if (html)
    return createHtml(html)
  
  return ''
}

function createAttachments(attachments) {
  if ( !attachments || attachments.length === 0 )
    return ''

  const result = []

  for (let i = 0; i < attachments.length; i++) {
    const att     = attachments[i]
    const attName = att.filename ? `; filename="${att.filename}"` : ''

    // Content-Type: image/jpeg
    // MIME-Version: 1.0
    // Content-ID: <20180619202303.24365.655.img@domain>
    // Content-Transfer-Encoding: base64
    // Content-Disposition: inline

    result.push('--foo_bar\r\n')
    result.push(`Content-Type: ${att.type}\r\n`)
    result.push('MIME-Version: 1.0\r\n')
    if (att.contentId) result.push(`Content-ID: <${att.contentId}>\r\n`)
    result.push('Content-Transfer-Encoding: base64\r\n')
    result.push(`Content-Disposition: attachment${attName}\r\n\r\n`)
    result.push(`${att.content}\r\n\r\n`)
  }

  return result.join('')
}


module.exports = function(params) {
  const json        = createJson(params.threadId)
  const headers     = createHeaders(params.headers)
  const body        = createBody(params.text, params.html)
  const attachments = createAttachments(params.attachments)

  return [
    '--foo_bar_baz\r\n',
    `${json}\r\n\r\n`,

    '--foo_bar_baz\r\n',
    'Content-Type: message/rfc822\r\n\r\n',

    'Content-Type: multipart/mixed; boundary="foo_bar"\r\n',
    `${headers}\r\n`,

    '--foo_bar\r\n',
    `${body}\r\n\r\n`,

    attachments,

    '--foo_bar--\r\n\r\n',

    '--foo_bar_baz--',
  ].join('')
}