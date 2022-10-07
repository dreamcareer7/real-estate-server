// @ts-nocheck

const path = require('path')
const fs = require('fs')
const omit = require('lodash/omit')
const Crypto = require('../../../lib/models/Crypto')

registerSuite('brand', [
  'createParent',
  'create',
  'addRole',
  'addMember'
])

registerSuite('user', ['upgradeToAgentWithEmail'])

registerSuite('google', ['createGoogleCredential', 'getGoogleProfile'])
registerSuite('microsoft', ['createMicrosoftCredential', 'getMicrosoftProfile'])

registerSuite('template', ['create', 'instantiate'])

const email = {
  to: [
    {
      email: 'recipient@rechat.com',
      recipient_type: 'Email'
    },
  ],
  tags: ['mailGunTag'],
  due_at: new Date(),
  html: '<div>Hi</div>',
  subject: 'Email Subject',
  notifications_enabled: false
}

const individual = {
  ...email,
  subject: 'Individual Email',
  notifications_enabled: true
}

const draftEmail = {
  ...email,
  due_at: undefined,
  from: null, // will be mutated later
}

const scheduledEmail = {
  ...email,
  due_at: new Date(Date.now() + 3600),
  from: null, // will be mutated later
}

const schedule = cb => {
  email.from = results.authorize.token.data.id

  return frisby
    .create('Schedule an email campaign')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .post('/emails', email)
    .after(cb)
    .expectStatus(200)
}

const createDraft = cb => {
  draftEmail.from = results.authorize.token.data.id

  return frisby
    .create('Schedule an email campaign')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .post('/emails', draftEmail)
    .after(cb)
    .expectStatus(200)
}

const createScheduled = cb => {
  scheduledEmail.from = results.authorize.token.data.id

  return frisby
    .create('Schedule an email campaign')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .post('/emails', scheduledEmail)
    .after(cb)
    .expectStatus(200)
}

const sendDue = cb => {
  return frisby
    .create('Send Due Email Campaigns')
    .post('/jobs', {
      name: 'EmailCampaign.sendDue',
    })
    .addHeader('x-handle-jobs', 'yes')
    .after(cb)
    .expectStatus(200)
}

const getMailGunId = cb => {
  return frisby
    .create('Get MailGun Id')
    .get(`/emails/${results.email.schedule.data.id}?associations[]=email_campaign.emails&associations[]=email_campaign.recipients&associations[]=email_campaign_email.email`)
    .after(cb)
    .expectStatus(200)
}

const addEvent = cb => {

  const data = {
    'event-data': {
      timestamp: new Date().getTime(),
      recipient: email.to[0].email,
      event: 'delivered',
      message: {
        headers: {
          'message-id': results.email.getMailGunId.data.emails[0].email.mailgun_id
        }
      }
    }
  }

  return frisby
    .create('Add an event to the email')
    .post('/emails/events', data)
    .addHeader('x-handle-jobs', 'yes')
    .after(cb)
    .expectStatus(200)
}

function unsubscribe (cb) {
  return frisby
    .create('Add unsubscribe event to the email')
    .post('/emails/events', {
      'event-data': {
        timestamp: Date.now(),
        recipient: email.to[0].email,
        event: 'unsubscribed',
        message: {
          headers: {
            'message-id': results.email.getMailGunId.data.emails[0].email.mailgun_id,
          },
        },
      }
    })
    .after(cb)
    .expectStatus(200)
}

const updateStats = cb => {
  return frisby
    .create('Update campaign stats')
    .post('/jobs', {
      name: 'EmailCampaignStats.updateStats',
    })
    .after(cb)
    .expectStatus(200)
}

const get = cb => {
  return frisby
    .create('Get the campaign')
    .get(`/emails/${results.email.schedule.data.id}?associations[]=email_campaign.emails&associations[]=email_campaign.recipients&associations[]=email_campaign_email.email`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        subject: email.subject,
        html: email.html,
        delivered: 1,
        recipients: email.to,
        notifications_enabled: false,
        tags: email.tags
      }
    })
}

const getEmail = cb => {
  const campaign = results.email.get.data

  return frisby
    .create('Get an email from a campaign')
    .get(`/emails/${campaign.id}/emails/${campaign.emails[0].id}?associations[]=email_campaign.emails&associations[]=email_campaign.recipients&associations[]=email_campaign_email.email`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: campaign.emails[0]
    })
}

