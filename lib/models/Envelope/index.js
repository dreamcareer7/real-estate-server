const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const async = require('async')
const config = require('../../config.js')
const parser = new (require('xml2js').Parser)
const EventEmitter = require('events').EventEmitter
const request = require('request')
const promisify = require('../../utils/promisify')
const _ = require('underscore')
const extractMetadata = require('./extract-metadata')

if (process.env.NODE_ENV === 'tests')
  require('./mock.js')

Envelope = new EventEmitter

Orm.register('envelope', 'Envelope')

EnvelopeRecipient = {}
EnvelopeRecipient.CARBON_COPY = 'CarbonCopy'
EnvelopeRecipient.SIGNER = 'Signer'

Orm.register('envelope_recipient', 'EnvelopeRecipient')

EnvelopeDocument = {}

EnvelopeDocument.get = (id, cb) => {
  EnvelopeDocument.getAll([id], (err, documents) => {
    if(err)
      return cb(err)

    if (documents.length < 1)
      return cb(Error.ResourceNotFound('Envelope document' + id + ' not found'))

    const document = documents[0]

    return cb(null, document)
  })
}

EnvelopeDocument.getAll = (document_ids, cb) => {
  db.query('envelope/document/get', [document_ids], (err, res) => {
    if (err)
      return cb(err)

    const documents = res.rows

    return cb(null, documents)
  })
}


Orm.register('envelope_document', 'EnvelopeDocument')

const schema = {
  type: 'object',

  title: {
    type: 'string',
    required: true
  },

  body: {
    type: ['string', 'null'],
    required: false
  },

  submissions: {
    type: 'array',
    uuid: true,
    required: false
  },

  created_by: {
    type: 'string',
    uuid: true,
    required: true
  }
}

const validate = validator.bind(null, schema)

const headers = {
//   'X-DocuSign-Authentication': JSON.stringify({
//     'IntegratorKey': config.docusign.integrator_key
//   })
}

const fixStatus = status => {
  return (status.charAt(0).toUpperCase() + status.slice(1))
}

Envelope.get = function (id, cb) {
  Envelope.getAll([id], (err, envelopes) => {
    if(err)
      return cb(err)

    if (envelopes.length < 1)
      return cb(Error.ResourceNotFound('Envelope ' + id + ' not found'))

    const envelope = envelopes[0]

    cb(null, envelope)
  })
}

