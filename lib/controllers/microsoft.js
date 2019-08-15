const am     = require('../utils/async_middleware.js')
const expect = require('../utils/validator').expect

const Brand                = require('../models/Brand')
const MicrosoftAuthLink    = require('../models/Microsoft/auth_link')
const MicrosoftCredential  = require('../models/Microsoft/credential')
const MicrosoftMessage     = require('../models/Microsoft/message')
const MicrosoftSyncHistory = require('../models/Microsoft/sync_history')

const { getMGraphClient } = require('../models/Microsoft/plugin/client.js')



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

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

const requestMicrosoftAccessTest = async function (req, res) {
  const redirect = 'http://localhost:3078/dashboard/contacts?letter&s=0'
  const url      = await MicrosoftAuthLink.requestMicrosoftAccess('9fdcdf2a-8e0f-11e9-988e-0a95998482ac', '0237f9a8-8e0f-11e9-9a0e-0a95998482ac', 'https://rechat.com/dashboard')

  return res.json({
    'code': 'OK',
    'data': {
      'url': url,
      'redirect': redirect,
      'type': 'microsoft_auth_link'
    }
  })
}

const requestMicrosoftAccess = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id
  const redirect = req.body.redirect || 'https://rechat.com/dashboard/contacts/'

  const url = await MicrosoftAuthLink.requestMicrosoftAccess(user, brand, redirect)

  return res.json({
    'code': 'OK',
    'data': {
      'url': url,
      'redirect': redirect,
      'type': 'microsoft_auth_link'
    }
  })
}

const grantAccess = async function (req, res) {
  if (req.query.error)
    return res.redirect('https://rechat.com/dashboard')

  if (!req.query.code)
    throw Error.BadRequest('Code is not specified.')

  if (!req.query.state)
    throw Error.BadRequest('State is not specified.')

  const { redirect } = await MicrosoftAuthLink.grantAccess(req.query)

  res.writeHead(302, { 'Location': redirect })
  res.end()
}

const getMicrosoftProfiles = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credentials = await MicrosoftCredential.getByUser(user, brand)

  return res.collection(credentials)
}

const getMicrosoftProfile = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (!req.params.id)
    throw Error.BadRequest('Id is not specified.')

  const credential = await MicrosoftCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  return res.model(credential)
}

const deleteAccount = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await MicrosoftCredential.get(req.params.id)

  if (!credential)
    throw Error.BadRequest('You have not any connected account!')

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  if (credential.revoked)
    return res.model(credential)

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  await MicrosoftCredential.disableEnableSync(credential.id, 'disable')

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const disableEnableSync = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await MicrosoftCredential.get(req.params.id)

  if (!credential)
    throw Error.BadRequest('You have not any connected account!')

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  if (credential.revoked)
    return res.model(credential)

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  let action = 'enable'

  if ( req.method.toLowerCase() === 'delete' )
    action = 'disable'

  await MicrosoftCredential.disableEnableSync(credential.id, action)

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const forceSync = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await MicrosoftCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  if ( credential.revoked )
    throw Error.BadRequest('Your Microsoft-Account is already revoked!')

  await MicrosoftCredential.forceSync(credential.id)

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const getGCredentialLastSyncHistory = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const microsoft_credential_id = req.params.id

  const history = await MicrosoftSyncHistory.getMCredentialLastSyncHistory(user, brand, microsoft_credential_id)

  if ( history.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( history.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  return res.model(history)
}

const getThread = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  expect(req.params.mcid).to.be.uuid

  const credential = await MicrosoftCredential.get(req.params.mcid)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  // const messages = await MicrosoftMessage.getThread(credential.id, req.params.tid)
  // const firstMessage = messages[0]
}


const batchGetMessages = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const messageIds = req.body.messageIds

  if ( !req.body.messageIds )
    throw Error.BadRequest('Invalid messageIds!')

  if ( req.body.messageIds.length === 0 )
    throw Error.BadRequest('Invalid messageIds!')

  const credential = await MicrosoftCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')


  const microsoft = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')


  let counter = 1
  const messageIdsMap = {}

  for (const id of messageIds) {
    messageIdsMap[counter ++] = id
  }

  const messages = []

  try {

    do {
      const temp   = messageIds.splice(0,20)
      const result = await microsoft.batchGetMessagesNative(temp)
    
      for (const message of result.responses) {
        messages.push({
          status: message.status,
          id: (message.body.id) ? message.body.id : messageIdsMap[Number(message.id)],
          bodyPreview: (message.body.bodyPreview) ? message.body.bodyPreview : null,
          uniqueBody: (message.body.uniqueBody) ? message.body.uniqueBody.content : null,
          htmlBody: (message.body.body) ? message.body.body.content : null,
          error: (message.body.error) ? ((message.body.error.message) ? message.body.error.message : null) : null
        })
      }
  
    } while ( messageIds.length > 0 )

    return res.json(messages)
  
  } catch (ex) {

    console.log('---- batchGetMessages', ex)

    throw Error.BadRequest('batchGetMessages failed!')
  }
}

const downloadAttachment = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  
  const mcid = req.params.mcid
  const mid  = req.params.mid
  const aid  = req.params.aid

  const credential = await MicrosoftCredential.get(mcid)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')


  const microsoft = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')


  const microsoftMessage = await MicrosoftMessage.get(mid, credential.id)

  if (!microsoftMessage)
    throw Error.ResourceNotFound('Related Google-Message not found!')


  try {

    const attachment = await microsoft.getAttachment(mid, aid)
  
    res.setHeader('Content-disposition', 'attachment; filename=' + attachment.name)
    res.setHeader('Content-type', attachment.contentType)

    return res.send(new Buffer(attachment.contentBytes, 'base64'))

  } catch (ex) {

    if( ex.statusCode === 404 )
      throw Error.ResourceNotFound('Microsoft-Message-Attachment not found!')

    throw Error.BadRequest('downloadAttachment failed!')
  }
}