const expectedCampaigns = () => {
  const updated = results.email.update.data
  const brand = results.email.scheduleBrand.data
  const templated = results.email.scheduleWithTemplate.data

  return [
    {
      subject: templated.subject,
      template: templated.template,
      delivered: 0
    },
    {
      subject: brand.subject,
      html: brand.html,
      sent: 2,
      recipients: [
        {
          recipient_type: 'Brand'
        }
      ]
    },
    {
      subject: updated.subject,
      html: updated.html,
      delivered: 0,
      recipients: [
        {
          email: updated.recipients[0].email
        }
      ]
    },
    {
      subject: email.subject,
      html: email.html,
      delivered: 1,
      recipients: individual.to
    }
  ]
}

const getByBrand = cb => {
  return frisby
    .create('Get campaigns by brand')
    .get(`/brands/${results.brand.create.data.id}/emails/campaigns?associations[]=email_campaign.recipients`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: expectedCampaigns(),
    })
}

const paginateCampaigns = (limit, start) => cb => {
  const qs = [
    'associations[]=email_campaign.recipients',
    `limit=${limit}`,
    `start=${start}`,
    'status=any',
  ].join('&')

  const expected = expectedCampaigns().slice(start, start + limit)

  return frisby
    .create('Paginate campaigns by brand')
    .get(`/brands/${results.brand.create.data.id}/emails/campaigns?${qs}`)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', expected.length)
    .expectJSON('data', expected)
}

const filterScheduledCampaigns = cb => {
  const qs = [
    'associations[]=email_campaign.recipients',
    'status=scheduled',
  ].join('&')

  return frisby
    .create('Filter scheduled campaigns')
    .get(`/brands/${results.brand.create.data.id}/emails/campaigns?${qs}`)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON('data', [omit(scheduledEmail, 'from', 'to', 'due_at')])
}

const filterDraftCampaigns = cb => {
  const qs = [
    'associations[]=email_campaign.recipients',
    'status=draft',
  ].join('&')

  return frisby
    .create('Filter draft campaigns')
    .get(`/brands/${results.brand.create.data.id}/emails/campaigns?${qs}`)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
    .expectJSON('data', [omit(draftEmail, 'from', 'to', 'due_at')])
}

const scheduleIndividual = cb => {
  individual.from = results.authorize.token.data.id

  return frisby
    .create('Schedule an individual email campaign')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .post('/emails/individual', individual)
    .after(cb)
    .expectStatus(200)
}

const scheduleBrand = cb => {
  individual.from = results.authorize.token.data.id

  const c = {
    ...individual,
    tags: ['campaignTag'],
    subject: 'Brand Campaign To {{recipient.email}}',
    to: [
      {
        brand: results.brand.create.data.id,
        recipient_type: 'Brand'
      },
      {
        agent: results.user.upgradeToAgentWithEmail.data.agents[0].id,
        recipient_type: 'Agent'
      }
    ]
  }

  return frisby
    .create('Schedule an individual email campaign with a brand recipient')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .post('/emails/individual', c)
    .after(cb)
    .expectStatus(200)
}

const update = cb => {
  const html = `<div>
  From: {{sender.display_name or "me"}}
  </div>
  <div>
  To: {{recipient.display_name or "there"}}
  </div>`

  const subject = 'Individual Email From {{sender.display_name}}'

  const campaign = {
    id: results.email.scheduleIndividual.data.id,
    ...individual,
    subject,
    html,
    tags: ['updatedCampaignTag'],
    to: [
      {
        email: 'foo@bar.com',
        recipient_type: 'Email'
      }
    ],
    notifications_enabled: false
  }

  return frisby
    .create('Update a campaign')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .put(`/emails/${results.email.scheduleIndividual.data.id}?associations[]=email_campaign.recipients`, campaign)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        subject: campaign.subject,
        html: campaign.html,
        notifications_enabled: false,
        recipients: [
          {
            email: campaign.to[0].email
          }
        ]
      }
    })
}

const scheduleWithTemplate = cb => {
  individual.from = results.authorize.token.data.id

  const c = {
    ...individual,
    html: undefined,
    subject: 'Campaign using a template',
    tags: ['scheduledCampaignTag'],
    template: results.template.instantiate.data.id,
    to: [
      {
        brand: results.brand.create.data.id,
        recipient_type: 'Brand'
      },
      {
        agent: results.user.upgradeToAgentWithEmail.data.agents[0].id,
        recipient_type: 'Agent'
      }
    ]
  }

  return frisby
    .create('Schedule campaign with a template')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .post('/emails/individual', c)
    .after(cb)
    .expectStatus(200)
}


