const AWS = require('aws-sdk')

const GoogleCredential = require('./credential')

const { getMockClient, getGoogleClient } = require('./plugin/client.js')
const { syncCalendarEvents } = require('./workers/calendars/events')
// const historyWorker = require('./workers/gmail/history')
// const messageWorker = require('./workers/gmail/message')



const getClient = async (cid) => {
  if ( process.env.NODE_ENV === 'tests' ) {
    return getMockClient()
  }

  const credential = await GoogleCredential.get(cid)

  // if (credential.revoked)
  //   throw Error.BadRequest('Google-Credential is revoked!')

  // if (credential.deleted_at)
  //   throw Error.BadRequest('Google-Credential is deleted!')

  // if (!credential.scope.includes(SCOPE_GMAIL_READONLY))
  //   throw Error.BadRequest('Access is denied! Insufficient permission.')

  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client failed!')

  return google
}


/*
const deleteCalendars = async (data, deletedCalendarIds) => {
  console.log('-------- deletedCalendarIds ==>', deletedCalendarIds)

  const google_event_ids = await GoogleCalendarEvent.getByCalendarIds(data.googleCredential.id, deletedCalendarIds)
  console.log('-------- deleted google_event_ids ==>', google_event_ids)

  const {ids} = await CrmTask.filter(data.googleCredential.user, data.googleCredential.brand, { google_event_ids })
  console.log('-------- deleted crm_tasks ==>', ids)

  await CrmTask.remove(ids, data.googleCredential.user)
}

const updateCalendarsWatcher = async (data) => {
  const toSyncLocalCalendars    = await getToSyncCalendars(data.googleCredential.id)
  const toSyncRemoteCalendarIds = toSyncLocalCalendars.map(record => record.calendar_id)

  // It is possibe that some of the remote calendars are deleted
  // So we call persistRemoteCalendars to update offline calendars and exclude deleted ones.
  const result          = await GoogleCalendar.persistRemoteCalendars(data.googleCredential.id, toSyncRemoteCalendarIds)
  const activeCalendars = await GoogleCalendar.getAll(result.activeCalendarIds)

  await deleteCalendars(data, result.deletedCalendarIds)
}

const watchMailBox = async (google) => {
  await google.watchMailBox()
}

const stopWatchMailBox = async (google) => {
  await google.stopWatchMailBox()
}
*/

const getKmsClient = () => {
  const kms = new AWS.KMS({
    accessKeyId: 'AKIAIWLVJM4U7KHQDDUA',
    secretAccessKey: '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',
    region: 'us-east-1'
  })
  // console.log('---- kms client', kms)

  return kms
}

const setPolicy = async () => {
  const kms = getKmsClient()
  const KeyId = '7fc2efe0-5753-4f54-98f7-10f17e3a7cd4'

  const PolicyName = 'default';
  const Policy = `{
      "Version": "2012-10-17",
      "Id": "custom-policy-2016-12-07",
      "Statement": [
          {
              "Sid": "Enable IAM User Permissions",
              "Effect": "Allow",
              "Principal": {
                  "AWS": "arn:aws:iam::467593642605:user/Dev"
              },
              "Action": "kms:*",
              "Resource": "*"
          }
      ]
  }`
    
  kms.putKeyPolicy({ KeyId, Policy, PolicyName }, (err, data) => {
    console.log('---- putKeyPolicy', err, data)
  })
}

const list = async () => {
  const kms = getKmsClient()
  const KeyId = '7fc2efe0-5753-4f54-98f7-10f17e3a7cd4'

  kms.listKeys({ Limit: 500 }, (err, data) => {
    console.log('---- list', err, data)
  })

  kms.listKeyPolicies({ KeyId }, (err, data) => {
    console.log('---- listKeyPolicies', err, data)
  })
}

const simpleEncryptDecrypt = async (Plaintext) => {
  const kms = getKmsClient()
  const KeyId = '7fc2efe0-5753-4f54-98f7-10f17e3a7cd4'

  kms.encrypt({ KeyId, Plaintext }, (err, data) => {
    if (err) {
      console.log('---- encrypt err', err, err.stack)

    } else {

      console.log('---- encrypt', data)
      console.log('---- encrypt toString', data.CiphertextBlob.toString('base64'))

      kms.decrypt({ CiphertextBlob: data.CiphertextBlob }, (err, data) => {
        if (err) {
          console.log('---- decrypt err', err, err.stack)
    
        } else {

          console.log('---- decrypt', data)
          console.log('---- decrypt', data.Plaintext.toString('utf-8'))
        }
      })
    }
  })
}

function encrypt(buffer) {
  const kms = getKmsClient()

  return new Promise((resolve, reject) => {
    const params = {
      KeyId: '7fc2efe0-5753-4f54-98f7-10f17e3a7cd4',
      Plaintext: buffer
    }
    kms.encrypt(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        console.log('---- encrypt', data)
        resolve(data.CiphertextBlob)
      }
    })
  })
}

function decrypt(buffer) {
  const kms = getKmsClient()

  return new Promise((resolve, reject) => {
    const params = {
      CiphertextBlob: buffer
    }
    kms.decrypt(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        console.log('---- decrypt', data)
        resolve(data.Plaintext)
      }
    })
  })
}

const kms = async () => {

  // list()

  const Plaintext = new Buffer('text-to-decrypt-and-encrypt','utf-8')

  await simpleEncryptDecrypt(Plaintext)
  await simpleEncryptDecrypt(Plaintext)

  // encrypt(Plaintext).then(decrypt).then(plaintext => {
  //   console.log('--- Output:', plaintext.toString('utf-8'))
  // })

  return true
}


const test = async (req, res) => {
  let result = {}

  // const cid = '8edc420b-f9a1-45f9-b726-648ce1a83ced'

  // const google = await getClient(cid)
  // const googleCredential = await GoogleCredential.get(cid)

  // const data = {
  //   googleCredential
  // }

  // result = await updateCalendarsWatcher(data)
  // result = await syncCalendarEvents(google, data)
  // result = await watchMailBox(google)
  // await stopWatchMailBox(google)

  // result = await messageWorker.syncMessages(google, data)
  // result = await historyWorker.partialSync(google, data)

  result = await kms()

  return res.json(result || {})
}

module.exports = {
  test
}