Envelope.getAll = function(envelope_ids, cb) {
  db.query('envelope/get', [envelope_ids], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

const update = (data, cb) => {
  db.query('envelope/update', [
    data.docusign_id,
    fixStatus(data.status),
    data.title,
    data.id
  ], cb)
}

const permissionError = Error.create.bind(null, {
  http: 412,
  message: 'Invalid docusign authorization',
  code: 'DocusignAuthenticationRequired'
})

const getUserInfo = (user_id, cb) => {
  db.query('envelope/user/get', [user_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(permissionError())

    cb(null, res.rows[0])
  })
}

const fetchTokens = (form, cb) => {
  const auth = config.docusign.integrator_key + ':' + config.docusign.secret_key

  const headers = {
    Authorization: 'Basic ' + (new Buffer(auth).toString('base64'))
  }

  const params = {
    uri: `${config.docusign.baseurl}/oauth/token`,
    method: 'POST',
    headers,
    form,
    json: true
  }

  request(params, (err, res, body) => {
    if (err || res.statusCode !== 200)
      return cb(Error.Generic(err || body))

    cb(null, body)
  })
}

const getLoginInfo = (user_id, token, cb) => {
  const headers = {
    Authorization: 'Bearer ' + token
  }
  const params = {
    uri: `${config.docusign.baseurl}/oauth/userinfo`,
    headers,
    json: true
  }

  request(params, (err, res, body) => {
    if (err || res.statusCode !== 200)
      return cb(Error.Generic(err || body))

    cb(null, body)
  })
}

const saveUser = ({user_id, access_token, refresh_token, account_id, base_url}, cb) => {
  db.query('envelope/user/insert', [
    user_id,
    access_token,
    refresh_token,
    account_id,
    base_url,
  ], cb)
}

Envelope.saveUserInfo = (user_id, code, cb) => {
  fetchTokens({
    code,
    grant_type: 'authorization_code'
  }, (err, tokens) => {
    if (err)
      return cb(err)

    getLoginInfo(user_id, tokens.access_token, (err, info) => {
      if (err)
        return cb(err)

      saveUser({
        user_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        account_id: info.accounts[0].account_id,
        base_url: info.accounts[0].base_uri,
      }, cb)
    })
  })
}

const docusignRequest = (user_id, r, cb) => {
  getUserInfo(user_id, (err, info) => {

    const refreshTokenAndRetry = () => {
      fetchTokens({
        grant_type: 'refresh_token',
        refresh_token: info.refresh_token
      }, (err, tokens) => {
        if (err)
          return cb(permissionError())

        saveUser({
          user_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          account_id: info.account_id,
          base_url: info.base_url,
        }, err => {
          if (err)
            return cb(err)

          r.headers.Authorization = 'Bearer ' + tokens.access_token

          request(r, (err, res, body) => { //Retry with the newly acquired token.
            if (res.statusCode >= 400 && res.statusCode <= 499) {
              console.log('Docusign request failed', res.statusCode, body.toString())
              return cb(Error.BadRequest({
                message: body.message
              }))
            }

            cb(err, res, body)
          })
        })
      })
    }

    if (err)
      return cb(err)

    r.uri = `${info.base_url}/restapi/v2/accounts/${info.account_id}${r.uri}`

    if (!r.headers)
      r.headers = {}

    r.headers.Authorization = 'Bearer ' + info.access_token

    request(r, (err, res, body) => {
      if (err)
        return cb(err)

      // If its a 401, we should refresh the token and try again.
      // Otherwise, none of this wrapper's business
      if (res.statusCode === 401)
        return refreshTokenAndRetry()

      Context.log('Docusign authorization error', res.statusCode, body.message)

      if (res.statusCode >= 400 && res.statusCode <= 499) {
        return cb(Error.BadRequest({
          message: body.message
        }))
      }

      return cb(err, res, body)
    })
  })
}

Envelope.create = function (envelope, cb) {
  const insert = cb => {
    db.query('envelope/insert', [
      envelope.created_by,
      envelope.deal,
      envelope.auto_notify === null ? true : envelope.auto_notify
    ], cb)
  }

  const addRecipient = (envelope_id, rec, cb) => {
    db.query('envelope/recipient/add', [
      envelope_id,
      rec.role,
      typeof(rec.order) === 'number' ? rec.order : 1,
      rec.envelope_recipient_type
    ], (err, res) => {
      if (err)
        return cb(err)

      return cb(null, {
        id: res.rows[0].id,
        order: res.rows[0].order,
        role: rec.role,
        envelope_recipient_type: rec.envelope_recipient_type
      })
    })
  }

  const addRecipients = (cb, results) => {
    async.map(envelope.recipients, addRecipient.bind(null, results.insert.rows[0].id), cb)
  }

  const getRevision = (id, cb) => {
    Form.getRevision(id).nodeify(cb)
  }

  const getSubmissions = (cb, results) => {
    const submissions = envelope.documents
      .filter(doc => Boolean(doc.revision)) //Filter the documents that are not form revisions.
      .map(doc => doc.revision)

    async.map(submissions, getRevision, cb)
  }

  const getFiles = (cb, results) => {
    const files = envelope.documents
      .filter(doc => Boolean(doc.file)) //Filter the documents that are not files.
      .map(doc => doc.file)

    AttachedFile.getAll(files).nodeify(cb)
  }

  const pdfs = {}

  const loadSubmissionPdf = (rev, cb) => {
    AttachedFile.download(rev.file, (err, buffer) => {
      if (err)
        return cb(err)

      pdfs[rev.id] = buffer
      cb()
    })
  }

  const loadFilePdf = (file, cb) => {
    AttachedFile.download(file.id, (err, buffer) => {
      if (err)
        return cb(err)

      pdfs[file.id] = buffer
      cb()
    })
  }

  const loadPdfs = (cb, results) => {
    async.parallel([
      cb => async.forEach(results.submissions, loadSubmissionPdf, cb),
      cb => async.forEach(results.files, loadFilePdf, cb)
    ], cb)
  }

  const _loadAssignments = async submissions => {

    const assignments = {}

    for (const submission of submissions) {
      const pdf = pdfs[submission.id]
      const document_assignments = await extractMetadata(pdf)

      assignments[submission.id] = document_assignments
    }


    return assignments
  }

  const loadAssignments = (cb, results) => {
    _loadAssignments(results.submissions).nodeify(cb)
  }

  const loadForm = (rev, cb) => {
    Form.get(rev.form).nodeify((err, form) => {
      if (err)
        return cb(err)

      rev.form = form
      cb()
    })
  }

  const loadForms = (cb, results) => {
    async.forEach(results.submissions, loadForm, cb)
  }

  const addDocument = (document, cb) => {
    db.query('envelope/document/add', [
      document.envelope_id,
      document.title,
      document.document_id,
      document.submission,
      document.file
    ], cb)
  }

  const addDocuments = (cb, results) => {
    const submissions = _.indexBy(results.submissions, 'id')
    const files = _.indexBy(results.files, 'id')

    const documents = []

    const prepareSubmissionDocument = d => {
      const submission = submissions[d.revision]

      const document = {}
      document.title = submission.form.name + '.pdf'
      document.submission = submission.id

      return document
    }

    const prepareFileDocument = d => {
      const file = files[d.file]

      const document = {}
      document.title = file.name
      document.file = file.id

      return document
    }

    envelope.documents.forEach((d, i) => {
      let document

      if (d.file)
        document = prepareFileDocument(d)

      if (d.revision)
        document = prepareSubmissionDocument(d)

      document.document_id = i + 1
      document.envelope_id = results.insert.rows[0].id
      documents.push(document)
    })

    async.map(documents, addDocument, (err, res) => {
      if (err)
        return cb(err)

      cb(null, res.map(r => r.rows[0]))
    })
  }

  const docusign = async (cb, results) => {
    const params = {
      method: 'POST',
      uri: '/envelopes',
      body: {
        emailSubject: envelope.title,
        emailSettings: {
          replyEmailAddressOverride: results.user.email,
          replyEmailNameOverride: results.user.display_name
        },
        documents: [],
        status: 'Created',
        recipients: {
          signers: [],
          carbonCopies: []
        },
        eventNotification: {
          url: Url.api({
            uri: `/envelopes/${results.insert.rows[0].id}/hook`,
            query: {
              token: results.insert.rows[0].webhook_token
            }
          }),
          requireAcknowledgment: true,
          recipientEvents: [
            {recipientEventStatusCode: 'Sent'},
            {recipientEventStatusCode: 'Delivered'},
            {recipientEventStatusCode: 'Completed'},
            {recipientEventStatusCode: 'Declined'},
            {recipientEventStatusCode: 'AuthenticationFailed'},
            {recipientEventStatusCode: 'AutoResponded'}
          ],
          envelopeEvents: [{
            envelopeEventStatusCode: 'Voided',
          }]
        }
      },
      json: true
    }

    if (envelope.body)
      params.body.emailBlurb = envelope.body

    results.documents.forEach(document => {
      const pdf = document.submission_revision ? pdfs[document.submission_revision] : pdfs[document.file]

      const doc = {
        documentId: document.document_id,
        name: document.title,
        documentBase64: pdf.toString('base64')
      }
      params.body.documents.push(doc)
    })

    const roles_counts = {}

    const promises = results.recipients.map((async recipient => {
      const r = await DealRole.get(recipient.role)

      if (!r.email)
        throw new Error.Validation(`Role ${r.id} has no email defined`)

      if (roles_counts[r.role] === undefined)
        roles_counts[r.role] = -1

      roles_counts[r.role]++

      const signer = {
        email: r.email,
        name: r.legal_full_name,
        recipientId: recipient.id,
        customFields: [recipient.id],
        routingOrder: recipient.order,
        /*
         * If null, docusign will send him an email.
         * Otherwise, signer will be an embedded one.
         *
         * Apparently this feature is not enabled for all their plans.
         * Therefore we're disabling it for now.
         *
         clientUserId: r.user === envelope.created_by ? r.user : null,
         */
        tabs: {
          signHereTabs: [],
          dateSignedTabs: [],
          initialHereTabs: [],
          checkboxTabs: [],
          radioGroupTabs: [],
          textTabs: []
        }
      }

      if (recipient.envelope_recipient_type === EnvelopeRecipient.CARBON_COPY) {
        delete signer.tabs
        params.body.recipients.carbonCopies.push(signer)
        return
      }

      let id = 0

      results.documents.forEach(document => {
        if (!document.submission_revision)
          return

        const assignments = results.assignments[document.submission_revision]

        for(const item of assignments) {
          const { assignment, rect, page } = item

          if (!Array.isArray(assignment.role))
            continue

          if (!assignment.role.includes(r.role))
            continue

          if (assignment.number !== roles_counts[r.role])
            continue

          const tab = {
            documentId: document.document_id,
            pageNumber: page,
            xPosition: parseInt(rect[0]),
            yPosition: parseInt(rect[1]),
            tabLabel: `tab-${++id}`,
            required: false
          }

          // These magic numbers are offsets specific to SignatureHere and InitialsHere tabs
          // Found them here http://stackoverflow.com/questions/24170573/absolute-coordinate-positioning-of-signhere-tabs

          if (assignment.assignment === 'Signature') {
            tab.yPosition -= 21
            signer.tabs.signHereTabs.push(tab)
          }

          if (assignment.assignment === 'Date')
            signer.tabs.dateSignedTabs.push(tab)

          if (assignment.assignment === 'Initials') {
            tab.yPosition -= 16
            signer.tabs.initialHereTabs.push(tab)
          }

          if (assignment.assignment === 'Checkbox') {
            tab.xPosition -= 10
            tab.yPosition -= 5
            signer.tabs.checkboxTabs.push(tab)
          }


          if (assignment.assignment === 'Textbox') {
            tab.xPosition -= 2
            tab.yPosition -= 3
            tab.width = parseInt(rect[2]) - parseInt(rect[0])
            tab.height = parseInt(rect[3]) - parseInt(rect[1])
            signer.tabs.textTabs.push(tab)
          }
        }
      })

      if (signer.tabs.signHereTabs.length < 1)
        delete signer.tabs.signHereTabs

      if (signer.tabs.dateSignedTabs.length < 1)
        delete signer.tabs.dateSignedTabs

      if (signer.tabs.initialHereTabs.length < 1)
        delete signer.tabs.initialHereTabs

      if (signer.tabs.textTabs.length < 1)
        delete signer.tabs.textTabs

      if (signer.tabs.checkboxTabs.length < 1)
        delete signer.tabs.checkboxTabs

      if (signer.tabs.radioGroupTabs.length < 1)
        delete signer.tabs.radioGroupTabs

      params.body.recipients.signers.push(signer)
    }))

    await Promise.all(promises)

    docusignRequest(envelope.created_by, params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 201) {
        return cb(Error.Generic(body))
      }

      cb(null, body)
    })
  }

  const updateEnvelope = (cb, results) => {
    update({
      id: results.insert.rows[0].id,
      docusign_id: results.docusign.envelopeId,
      status: results.docusign.status,
      title: envelope.title
    }, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Envelope.emit('envelope created', results.insert.rows[0])
    Envelope.get(results.insert.rows[0].id, cb)
  }

  const addActivity = (cb, results) => {
    const formatter = task => {
      const activity = {
        action: 'UserCreatedEnvelopeForTask',
        object_class: 'envelope_activity',
        object: {
          type: 'envelope_activity',
          task,
          envelope
        }
      }

      return activity
    }

    addEnvelopeActivity({
      envelope_id: results.insert.rows[0].id,
      formatter,
      user_id: envelope.created_by,
      set_author: false
    }).nodeify(cb)
  }

  const saveDocuments = async (cb, results) => {
    Envelope.saveDocuments(results.envelope).nodeify(cb)
  }

  async.auto({
    // To make sure that there _is_ an access token, we fetvh the token first.
    // If there isnt, we stop the process right here and ask user to authenticate.
    token: cb => getUserInfo(envelope.created_by, cb),

    deal: cb => Deal.get(envelope.deal, cb),
    validate: cb => validate(envelope, cb),
    insert: ['validate', 'token', insert],
    recipients: ['insert', addRecipients],
    submissions: ['token', getSubmissions],
    files: ['token', getFiles],
    loadPdfs: ['submissions', 'files', loadPdfs],
    assignments: ['loadPdfs', loadAssignments],
    loadForms: ['submissions', loadForms],
    documents: ['submissions', 'loadForms', 'insert', 'files', addDocuments],
    activities: ['documents', addActivity],
    user: cb => User.get(envelope.created_by).nodeify(cb),
    docusign: ['loadPdfs', 'insert', 'recipients', 'loadForms', 'assignments', 'documents', 'user', docusign],
    updateEnvelope: ['docusign', updateEnvelope],
    envelope: ['updateEnvelope', (cb, results) => Envelope.get(results.insert.rows[0].id, cb)],
    saveDocuments: ['envelope', saveDocuments],
  }, done)
}

Envelope.saveDocuments = async envelope => {
  const user = await User.get(envelope.created_by)

  const documents = await promisify(EnvelopeDocument.getAll)(envelope.documents)

  const saveDocument = async document => {
    const pdf = await promisify(Envelope.getDocuments)(envelope.id, document.document_id)

    const saved = await AttachedFile.saveFromBuffer({
      filename: `${document.title}`,
      relations: [
        {
          role: 'Envelope',
          role_id: envelope.id
        },
        {
          role: 'EnvelopeDocument',
          role_id: document.id
        }
      ],
      path: envelope.deal,
      user,
      public: false,
      buffer: pdf
    })

    await db.query.promise('envelope/document/add-revision', [
      document.id,
      saved.id
    ])
  }

  const promises = documents.map(saveDocument)

  await Promise.all(promises)
}

const getRelevantTasks = async envelope_id => {
  const envelope = await promisify(Envelope.get)(envelope_id)
  const documents = await promisify(EnvelopeDocument.getAll)(envelope.documents)

  const envelope_submissions = new Set(documents.map(d => d.submission))
  const envelope_attachments = new Set(documents.map(d => d.file))

  const deal = await promisify(Deal.get)(envelope.deal)

  const checklists = await DealChecklist.getAll(deal.checklists)

  let task_ids = []
  checklists.forEach(c => {
    task_ids = task_ids.concat(c.tasks)
  })

  const tasks = await Task.getAll(task_ids)
  const room_ids = tasks.map(t => t.room)
  const rooms = await promisify(Room.getAll)(room_ids)
  const indexed = _.indexBy(rooms, 'id')

  const relevant = []

  for(const task of tasks) {
    if (task.submission && envelope_submissions.has(task.submission)) {
      relevant.push(task)
      continue
    }

    if (_.intersection(indexed[task.room].attachments, Array.from(envelope_attachments)).length > 0) {
      relevant.push(task)
    }
  }

  return relevant
}

const addEnvelopeActivity = async ({envelope_id, formatter, user_id, deal_role, set_author = true}) => {
  let user

  if (set_author && user)
    user_id = await User.get(user_id)

  const tasks = await getRelevantTasks(envelope_id)

  for(const task of tasks) {
    const activity = formatter(task)

    await promisify(Activity.postToRoom)({
      room_id: task.room,
      activity,
      deal_role,
      user_id,
      set_author: false
    })
  }
}

const updateRecipient = (envelope, deal, recipient, cb) => {
  const issueActivity = (role, cb) => {
    const formatter = task => {
      const activity = {
        action: 'DealRoleReactedToEnvelopeForTask',
        object_class: 'envelope_activity',
        object: {
          type: 'envelope_activity',
          recipient,
          task
        }
      }

      return activity
    }

    addEnvelopeActivity({
      envelope_id: envelope.id,
      formatter,
      deal_role: role.id,
    }).nodeify(cb)
  }

  const issueNotification = (envelope, role, recipient, cb) => {
    if (role.user === envelope.created_by)
      return cb() // Dont send me a notification that I just signed the doc.

    const enabled = [
      'Completed',
      'Declined',
    ]

    if (!enabled.includes(recipient.status))
      return cb()

    Envelope.emit('envelope recipient updated', {
      recipient,
      envelope
    })

    const notification = {}
    notification.action = 'ReactedTo'
    notification.object = envelope.id
    notification.object_class = 'Envelope'
    notification.subject = role.id
    notification.subject_class = 'DealRole'
    notification.auxiliary_subject = recipient.id
    notification.auxiliary_subject_class = 'EnvelopeRecipient'
    notification.auxiliary_object = envelope.deal
    notification.auxiliary_object_class = 'Deal'
    notification.message = `${role.legal_full_name} ${recipient.status} your documents.`
    notification.title = Deal.getStreetAddress(deal)

    Notification.issueForUser(notification, envelope.created_by, cb)
  }

  EnvelopeRecipient.get(recipient.id, (err, old) => {
    if (err)
      return cb(err)

    if (old.status === fixStatus(recipient.status))
      return cb()

    db.query('envelope/recipient/update', [
      recipient.id,
      fixStatus(recipient.status),
      recipient.signed_at
    ], (err, res) => {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return cb(Error.Generic(`Cannot find recipient ${recipient.id} for envelope ${envelope.id}`))

      DealRole.get(res.rows[0].role).nodeify((err, role) => {
        if (err)
          return cb(err)

        issueNotification(envelope, role, recipient, err => {
          if (err)
            return cb(err)

          issueActivity(role, cb)
        })
      })
    })
  })
}

Envelope.updateStatus = (id, xml, cb) => {
  const cleanup = (cb, results) => {
    const status = results.payload.DocuSignEnvelopeInformation.EnvelopeStatus[0]

    const data = {
      envelope_status: status.Status[0],
      recipients: []
    }

    data.recipients = status.RecipientStatuses[0].RecipientStatus
    /*
     * If the recipient is not sent from Rechat,
     * for exampe when he is a CarbonCopy recipient,
     * then there's gonna be no CustomField.
     *
     * Filter them out.
     */
      .filter(rs => (rs.CustomFields[0] && rs.CustomFields[0].CustomField[0]))
      .map(rs => {
        return {
          status: rs.Status[0],
          id: rs.CustomFields[0].CustomField[0],
          signed_at: rs.Signed ? rs.Signed[0] : null,
        }
      })

    cb(null, data)
  }

  const updateStatus = (cb, results) => {
    update({
      id: results.envelope.id,
      docusign_id: results.envelope.docusign_id,
      status: results.data.envelope_status,
      title: results.envelope.title
    }, cb)
  }

  const updateRecipients = (cb, results) => {
    async.forEach(results.data.recipients, updateRecipient.bind(null, results.envelope, results.deal), cb)
  }

  const submitTask = (task, cb) => {
    task.attention_requested = true
    Task.update(task).nodeify(cb)
  }

  const submit = (cb, results) => {
    if (results.data.envelope_status !== 'Completed')
      return cb()

    if (!results.envelope.auto_notify)
      return cb()

    getRelevantTasks(results.envelope.id).nodeify((err, tasks) => {
      if (err)
        return cb(err)

      async.forEach(tasks, submitTask, cb)
    })
  }

  const saveDocuments = (cb, results) => {
    Envelope.saveDocuments(results.envelope).nodeify(cb)
  }

  const issueActivity = (cb, results) => {
    if (results.data.envelope_status !== 'Voided')
      return cb()

    issueVoidActivity(results.envelope).nodeify(cb)
  }

  async.auto({
    envelope: cb => Envelope.get(id, cb),
    deal: ['envelope', (cb, results) => Deal.get(results.envelope.deal, cb)],
    payload: cb => parser.parseString(xml, cb),
    data: ['envelope', 'payload', cleanup],
    status: ['data', updateStatus],
    recipients: ['data', 'deal', updateRecipients],
    documents: ['envelope', saveDocuments],
    activity: ['data', 'envelope', issueActivity],
    submit: ['data', submit]
  }, cb)
}

const issueVoidActivity = async envelope => {
  const formatter = task => {
    const activity = {
      action: 'UserVoidedEnvelopeForTask',
      object_class: 'envelope_activity',
      object: {
        type: 'envelope_activity',
        envelope
      },
    }

    return activity
  }

  return addEnvelopeActivity({
    envelope_id: envelope.id,
    formatter,
    user_id: envelope.created_by,
  })
}

Envelope.update = (id, cb) => {
  const updateRecipients = (cb, results) => {
    const params = {
      uri: `/envelopes/${results.envelope.docusign_id}/recipients`,
      headers,
      json: true
    }

    docusignRequest(results.envelope.created_by, params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Generic(body))

      const recipients = body.signers
        .filter(signer => signer.CustomFields && signer.CustomFields[0])
        .map(signer => {
          return {
            id: signer.customFields[0],
            status: signer.status,
            signed_at: signer.signedDateTime || null
          }
        })

      async.forEach(recipients, updateRecipient.bind(null, results.envelope, results.deal), cb)
    })
  }

  const updateEnvelope = (cb, results) => {
    const params = {
      uri: `/envelopes/${results.envelope.docusign_id}`,
      headers,
      json: true
    }

    docusignRequest(results.envelope.created_by, params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Generic(body))

      update({
        id: results.envelope.id,
        docusign_id: results.envelope.docusign_id,
        status: body.status,
        title: results.envelope.title
      }, cb)
    })
  }

  const updateDocuments = (cb, results) => {
    Envelope.saveDocuments(results.envelope).nodeify(cb)
  }

  async.auto({
    envelope: cb => Envelope.get(id, cb),
    deal: ['envelope', (cb, results) => Deal.get(results.envelope.deal, cb)],
    updateRecipients: ['envelope', 'deal', updateRecipients],
    updateEnvelope: ['envelope', updateEnvelope],
    documents: ['envelope', updateDocuments],
  }, cb)
}