const setIndividualAsTrue = cb => {
  const html = `<div>
  From: {{sender.display_name or "me"}}
  </div>
  <div>
  To: {{recipient.display_name or "there"}}
  </div>`
  const subject = 'Individual Email From {{sender.display_name}}'

  const campaign = {
    id: results.email.scheduleIndividual.data.id,
    ...individual,
    subject,
    html,
    to: [{ email: 'foo@bar.com', recipient_type: 'Email' } ],
    individual: true
  }

  return frisby
    .create('Update campaign\'s individual property as true')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .put(`/emails/${results.email.scheduleIndividual.data.id}?associations[]=email_campaign.recipients`, campaign)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        subject: campaign.subject,
        individual: true
      }
    })
}

const setIndividualAsFalse = cb => {
  const html = `<div>
  From: {{sender.display_name or "me"}}
  </div>
  <div>
  To: {{recipient.display_name or "there"}}
  </div>`
  const subject = 'Individual Email From {{sender.display_name}}'

  const campaign = {
    id: results.email.scheduleIndividual.data.id,
    ...individual,
    subject,
    html,
    to: [{ email: 'foo@bar.com', recipient_type: 'Email' } ],
    individual: false
  }

  return frisby
    .create('Update campaign\'s individual property as false')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .put(`/emails/${results.email.scheduleIndividual.data.id}?associations[]=email_campaign.recipients`, campaign)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        subject: campaign.subject,
        individual: false
      }
    })
}

const setIndividualFailed = cb => {
  const html = ''
  const subject = ''

  const campaign = {
    id: results.email.scheduleIndividual.data.id,
    ...individual,
    subject,
    html,
    to: [{ email: 'foo@bar.com', recipient_type: 'Email' } ],
    individual: 'false'
  }

  return frisby
    .create('Update campaign\'s individual property will be failed!')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .put(`/emails/${results.email.scheduleIndividual.data.id}?associations[]=email_campaign.recipients`, campaign)
    .after(cb)
    .expectStatus(400)
}

const enableDisableNotification = cb => {
  return frisby
    .create('Update campaign\'s notifications_enabled')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .put(`/emails/${results.email.scheduleIndividual.data.id}/notifications`, { status: false })
    .after(cb)
    .expectStatus(200)
}

