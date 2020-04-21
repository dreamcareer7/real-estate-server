const am          = require('../utils/async_middleware.js')
const Brand       = require('../models/Brand')
const EmailThread = require('../models/Email/thread')

const GoogleCredential    = require('../models/Google/credential')
const GoogleMessage       = require('../models/Google/message')
const MicrosoftCredential = require('../models/Microsoft/credential')
const MicrosoftMessage    = require('../models/Microsoft/message')

const googleCommon    = require('../models/Google/common')
const microsoftCommon = require('../models/Microsoft/common')



function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) {
    throw Error.BadRequest('Brand is not specified.')
  }
  
  return brand.id
}

async function deleteGmailThreads (credentials, threadKeys) {
  try {
    for await ( const credential of credentials ) {
      const messageIds = await GoogleMessage.getByThreadKeys(credential.id, threadKeys)
      await GoogleMessage.batchTrash(credential.id, messageIds)
    }
  } catch (ex) {
    const text = `Gmail-Trash-Failed - Ex: ${ex.message}`
    const msg  = `Gmail-Trash-Failed Ex: ${ex}`
    googleCommon.sendSlackMessage(text, msg)
  }
}

async function deleteOutlookThreads (credentials, threadKeys) {
  try {
    for await ( const credential of credentials ) {
      const messageIds = await MicrosoftMessage.getByThreadKeys(credential.id, threadKeys)
      await MicrosoftMessage.batchTrash(credential, messageIds)
    }
  } catch (ex) {
    const text = `Outlook-Trash-Failed - Ex: ${ex.message}`
    const msg  = `Outlook-Trash-Failed Ex: ${ex}`
    microsoftCommon.sendSlackMessage(text, msg)
  }
}

async function listThreads(req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const is_read = (req.query.is_read === 'true' ? true : (req.query.is_read === 'false' ? false : undefined))
  const has_attachments = (req.query.has_attachments === 'true' ? true : (req.query.has_attachments === 'false' ? false : undefined))
  const start = req.query.start ? parseInt(req.query.start) : 0
  const limit = req.query.limit ? parseInt(req.query.limit) : 50
  const query = req.query.q ? req.query.q : req.body.q

  const filtered_ids = Array.isArray(req.query.ids)
    ? req.query.ids
    : (Array.isArray(req.body.ids)
      ? req.query.ids
      : null)

  const q = { start, limit, ids: filtered_ids, q: query, next: req.body.next || {} }
  if (is_read !== undefined) q.is_read = is_read
  if (has_attachments !== undefined) q.has_attachments = has_attachments

  const { ids, total, next } = await EmailThread.filter(user, brand, q)
  const threads = await EmailThread.getAll(ids)

  if (threads.length === 0) {
    return res.collection([], { next: {} })
  }

  threads[0].total = total
  return res.collection(threads, { next })
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

const getThread = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const authorized = await EmailThread.hasAccess(req.params.id, user, brand)
  if (!authorized)
    throw Error.BadRequest('Access denied to this thread.')

  const thread = await EmailThread.get(req.params.id)

  return res.model(thread)
}

const deleteThreads = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (!req.body.threadKeys) {
    throw Error.Validation('threadKeys must be specified!')
  }

  const threadKeys = req.body.thread_keys

  if ( threadKeys.length === 0 ) {
    return res.status(202).end()
  }

  const gCredentialsIds = await GoogleMessage.getDistinctCredential(threadKeys)
  const mCredentialsIds = await MicrosoftMessage.getDistinctCredential(threadKeys)

  const gCredentials = await GoogleCredential.getAll(gCredentialsIds)
  const mCredentials = await MicrosoftCredential.getAll(mCredentialsIds)

  gCredentials.forEach(credential => {
    googleCommon.checkModifyAccess(credential, user, brand)
  })

  mCredentials.forEach(credential => {
    microsoftCommon.checkModifyAccess(credential, user, brand)
  })

  await deleteGmailThreads(gCredentials, threadKeys)
  await deleteOutlookThreads(mCredentials, threadKeys)

  return res.status(202).end()
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/emails/threads', auth, brandAccess, am(listThreads))
  app.post('/emails/threads/filter', auth, brandAccess, am(listThreads))
  app.get('/emails/threads/:id', auth, brandAccess, am(getThread))
  app.delete('/emails/threads/trash', auth, brandAccess, am(deleteThreads))
}

module.exports = router