Envelope.getDocuments = (id, doc, cb) => {
  Envelope.get(id, (err, envelope) => {
    if (err)
      return cb(err)

    const params = {
      uri: `/envelopes/${envelope.docusign_id}/documents/${doc}`,
      headers,
      encoding: null
    }

    docusignRequest(envelope.created_by, params, (err, res, body) => {
      if (err || res.statusCode !== 200)
        return cb(Error.Generic(err || body.toString()))

      cb(null, body)
    })
  })
}

Envelope.getSignUrl = ({envelope_id, user, recipient_id}, cb) => {
  const getRecipient = cb => {
    EnvelopeRecipient.get(recipient_id, cb)
  }

  const getRole = (cb, results) => {
    DealRole.get(results.recipient.role).nodeify(cb)
  }

  const getSignUrl = (cb, results) => {
    if (results.role.user !== user.id)
      throw new Error.Forbidden(`${user.id} cannot sign on behalf of ${recipient_id}`)

    const r = results.role

    const params = {
      uri: `/envelopes/${results.envelope.docusign_id}/views/recipient`,
      headers,
      method: 'POST',
      body: {
        authenticationMethod: 'Email',
        clientUserId: r.user,
        email: r.email,
        recipientId: results.recipient.id,
        userName: r.legal_full_name,

        returnUrl: Url.api({
          uri: `/envelopes/${envelope_id}/signed`,
          query: {
            token: results.envelope.webhook_token
          }
        })
      },
      json: true
    }

    docusignRequest(results.envelope.created_by, params, (err, res, body) => {
      if (err || res.statusCode !== 201)
        return cb(Error.Generic(err || body))

      cb(null, body.url)
    })
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.url)
  }

  async.auto({
    envelope: cb => Envelope.get(envelope_id, cb),
    recipient: getRecipient,
    role: ['recipient', getRole],
    url: ['envelope', 'recipient', 'role', getSignUrl]
  }, done)
}

