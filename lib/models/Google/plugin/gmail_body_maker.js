// Credit: https://github.com/EmilTholin/gmail-api-create-message-body

function createHeaders(headers) {
  if ( !headers || headers.length === 0 )
    return ''

  const result = []

  for (const h in headers) {
    if (headers.hasOwnProperty(h)) {
      result.push(h + ': ' + headers[h] + '\r\n')
    }
  }

  return result.join('')
}

function createJson(threadId) {
  return [
    'Content-Type: application/json; charset="UTF-8"\r\n\r\n',

    '{\r\n',
    (threadId ? '  "threadId": "' + threadId + '"\r\n' : ''),
    '}'
  ].join('')
}

function createPlain(textPlain) {
  return [
    'Content-Type: text/plain; charset="UTF-8"\r\n',
    'MIME-Version: 1.0\r\n',
    'Content-Transfer-Encoding: 7bit\r\n\r\n',

    textPlain
  ].join('')
}

function createHtml(textHtml) {
  return [
    'Content-Type: text/html; charset="UTF-8"\r\n',
    'MIME-Version: 1.0\r\n',
    'Content-Transfer-Encoding: 7bit\r\n\r\n',

    textHtml
  ].join('')
}

function createAlternative(textPlain, textHtml) {
  return [
    'Content-Type: multipart/alternative; boundary="foo"\r\n\r\n',

    '--foo\r\n',
    createPlain(textPlain), '\r\n\r\n',

    '--foo\r\n',
    createHtml(textHtml), '\r\n\r\n',

    '--foo--',
  ].join('')
}

function createText(textPlain, textHtml) {
  if (textPlain && textHtml)
    return createAlternative(textPlain, textHtml)

  if (textPlain)
    return createPlain(textPlain)

  if (textHtml)
    return createHtml(textHtml)
  
  return ''
}

function createAttachments(attachments) {
  if ( !attachments || attachments.length === 0 )
    return ''

  let result = []

  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i]

    result = result.concat([
      '--foo_bar\r\n',
      'Content-Type: ', a.type, '\r\n',
      'MIME-Version: 1.0\r\n',
      'Content-Transfer-Encoding: base64\r\n',
      'Content-Disposition: attachment', (a.name ? '; filename="' + a.name + '"' : ''), '\r\n\r\n',

      a.data, '\r\n\r\n'
    ])
  }

  return result.join('')
}


module.exports = function(params) {
  const json        = createJson(params.threadId)
  const headers     = createHeaders(params.headers)
  const text        = createText(params.textPlain, params.textHtml)
  const attachments = createAttachments(params.attachments)

  return [
    '--foo_bar_baz\r\n',
    json, '\r\n\r\n',

    '--foo_bar_baz\r\n',
    'Content-Type: message/rfc822\r\n\r\n',

    'Content-Type: multipart/mixed; boundary="foo_bar"\r\n',
    headers, '\r\n',

    '--foo_bar\r\n',
    text, '\r\n\r\n',

    attachments,

    '--foo_bar--\r\n\r\n',

    '--foo_bar_baz--',
  ].join('')
}