const checkNotificationEnabled = cb => {
  return frisby
    .create('Check updated notifications_enabled')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .get(`/emails/${results.email.scheduleIndividual.data.id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        notifications_enabled: false
      }
    })
}

const remove = cb => {
  return frisby
    .create('delete a campaign')
    .delete(`/emails/${results.email.scheduleIndividual.data.id}`)
    .after(cb)
    .expectStatus(204)
}


const uploadAttachment = (cb) => {
  const logo = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  return frisby.create('upload a file')
    .post('/emails/attachments?origin=gmail', {
      file: logo
    },
    {
      json: false,
      form: true
    })
    .addHeader('content-type', 'multipart/form-data')
    .after((err, res, body) => {
      cb(err, {...res, body: JSON.parse(body)}, body)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

const scheduleGmailMessage = cb => {
  const due_at = new Date().getTime() - 10 * 60 * 1000

  const emailObj = {
    to: [{
      email: 'recipient@rechat.com',
      recipient_type: 'Email'
    }],
    cc: [{
      recipient_type: 'Email',
      email: 'chavoshi.mohsen@gmail.com'
    }],
    bcc: [{
      recipient_type: 'Email',
      email: 'saeed@rechat.com'
    }],
    due_at: new Date(due_at),
    html: '<div>Hi</div>',
    subject: 'schedule gmail message',
    from: results.google.getGoogleProfile.data.user,
    google_credential: results.google.getGoogleProfile.data.id,
    microsoft_credential: null,
    attachments: [],
    headers: {}
  }

  return frisby
    .create('Schedule a gmail campaign')
    .addHeader('X-RECHAT-BRAND', results.google.getGoogleProfile.data.brand)
    .post('/emails', emailObj)
    .after(cb)
    .expectStatus(200)
}

const scheduleOutlookMessage = cb => {
  const emailObj = {
    to: [
      {
        email: 'recipient@rechat.com',
        recipient_type: 'Email'
      },
    ],
    due_at: new Date(),
    html: '<div>Hi</div>',
    subject: 'schedule outlook message',
    from: results.microsoft.getMicrosoftProfile.data.user,
    google_credential: null,
    microsoft_credential: results.microsoft.getMicrosoftProfile.data.id,
    attachments: [],
    headers: {}
  }

  return frisby
    .create('Schedule an outlook campaign')
    .addHeader('X-RECHAT-BRAND', results.microsoft.getMicrosoftProfile.data.brand)
    .post('/emails', emailObj)
    .after(cb)
    .expectStatus(200)
}

const scheduleReplyToGmailMessage = cb => {
  const emailObj = {
    to: [{
      email: 'recipient@rechat.com',
      recipient_type: 'Email'
    }],
    cc: [{
      recipient_type: 'Email',
      email: 'chavoshi.mohsen@gmail.com'
    }],
    bcc: [{
      recipient_type: 'Email',
      email: 'saeed@rechat.com'
    }],
    due_at: new Date(),
    html: '<div>Hi</div>',
    subject: 'schedule reply to gmail message',
    from: results.google.getGoogleProfile.data.user,
    google_credential: results.google.getGoogleProfile.data.id,
    microsoft_credential: null,
    attachments: [],
    headers: {
      in_reply_to: 'in_reply_to_id',
      thread_id: 'thread_id'
    }
  }

  return frisby
    .create('Schedule a reply to a gmail message')
    .addHeader('X-RECHAT-BRAND', results.google.getGoogleProfile.data.brand)
    .post('/emails', emailObj)
    .after(cb)
    .expectStatus(200)
}

const scheduleReplyToOulookMessage = cb => {
  const emailObj = {
    to: [
      {
        email: 'recipient@rechat.com',
        recipient_type: 'Email'
      },
    ],
    due_at: new Date(),
    html: '<div>Hi</div>',
    subject: 'schedule reply to outlook message',
    from: results.microsoft.getMicrosoftProfile.data.user,
    google_credential: null,
    microsoft_credential: results.microsoft.getMicrosoftProfile.data.id,
    attachments: [],
    headers: {
      message_id: 'message_id'
    }
  }

  return frisby
    .create('Schedule a reply to an outlook message')
    .addHeader('X-RECHAT-BRAND', results.microsoft.getMicrosoftProfile.data.brand)
    .post('/emails', emailObj)
    .after(cb)
    .expectStatus(200)
}

const scheduleEmailWithAttachments = cb => {
  const emailObj = {
    to: [{
      email: 'recipient@rechat.com',
      recipient_type: 'Email'
    }],
    cc: [{
      recipient_type: 'Email',
      email: 'chavoshi.mohsen@gmail.com'
    }],
    bcc: [{
      recipient_type: 'Email',
      email: 'saeed@rechat.com'
    }],
    due_at: new Date(),
    html: '<div>Hi</div>',
    subject: 'Email Subject',
    from: results.google.getGoogleProfile.data.user,
    google_credential: results.google.getGoogleProfile.data.id,
    microsoft_credential: null,
    attachments: [
      {
        file: results.email.uploadAttachment.data.id,
        is_inline: true,
        content_id: 'content_id'
      },
      {
        url: results.email.uploadAttachment.data.url,
        is_inline: true,
        name: 'custom_name.jpg',
        content_id: 'content_id'
      }
    ],
    headers: {
      in_reply_to: 'in_reply_to_id',
      thread_id: 'thread_id'
    }
  }

  return frisby
    .create('Schedule a gmail message with attachments')
    .addHeader('X-RECHAT-BRAND', results.google.getGoogleProfile.data.brand)
    .post('/emails', emailObj)
    .after(cb)
    .expectStatus(200)
}

const getGmailCampaign = cb => {
  return frisby
    .create('Get a gmail campaign')
    .get(`/emails/${results.email.scheduleGmailMessage.data.id}?associations[]=email_campaign.emails&associations[]=email_campaign.recipients&associations[]=email_campaign.attachments`)
    .after(cb)
    .expectStatus(200)
}

const getGmailMessage = cb => {
  return frisby
    .create('Get a gmail message')
    .get(`/emails/${results.email.scheduleGmailMessage.data.id}?associations[]=email_campaign.emails&associations[]=email_campaign.recipients`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        subject: results.email.scheduleGmailMessage.data.subject,
        html: results.email.scheduleGmailMessage.data.html,
        recipients: results.email.scheduleGmailMessage.data.to
      }
    })
}

const getOulookCampaign = cb => {
  return frisby
    .create('Get an outlook campaign')
    .get(`/emails/${results.email.scheduleReplyToOulookMessage.data.id}?associations[]=email_campaign.emails&associations[]=email_campaign.recipients`)
    .after(cb)
    .expectStatus(200)
}

const removeAttachments = cb => {
  const campaign = {
    id: results.email.scheduleEmailWithAttachments.data.id,
    subject: 'Individual Email From {{sender.display_name}}',
    html: 'html',
    attachments: []
  }

  return frisby
    .create('Remove attachments')
    .addHeader('X-RECHAT-BRAND', results.google.getGoogleProfile.data.brand)
    .put(`/emails/${results.email.scheduleEmailWithAttachments.data.id}?associations[]=email_campaign.attachments`, campaign)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        attachments: null
      }
    })
}

const getCampaignAfterRemovingAttachments = cb => {
  return frisby
    .create('Get campaign after removing attachments')
    .get(`/emails/${results.email.scheduleEmailWithAttachments.data.id}?associations[]=email_campaign.emails&associations[]=email_campaign.recipients&associations[]=email_campaign.attachments`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        attachments: null
      }
    })
}

const updateGmailToMailgun = cb => {
  const html = '<div>updated</div>'
  const subject = 'Individual Email From {{sender.display_name}}'

  const campaign = {
    subject,
    html,
    google_credential: null,
    microsoft_credential: null
  }

  return frisby
    .create('Update a Gmail campaign to Mailgin')
    .addHeader('X-RECHAT-BRAND', results.google.getGoogleProfile.data.brand)
    .put(`/emails/${results.email.scheduleGmailMessage.data.id}?associations[]=email_campaign.recipients`, campaign)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        subject: campaign.subject,
        html: campaign.html,
        google_credential: null,
        microsoft_credential: null
      }
    })
}

const updateOutlookToMailgun = cb => {
  const html = '<div>updated</div>'
  const subject = 'Individual Email From {{sender.display_name}}'

  const campaign = {
    subject,
    html,
    google_credential: null,
    microsoft_credential: null
  }

  return frisby
    .create('Update a Outlook campaign to Mailgin')
    .addHeader('X-RECHAT-BRAND', results.microsoft.getMicrosoftProfile.data.brand)
    .put(`/emails/${results.email.scheduleOutlookMessage.data.id}?associations[]=email_campaign.recipients`, campaign)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        subject: campaign.subject,
        html: campaign.html,
        google_credential: null,
        microsoft_credential: null
      }
    })
}

const scheduleTempMailGunCampaign = cb => {
  const emailObj = {
    to: [{
      email: 'recipient@rechat.com',
      recipient_type: 'Email'
    }],
    cc: [{
      recipient_type: 'Email',
      email: 'chavoshi.mohsen@gmail.com'
    }],
    bcc: [{
      recipient_type: 'Email',
      email: 'saeed@rechat.com'
    }],
    due_at: new Date(),
    html: '<div>Hi</div>',
    subject: 'schedule gmail message',
    from: results.google.getGoogleProfile.data.user,
    google_credential: null,
    microsoft_credential: null,
    attachments: [],
    headers: {}
  }

  return frisby
    .create('Schedule a temp Mailgun campaign')
    .addHeader('X-RECHAT-BRAND', results.google.getGoogleProfile.data.brand)
    .post('/emails', emailObj)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        google_credential: null,
        microsoft_credential: null
      }
    })
}

const updateMailgunToGmail = cb => {
  const campaign = {
    html: '<div>Hi</div>',
    subject: 'schedule gmail message',
    from: results.email.scheduleTempMailGunCampaign.data.created_by,
    google_credential: results.google.getGoogleProfile.data.id,
    microsoft_credential: null
  }

  return frisby
    .create('Update a Gmail campaign to Mailgin')
    .addHeader('X-RECHAT-BRAND', results.google.getGoogleProfile.data.brand)
    .put(`/emails/${results.email.scheduleTempMailGunCampaign.data.id}?associations[]=email_campaign.recipients`, campaign)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        google_credential: campaign.google_credential,
        microsoft_credential: null
      }
    })
}

function getThread(cb) {
  const assoc = '?associations=email_thread.messages&select=google_message.html_body&select=microsoft_message.html_body&select=email.html&select=email.text'

  return frisby.create('Get email thread')
    .get(`/emails/threads/${results.email.getGmailMessage.data.thread_key}${assoc}`)
    .addHeader('X-RECHAT-BRAND', results.google.getGoogleProfile.data.brand)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectJSON({
      code: 'OK',
      data: {
        id: results.email.getGmailMessage.data.thread_key,
        brand: results.google.getGoogleProfile.data.brand,
        google_credential: results.google.getGoogleProfile.data.id,
        microsoft_credential: results.email.getGmailMessage.data.microsoft_credential,
        subject: results.email.getGmailMessage.data.subject,
        message_count: 1,
        type: 'email_thread'
      }
    })
}

function updateIsRead(cb) {
  return frisby.create('Update isRead')
    .put(`/emails/google/${results.google.createGoogleCredential}/messages/${results.email.getThread.data.messages[0].id}`, { status: false })
    .addHeader('X-RECHAT-BRAND', results.email.getThread.data.brand)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(202)
}

function batchUpdateIsRead(cb) {
  return frisby.create('Batch update isRead')
    .put(`/emails/google/${results.google.createGoogleCredential}/messages`, { status: false, messageIds: [results.email.getThread.data.messages[0].id] })
    .addHeader('X-RECHAT-BRAND', results.email.getThread.data.brand)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(202)
}

function batchTrash(cb) {
  return frisby.create('Batch trash')
    .post(`/emails/google/${results.google.createGoogleCredential}/trash`, { status: false, messageIds: [results.email.getThread.data.messages[0].id] })
    .addHeader('X-RECHAT-BRAND', results.email.getThread.data.brand)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(202)
}

function batchArchive(cb) {
  return frisby.create('Batch archive')
    .post(`/emails/google/${results.google.createGoogleCredential}/archive`, { status: false, messageIds: [results.email.getThread.data.messages[0].id] })
    .addHeader('X-RECHAT-BRAND', results.email.getThread.data.brand)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(202)
}

function syncThreadsByContact(cb) {
  return frisby.create('Send request to sync threads')
    .post('/emails/threads', { contact_address: 'contact_address@domain.com' })
    .addHeader('X-RECHAT-BRAND', results.google.getGoogleProfile.data.brand)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
}

function openEmail(cb) {
  const campaign = results.email.get.data
  const emailId = campaign.emails[0].email.id
  const enc = Crypto.encrypt(JSON.stringify({ email: emailId, origin: 'gmail' }))
  return (
    frisby
      .create('create the request to visit the email')
      .get(`/emails/events/${encodeURIComponent(enc)}`)
      .addHeader('x-handle-jobs', 'yes')
      .after(cb)
      .addHeader('X-Forwarded-For', '13.74.137.176')  // codeTwoIP
      .expectStatus(200)
  )
}

const openEmailUpdateStats = cb => {
  return frisby.create('update email status')
    .post('/poll', { name: 'EmailCampaign.updateStats' })
    .after(cb)
    .expectStatus(204)
}


const checkEmailAfterVisitingByBlackListIps = (cb) => {
  const campaign = results.email.get.data

  return frisby
    .create('email should not be opened if the request comes from the blackList servers')
    .get(`/emails/${campaign.id}/emails/${campaign.emails[0].id}?associations[]=email_campaign.emails&associations[]=email_campaign.recipients&associations[]=email_campaign_email.email`)
    .after(function (err, res, json) {
      if (json.data.email.opened) {
        throw 'Email should not be opened with the blackList IPs'
      }
      cb(err, res, json)
    })
    .expectStatus(200)
}

module.exports = {
  schedule,
  scheduleIndividual,
  scheduleBrand,
  scheduleWithTemplate,
  update,
  setIndividualAsTrue,
  setIndividualAsFalse,
  setIndividualFailed,
  enableDisableNotification,
  checkNotificationEnabled,
  sendDue,
  getMailGunId,
  addEvent,
  unsubscribe,
  updateStats,
  get,
  getEmail,
  getByBrand,
  paginateCampaigns: paginateCampaigns(2, 2),
  createScheduled,
  filterScheduledCampaigns,
  createDraft,
  filterDraftCampaigns,
  remove,
  uploadAttachment,
  scheduleGmailMessage,
  scheduleOutlookMessage,
  scheduleReplyToGmailMessage,
  scheduleReplyToOulookMessage,
  scheduleEmailWithAttachments,
  getGmailCampaign,
  sendDueGmailOutlook: sendDue,
  getGmailMessage,
  getOulookCampaign,
  removeAttachments,
  getCampaignAfterRemovingAttachments,
  updateGmailToMailgun,
  updateOutlookToMailgun,
  scheduleTempMailGunCampaign,
  updateMailgunToGmail,
  getThread,
  updateIsRead,
  batchUpdateIsRead,
  batchTrash,
  batchArchive,
  syncThreadsByContact,
  openEmail,
  openEmailUpdateStats,
  checkEmailAfterVisitingByBlackListIps
}