Envelope.getEditUrl = ({envelope_id, user}, cb) => {
  const getEditUrl = (cb, results) => {
    const params = {
      uri: `/envelopes/${results.envelope.docusign_id}/views/edit`,
      headers,
      method: 'POST',
      body: {
        returnUrl: Url.api({
          uri: `/envelopes/${envelope_id}/signed`,
          query: {
            token: results.envelope.webhook_token
          }
        })
      },
      json: true
    }

    docusignRequest(user.id, params, (err, res, body) => {
      if (err || res.statusCode !== 201)
        return cb(Error.Generic(err || body))

      cb(null, body.url)
    })
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.url)
  }

  async.auto({
    envelope: cb => Envelope.get(envelope_id, cb),
    url: ['envelope', getEditUrl]
  }, done)
}

Envelope.getByDeal = (deal_id, cb) => {
  db.query('envelope/get_deal', [
    deal_id
  ], (err, res) => {
    if (err)
      return cb(err)

    Envelope.getAll(res.rows.map(e => e.id), cb)
  })
}


Envelope.void = (envelope_id, cb) => {
  const get = cb => Envelope.get(envelope_id, cb)

  const void_envelope = (cb, results) => {
    const params = {
      uri: `/envelopes/${results.get.docusign_id}`,
      headers,
      method: 'PUT',
      body: {
        status: 'voided',
        voidedReason: 'Envelope voided'
      },
      json: true
    }

    docusignRequest(results.get.created_by, params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Generic(body))

      return cb()
    })
  }

  const update = cb => {
    db.query('envelope/void', [envelope_id], cb)
  }

  const issueActivity = (cb, results) => {
    /*
     * Normally we expect such activities to be recorded
     * when the envelope webhook is called.
     *
     * But due to a bug[0] in docusign
     * when a draft envelope gets voided, no webhook is called.
     *
     * This is to cicumvent that bug.
     *
     * [0] https://stackoverflow.com/questions/54401340/webhook-not-called-on-a-voided-discarded-draft-envelope
     */

    if (results.get.status !== 'Created')
      return cb()

    issueVoidActivity(results.get).nodeify(cb)
  }

  const done = (err) => {
    if (err)
      return cb(err)

    Envelope.get(envelope_id, cb)
  }

  async.auto({
    get,
    void_envelope: ['get', void_envelope],
    update: ['void_envelope', update],
    activity: ['get', issueActivity]
  }, done)
}

