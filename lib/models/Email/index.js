const config = require('../../config.js')
const { peanar } = require('../../utils/peanar')
const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const request = require('request')
const htmlToText = require('./html-to-text')

const Slack            = require('../Slack')
const GoogleCredential = require('../Google/credential')
const GoogleMessage    = require('../Google/message')
const MicrosoftCredential = require('../Microsoft/credential')
const MicrosoftMessage    = require('../Microsoft/message')


// const AttachedFile = require('../AttachedFile')
const Context = require('../Context')
const Orm = require('../Orm')

const Mailgun = require('mailgun-js')

const Email = {}

Email.MARKETING = 'Marketing'
Email.GENERAL = 'General'

Email.TO = 'To'
Email.CC = 'CC'
Email.BCC = 'BCC'

Email.TAG = 'Tag'
Email.LIST = 'List'
Email.EMAIL = 'Email'
Email.BRAND = 'Brand'
Email.ALL_CONTACTS = 'AllContacts'

const senders = {}

const mock = require('./mock')

const instance = sender => {
  if (process.env.NODE_ENV === 'tests')
    return mock

  if (senders[sender])
    return senders[sender]

  const c = config.mailgun[sender]
  const mailgun = Mailgun({apiKey: c.api_key, domain: c.domain})
  senders[sender] = mailgun

  return mailgun
}

const factory = sender => {
  const mailgun = instance(sender)
  const messages = mailgun.messages()
  return messages.send.bind(messages)
}

const domains = {}
domains[Email.GENERAL] = factory(Email.GENERAL)
domains[Email.MARKETING] = factory(Email.MARKETING)


Email.create = async email => {
  const ids = await Email.createAll([email])

  return Email.get(ids[0])
}

Email.createAll = async emails => {
  if (!Array.isArray(emails) || emails.length === 0) return []

  const rows = []

  for (const email of emails) {
    if (!email.domain) email.domain = Email.GENERAL
    if (!email.from) email.from = config.email.from

    const {
      domain,
      tags = [],
      from,
      campaign,
      html,
      subject,
      headers,
      to = [],
      cc = [],
      bcc = []
    } = email

    let { text } = email

    if (!text)
      text = htmlToText(email.html)

    rows.push({
      domain,
      from,
      tags: sq.SqArray.from(tags || []),
      to: sq.SqArray.from(to || []),
      cc: sq.SqArray.from(cc || []),
      bcc: sq.SqArray.from(bcc || []),
      subject,
      html,
      text,
      headers,
      campaign
    })
  }

  const ids = await db.chunked(rows, Object.keys(rows[0]).length * 2, (chunk, i) => {
    const q = sq
      .insert({
        autoQuoteFieldNames: true,
        nameQuoteCharacter: '"'
      })
      .into('emails')
      .setFieldsRows(chunk)
      .returning('id')

    q.name = `email/create_all#${i}`

    return db.selectIds(q)
  })

  Context.log(`Inserting ${ids.length} of ${emails.length} is done`)

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i]

    email.id = ids[i]

    Email.queue(emails[i])
  }

  return ids
}

Email.getAll = async ids => {
  return db.select('email/get', [ids])
}

Email.get = async id => {
  const emails = await Email.getAll([id])

  if (emails.length < 1)
    throw Error.ResourceNotFound(`Email ${id} not found`)

  return emails[0]
}

Email.queue = async email => {
  Context.log('Queueing email to', email.to)
  Email.send(email)
}

Email.storeId = async (id, mailgun_id) => {
  const trimmed = mailgun_id.replace(/^</, '').replace(/>$/, '')
  await db.query.promise('email/store-id', [id, trimmed])
}


const sendSlackMessage = (text, ex) => {
  Context.log(ex)

  Slack.send({ channel: '7-server-errors',  text: text, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: text, emoji: ':skull:' })
}