const batchGetMessagesTest = async function (req, res) {
  const credential = await MicrosoftCredential.get(req.params.id)

  const messageIds = [
    'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEJAADC2sKTjOSNTpsi5KIF1ip6AAC2M97PAAA=',
    'malformed',
    'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEJAADC2sKTjOSNTpsi5KIF1ip6AAC2M97xAAA='

    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEJAADC2sKTjOSNTpsi5KIF1ip6AAC2M97PAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEJAADC2sKTjOSNTpsi5KIF1ip6AAC2M97QAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEJAADC2sKTjOSNTpsi5KIF1ip6AAC2M97RAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEJAADC2sKTjOSNTpsi5KIF1ip6AACuByMgAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEJAADC2sKTjOSNTpsi5KIF1ip6AACuByMhAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEJAADC2sKTjOSNTpsi5KIF1ip6AADC27k7AAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAgormOAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAgormPAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAgormQAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAhyjo-AAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAhyjpAAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAhyjpBAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAALzOcPAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAohM7mAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAohM7nAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAohM7oAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAON1PDAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAUsZPKAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAAx0YE6AAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAB5QsFuAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AABG8qwmAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AABk8O4UAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AABqGOk1AAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AABRCxH8AAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AABRCxH9AAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AABYvy4qAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC2M_alAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC2M_amAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC2M_anAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC2M_aoAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC2M_apAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC9fFx0AAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC9fFx1AAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC9fFx2AAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC9fFxzAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AACEh14eAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AACJgQM8AAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC-mKyMAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC-mKyNAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC-mKyOAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAC_o-TsAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AACq7dLJAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AACuBzqvAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AACuBzqwAAA=',
    // 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AADB8r7WAAA='
  ]

  const microsoft = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

  let counter = 1
  const messageIdsMap = {}

  for (const id of messageIds) {
    messageIdsMap[counter ++] = id
  }

  console.log('messageIdsMap', messageIdsMap)

  const messages = []

  try {
    do {
      const temp   = messageIds.splice(0,20)
      const result = await microsoft.batchGetMessagesNative(temp)
    
      for (const message of result.responses) {
        messages.push({
          status: message.status,
          id: (message.body.id) ? message.body.id : messageIdsMap[Number(message.id)],
          bodyPreview: (message.body.bodyPreview) ? message.body.bodyPreview : null,
          uniqueBody: (message.body.uniqueBody) ? message.body.uniqueBody.content : null,
          htmlBody: (message.body.body) ? message.body.body.content : null,
          error: (message.body.error) ? ((message.body.error.message) ? message.body.error.message : null) : null
        })
      }
  
    } while ( messageIds.length > 0 )

    console.log(messages)
  
  } catch (ex) {

    console.log('---- batchGetMessages', ex)
  }
}

const downloadAttachmentTest = async function (req, res) {
  const mcid = req.params.mcid
  const mid  = req.params.mid
  const aid  = req.params.aid

  const credential = await MicrosoftCredential.get(mcid)

  const microsoft = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')


  const microsoftMessage = await MicrosoftMessage.get(mid, credential.id)

  if (!microsoftMessage)
    throw Error.ResourceNotFound('Related Google-Message not found!')


  try {
    const attachment = await microsoft.getAttachment(mid, aid)
  
    res.setHeader('Content-disposition', 'attachment; filename=' + attachment.name)
    res.setHeader('Content-type', attachment.contentType)

    return res.send(new Buffer(attachment.contentBytes, 'base64'))

  } catch (ex) {

    if( ex.statusCode === 404 )
      throw Error.ResourceNotFound('Microsoft-Message-Attachment not found!')

    throw Error.BadRequest('downloadAttachment failed!')
  }
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/microsoft', auth, brandAccess, am(requestMicrosoftAccess))
  app.get('/users/self/microsoft', auth, brandAccess, am(getMicrosoftProfiles))
  app.get('/users/self/microsoft/:id', auth, brandAccess, am(getMicrosoftProfile))

  app.delete('/users/self/microsoft/:id', auth, brandAccess, am(deleteAccount)) // Delete Button On Web-App

  app.delete('/users/self/microsoft/:id/sync', auth, brandAccess, am(disableEnableSync)) // Did not use by Client yet
  app.put('/users/self/microsoft/:id/sync', auth, brandAccess, am(disableEnableSync)) // Did not use by Client yet

  app.post('/users/self/microsoft/:id/sync', auth, brandAccess, am(forceSync))
  app.get('/users/self/microsoft/sync_history/:id', auth, brandAccess, am(getGCredentialLastSyncHistory))
  app.get('/users/self/microsoft/:mcid/thread/:tid/messages', auth, brandAccess, am(getThread))
  app.get('/users/self/microsoft/:mcid/messages/:mid/attachments/:aid', auth, brandAccess, am(downloadAttachment))
  app.post('/users/self/microsoft/:id/messages', auth, brandAccess, am(batchGetMessages))

  app.get('/webhook/microsoft/grant', am(grantAccess))



  // test api
  app.post('/users/test/microsoft', am(requestMicrosoftAccessTest))
  app.post('/users/self/microsoft/:id/messages/test', auth, brandAccess, am(batchGetMessagesTest))
  app.get('/users/self/microsoft/:mcid/messages/:mid/attachments/:aid/test', auth, brandAccess, am(downloadAttachmentTest))
}

module.exports = router