const email = {
  from: 'test@rechat.com',
  to: 'recipient@rechat.com',
  html: '<div>Hi</div>',
  text: 'Hi',
  subject: 'Email Subject'
}

const mailgun_id = '1234.1234@rechat.com'

const send = (cb) => {
  return frisby.create('Send an email')
  .post('/jobs', {
    name: 'Email.create',
    data: email
  })
  .after(cb)
  .expectStatus(200)
}

const storeId = (cb) => {
  return frisby.create('Store mailgun id')
  .post('/jobs', {
    name: 'Email.storeId',
    data: {
      email: results.email.send.id,
      mailgun_id: `<${mailgun_id}>`
    }
  })
  .after(cb)
  .expectStatus(200)
}

const addEvent = (cb) => {
  const data = {
    'event-data': {
      timestamp: 1531818450.203548,
      recipient: email.to,
      event: 'delivered',
      message: {
        headers: {
          'message-id': mailgun_id
        }
      }
    }
  }

  return frisby.create('Add an event to the email')
  .post('/emails/events', data)
  .after(cb)
  .expectStatus(200)
}


module.exports = {
  send,
  storeId,
  addEvent,
}