Envelope.resend = (envelope_id, cb) => {
  const get = cb => Envelope.get(envelope_id, cb)

  const resend = (cb, results) => {
    const params = {
      uri: `/envelopes/${results.get.docusign_id}?resend_envelope=true`,
      method: 'PUT',
      headers,
      body: {},
      json: true
    }

    docusignRequest(results.get.created_by, params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Generic(body))

      return cb()
    })
  }

  const done = (err) => {
    if (err)
      return cb(err)

    Envelope.get(envelope_id, cb)
  }

  async.auto({
    get,
    resend: ['get', resend],
  }, done)
}
Envelope.associations = {
  recipients: {
    collection: true,
    model: 'EnvelopeRecipient'
  },

  documents: {
    collection: true,
    model: 'EnvelopeDocument'
  }
}

Envelope.publicize = (envelope) => {
  if (process.env.NODE_ENV === 'tests') // Test suite needs the webhook_token :(
    return

  delete envelope.webhook_token
}

EnvelopeRecipient.get = (id, cb) => {
  EnvelopeRecipient.getAll([id], (err, recipients) => {
    if(err)
      return cb(err)

    if (recipients.length < 1)
      return cb(Error.ResourceNotFound('Envelope recipient' + id + ' not found'))

    const recipient = recipients[0]

    return cb(null, recipient)
  })
}

EnvelopeRecipient.getAll = (recipient_ids, cb) => {
  db.query('envelope/recipient/get', [recipient_ids], (err, res) => {
    if (err)
      return cb(err)

    const recipients = res.rows

    return cb(null, recipients)
  })
}


EnvelopeRecipient.associations = {
  role: {
    model: 'DealRole'
  }
}

EnvelopeDocument.associations = {
  pdf: {
    model: 'AttachedFile',
    optional: true
  }
}

module.exports = function () {}