const sendViaMailgun = async email => {
  const mailgun = instance(email.domain)

  email.attachment = email.attachments.map(attachment => {
    return new mailgun.Attachment({
      filename: attachment.file_name,
      data: request(attachment.url)
    })
  })

  email['o:tag'] = email.tags

  const recipient = email.to || email.cc || email.bcc

  try {
    const { id } = await promisify(domains[email.domain])(email)

    Context.log('Sent an email to'.cyan, recipient, email.id, id)

    await Email.storeId(email.id, id)

    return id
  } catch(err) {
    Context.log('<- (Mailgun-Transport) Error sending email to'.red, recipient, ':', JSON.stringify(err))
    throw err
  }
}

const sendViaOutlook = async email => {
  /*
    const email = {
      subject: campaign.subject,
      html: campaign.html,
      text,
      user: campaign.created_by,
      attachments,
      headers: campaign.headers,
      google_credential: campaign.google_credential,
      microsoft_credential: campaign.microsoft_credential
    }
  */

  try {


    const brand = getCurrentBrand()
    const user  = req.user.id
  
    const credential = await MicrosoftCredential.get(req.params.mcid)
  
    if (!credential)
      throw Error.ResourceNotFound('Microsoft-Credential Not Found!')
  
    if (credential.revoked)
      throw Error.BadRequest('Microsoft-Credential Is Revoked!')
  
    if (credential.deleted_at)
      throw Error.BadRequest('Microsoft-Credential Is Deleted!')
  
    if ( !credential.scope.includes('Mail.Send') && !credential.scope.includes('Mail.ReadWrite') )
      throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')
  
    if ( credential.user !== user )
      throw Error.Unauthorized('Invalid user credential.')
  
    if ( credential.brand !== brand )
      throw Error.Unauthorized('Invalid brand credential.')
  
      
    const toRecipients  = req.body.to || []
    const ccRecipients  = req.body.cc || []
    const bccRecipients = req.body.bcc || []
  
    if ( toRecipients.length === 0 )
      throw Error.BadRequest('To is not specified.')
  
    if ( (toRecipients.length + ccRecipients.length + bccRecipients.length) > 500 )
      throw Error.BadRequest('Recipients number should not be greater than 500.')
  
    if (!req.body.html)
      throw Error.BadRequest('HTML-Body is not specified.')
  
  
    let isReply = false
  
    if ( req.body.messageId ) {
      // If this is a reply to a thread, subject should not be altered
      // Adding "Re: " to the head of the subject is allowed
  
      isReply = true
  
      const replyToMessage = await MicrosoftMessage.get(req.body.messageId, credential.id)
      if ( !replyToMessage )
        throw Error.ResourceNotFound(`Microsoft-Message ${req.body.messageId} Not Found!`)
    }
  
    const params = {
      'messageId': req.body.messageId,
      'credential': credential,
  
      'header': {
        'subject': req.body.subject,
        'from': `${credential.display_name} <${credential.email}> `,
        'to': toRecipients,
        'cc': ccRecipients,
        'bcc': bccRecipients
      },
  
      'attachments': req.body.attachments || [],
  
      'body': {
        'text': req.body.text,
        'html': req.body.html
      }
    }
  
    let result = {}
  
    try {
  
      if (isReply) {
        result = await MicrosoftMessage.sendReply(params)    
  
        // alternative solution
        // await MicrosoftMessage.sendEmail(params)
        // await MicrosoftCredential.forceSync(credential.id)
        // return res.status(204).end()
  
      } else {
  
        result = await MicrosoftMessage.createAndSendMessage(params)
      }
  
      try {
  
        const sentMessage = await MicrosoftMessage.getRemoteMessageByConversationId(credential, result.conversationId, params)
  
        if (!sentMessage) {
          await MicrosoftCredential.forceSync(credential.id)
          return res.status(204).end()
        }
  
        return res.model(sentMessage)
  
      } catch (ex) {
  
        await MicrosoftCredential.forceSync(credential.id)
  
        const text = `Outlook-Send-Email Fetch-Remote-Message-Failed - credential: ${credential.id} - Ex: ${ex.message}`
        const msg  = `Outlook-Send-Email Fetch-Remote-Message-Failed Ex: ${JSON.stringify(ex)}`
        sendSlackMessage(text, msg)
  
        return res.status(204).end()
      }
  
    } catch (ex) {
  
      await MicrosoftCredential.forceSync(credential.id)
  
      const text = `Outlook-Send-Email-Failed - credential: ${credential.id} - Ex: ${ex.message}`
      const msg  = `Outlook-Send-Email-Failed Ex: ${JSON.stringify(ex)}`
      sendSlackMessage(text, msg)
  
      throw Error.BadRequest('Outlook-Send-Email Failed!')
    }



    // Socket.send('outlook.email.sent', email.user, [info])

  } catch(err) {

    Context.log('sendViaOutlook-failed'.red, JSON.stringify(err))
    throw err
  }
}

const sendViaGmail = async email => {
  const user  = email.user

  const credential = await GoogleCredential.get(email.google_credential)

  if ( !credential ) {
    Context.log('Google-Credential not found')
    return
  }

  if (credential.revoked) {
    Context.log('Google-Credential Is Revoked!')
    return
  }

  if ( !credential.deleted_at ) {
    Context.log('Google-Credential Is Deleted!')
    return
  }

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.send') ) {
    Context.log('Access is denied! Insufficient Permission! Reconnect Your Account!')
    return
  }

  if ( credential.user !== user ) {
    Context.log('Invalid user credential!')
    return
  }

  /*
    Recipients structure: [{ address: 'email_domain.com', name: 'name' }]
  */

  const toRecipients  = req.body.to || []
  const ccRecipients  = req.body.cc || []
  const bccRecipients = req.body.bcc || []

  // if ( toRecipients.length === 0 )
  //   throw Error.BadRequest('To is not specified.')

  // if ( (toRecipients.length + ccRecipients.length + bccRecipients.length) > 100 )
  //   throw Error.BadRequest('Recipients number should not be greater than 100.')


  const params = {
    'credential': credential,

    'header': {
      'subject': email.subject,
      'from': `${credential.display_name} <${credential.email}> `,
      'to': toRecipients,
      'cc': ccRecipients,
      'bcc': bccRecipients,
      'In-Reply-To': `<${email.headers.in_reply_to}>` || null
    },

    'threadId': email.headers.thread_id || null,

    'attachments': email.attachments || [],

    'body': {
      'text': email.text,
      'html': email.html
    }
  }

  try {

    const result = await GoogleMessage.sendEmail(params)

    const sentMessageId = result.id
    const sentMessage   = await GoogleMessage.getRemoteMessage(credential, sentMessageId)

    return sentMessage

  } catch (ex) {

    const text = `Gmail-Send-Email-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    const msg  = `Gmail-Send-Email-Failed Ex: ${ex}`
    sendSlackMessage(text, msg)

    return null
  }
}

const sendEmail = async email => {
  const viaMicrosoft = Boolean(email.microsoft_credential) 
  const viaGoogle    = Boolean(email.google_credential)
  const viaMailgun   = !viaMicrosoft && !viaGoogle

  if(viaMicrosoft)
    await sendViaOutlook(email)

  if(viaGoogle)
    await sendViaGmail(email)

  if(viaMailgun)
    await sendViaMailgun(email)
}

Email.send = peanar.job({
  handler: sendEmail,
  queue: 'email',
  error_exchange: 'email.error',
  exchange: 'email',
  name: 'sendEmail'
})

Email.addEvent = async ({email, event, created_at, recipient}) => {
  Context.log('Adding email event', event, recipient, email)
  const { rows } = await db.query.promise('email/event/add', [
    email,
    event,
    created_at,
    recipient
  ])

  const { campaign } = rows[0]

  if (campaign)
    return EmailCampaign.touch(campaign)
}

Email.publicize = model => {
  /*
   * It would make our responses huge as sometimes we send thousands of these to clients.
   */
  delete model.html
  delete model.text
}

Orm.register('email', 'Email', Email)

global['Email'] = Email
module.exports = Email
