const config  = require('../../../config')
const Context = require('../../Context')
const Slack   = require('../../Slack')

const { deleteByGoogleCredential } = require('../../UsersJob/google')
const { updateStatus, postpone }   = require('../../UsersJob/update')
const { deleteById }               = require('../../UsersJob/delete')
const { lock } = require('../../UsersJob/lock')

const { getGoogleClient } = require('../plugin/client.js')
const { disconnect }      = require('../credential/update')

const fiveXErr = [500, 501, 502, 503, 504]
const channel  = config.google_integration.slack_channel



function sendSlackMsg (userJob, description, ex) {
  const code  = Number(ex.statusCode) || Number(ex.code)
  const emoji = ':skull:'

  let text = `${description} - CID: ${userJob.google_credential} - Code: ${code}`

  if (!fiveXErr.includes(code)) {
    text += ` - Ex.Msg: ${ex.message}`
  }

  Slack.send({ channel, text, emoji })
}

const lockJob = async (userJob) => {
  await lock(userJob.id)
  await updateStatus(userJob.id, 'pending')
}

const reportFailure = async (credential, error) => {
  const emoji = ':skull:'
  const text  = `SyncGoogleCalendar - Job Finished With Failure ${credential.id} - ${credential.email} - ${error}`

  Slack.send({ channel, text, emoji })
}

const postponeJob = async (userJob, ex) => {
  Context.log('Postpone-Google-Job', userJob.google_credential, userJob.job_name, ex.code, ex.statusCode, ex.message, ex.errors)

  let interval = '5 minutes'
  let rateLimitExceeded  = false
  let dailyLimitExceeded = false

  const limitExceededRreasons = ['dailyLimitExceeded', 'userRateLimitExceeded', 'rateLimitExceeded']

  if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {
    interval = '10 minutes'
  }

  if ( ex.errors && ex.errors.length ) {
    if (limitExceededRreasons.includes(ex.errors[0].reason)) {
      rateLimitExceeded = true
    }

    if ( rateLimitExceeded && ex.errors[0].reason === 'dailyLimitExceeded' ) {
      dailyLimitExceeded = true
    }
  }

  if ( ex.statusCode === 429 || ex.code === 429 ) {
    interval = '24 hours' // '30 minutes'
  }

  if ( ex.code === 403 && rateLimitExceeded ) {
    interval = '24 hours' // '60 minutes'

    if (dailyLimitExceeded) {
      interval = '24 hours'
    }
  }

  await postpone(userJob.id, interval)
}

const handleException = async (userJob, description, ex) => {
  delete ex.options
  
  Context.log('handleException', userJob.google_credential, userJob.job_name, description, ex)

  const invalidGrantsCodes = [Number(ex.statusCode), Number(ex.code)]
  const invalidGrantsMsgs  = ['invalid_grant', 'Invalid Credentials']

  let invalidGrant     = false
  let notACalendarUser = false

  const code = Number(ex.statusCode) || Number(ex.code)

  if ( code === 403 ) {
    if(ex.errors.length) {
      const error = ex.errors[0]
      if (error.reason === 'notACalendarUser') {
        notACalendarUser = true
      }
    }
  }

  if ( invalidGrantsCodes.includes(401) || invalidGrantsMsgs.includes(ex.message) ) {
    invalidGrant = true
  }

  if (invalidGrant) {
    sendSlackMsg(userJob, 'Invalid credentials or grant', ex)
    await disconnect(userJob.google_credential)
    await deleteByGoogleCredential(userJob.google_credential)
  } else {

    if (notACalendarUser) {
      sendSlackMsg(userJob, 'The user must be signed up for Google Calendar - Job is deleted', ex)
      await deleteById(userJob.id)

    } else {
      sendSlackMsg(userJob, description, ex)
      await updateStatus(userJob.id, 'failed')
      await postponeJob(userJob, ex)
    }
  }
}

const googleClient = async (credential, userJob) => {
  const google = await getGoogleClient(credential)

  if (!google) {
    Slack.send({ channel, text: `Initiate Google Client Failed - ${credential.id}`, emoji: ':skull:' })
    await updateStatus(userJob.id, 'failed')

    return
  }

  return google
}


module.exports = {
  lockJob,
  reportFailure,
  postpone,
  handleException,
  googleClient
}


/*
  Request additional quota: https://developers.google.com/gmail/api/guides/handle-errors
  invalid_grant => https://blog.timekit.io/google-oauth-invalid-grant-nightmare-and-how-to-fix-it-9f4efaf1da35
  rate limit => https://developers.google.com/gmail/api/v1/reference/quota (ex.statusCode: 429)

  GaxiosError Structure

  {
    response: {
      config: {
        url: 'https://www.googleapis.com/gmail/v1/users/cliles84%40gmail.com/labels',
        method: 'GET',
        paramsSerializer: [Function (anonymous)],
        headers: [Object],
        params: [Object: null prototype] {},
        validateStatus: [Function (anonymous)],
        retry: true,
        responseType: 'json',
        retryConfig: [Object]
      },
      data: { error: [Object] },
      headers: {
        'alt-svc': 'h3-29=":443"; ma=2592000,h3-T051=":443"; ma=2592000,h3-Q050=":443"; ma=2592000,h3-Q046=":443"; ma=2592000,h3-Q043=":443"; ma=2592000,quic=":443"; ma=2592000; v="46,43"',
        'cache-control': 'private',
        connection: 'close',
        'content-encoding': 'gzip',
        'content-type': 'application/json; charset=UTF-8',
        date: 'Wed, 18 Nov 2020 13:24:28 GMT',
        server: 'ESF',
        'transfer-encoding': 'chunked',
        vary: 'Origin, X-Origin, Referer',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'x-xss-protection': '0'
      },
      status: 429,
      statusText: 'Too Many Requests',
      request: {
        responseURL: 'https://www.googleapis.com/gmail/v1/users/cliles84%40gmail.com/labels'
      }
    },
    config: {
      url: 'https://www.googleapis.com/gmail/v1/users/cliles84%40gmail.com/labels',
      method: 'GET',
      paramsSerializer: [Function (anonymous)],
      headers: {
        'x-goog-api-client': 'gdcl/3.2.2 gl-node/14.15.1 auth/5.10.1',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'google-api-nodejs-client/3.2.2 (gzip)',
        Authorization: 'Bearer ya29.A0AfH6SMDjus1RF44Gd-gdit71_Sdri38zv3Ugm9a6i6lZccmPAfRZAQE6ImmgvICcr2aHFW7V2YwnVgFFEo4bH-a9XTNitzuvp05lND2qymeZ1yTjuryKwj2COq5jy3REGKU7JYu9AiV-ik00Nqik5k_VfvSe3Bh1YHgHrGHZfehv7w',
        Accept: 'application/json'
      },
      params: [Object: null prototype] {},
      validateStatus: [Function (anonymous)],
      retry: true,
      responseType: 'json',
      retryConfig: {
        currentRetryAttempt: 3,
        retry: 3,
        httpMethodsToRetry: [Array],
        noResponseRetries: 2,
        statusCodesToRetry: [Array]
      }
    },
    code: 429,
    errors: [
      {
        message: 'User-rate limit exceeded.  Retry after 2020-11-18T13:39:01.547Z',
        domain: 'global',
        reason: 'rateLimitExceeded'
      }
    ]
  }

  {
    response: {
      config: {
        url: 'https://www.googleapis.com/gmail/v1/users/larissa%40rechat.com/messages?includeSpamTrash=false&maxResults=50&pageToken=09569981205055045732',
        method: 'GET',
        paramsSerializer: [Function (anonymous)],
        headers: [Object],
        params: [Object: null prototype],
        validateStatus: [Function (anonymous)],
        retry: true,
        responseType: 'json',
        retryConfig: [Object]
      },
      data: { error: [Object] },
      headers: {
        'alt-svc': 'h3-Q050=":443"; ma=2592000,h3-29=":443"; ma=2592000,h3-T051=":443"; ma=2592000,h3-Q046=":443"; ma=2592000,h3-Q043=":443"; ma=2592000,quic=":443"; ma=2592000; v="46,43"',
        'cache-control': 'private',
        connection: 'close',
        'content-encoding': 'gzip',
        'content-type': 'application/json; charset=UTF-8',
        date: 'Wed, 18 Nov 2020 20:42:54 GMT',
        server: 'ESF',
        'transfer-encoding': 'chunked',
        vary: 'Origin, X-Origin, Referer',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'x-xss-protection': '0'
      },
      status: 403,
      statusText: 'Forbidden',
      request: {
        responseURL: 'https://www.googleapis.com/gmail/v1/users/larissa%40rechat.com/messages?includeSpamTrash=false&maxResults=50&pageToken=09569981205055045732'
      }
    },
    config: {
      url: 'https://www.googleapis.com/gmail/v1/users/larissa%40rechat.com/messages?includeSpamTrash=false&maxResults=50&pageToken=09569981205055045732',
      method: 'GET',
      paramsSerializer: [Function (anonymous)],
      headers: {
        'x-goog-api-client': 'gdcl/3.2.2 gl-node/14.15.1 auth/5.10.1',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'google-api-nodejs-client/3.2.2 (gzip)',
        Authorization: 'Bearer ya29.A0AfH6SMC6vpQMyhrXG1Fp_0dCtJpqJd9dZImdzQGDN_HezzlYwftZmsYG3UfZhfyWrxfuFxjabe1WlxnjddxZVP5VYMS7a2hWRkXKK_QojEak0GW0IexNNwmjdzLrk7MVI7gmxKYAF8SRFt0lmp8CeDpTlvmoedNoPTvYDufuPItM6g',
        Accept: 'application/json'
      },
      params: [Object: null prototype] {
        includeSpamTrash: false,
        maxResults: 50,
        pageToken: '09569981205055045732'
      },
      validateStatus: [Function (anonymous)],
      retry: true,
      responseType: 'json',
      retryConfig: {
        currentRetryAttempt: 0,
        retry: 3,
        httpMethodsToRetry: [Array],
        noResponseRetries: 2,
        statusCodesToRetry: [Array]
      }
    },
    code: 403,
    errors: [
      {
        message: "Quota exceeded for quota metric 'Queries' and limit 'Queries per minute per user' of service 'gmail.googleapis.com' for consumer 'project_number:19927462601'.",
        domain: 'usageLimits',
        reason: 'rateLimitExceeded'
      }
    ]
  }

  {
    response: {
      config: {
        url: 'https://www.googleapis.com/gmail/v1/users/cliles84%40gmail.com/labels',
        method: 'GET',
        paramsSerializer: [Function (anonymous)],
        headers: [Object],
        params: [Object: null prototype] {},
        validateStatus: [Function (anonymous)],
        retry: true,
        responseType: 'json',
        retryConfig: [Object]
      },
      data: { error: [Object] },
      headers: {
        'alt-svc': 'h3-Q050=":443"; ma=2592000,h3-29=":443"; ma=2592000,h3-T051=":443"; ma=2592000,h3-Q046=":443"; ma=2592000,h3-Q043=":443"; ma=2592000,quic=":443"; ma=2592000; v="46,43"',
        'cache-control': 'private',
        connection: 'close',
        'content-encoding': 'gzip',
        'content-type': 'application/json; charset=UTF-8',
        date: 'Wed, 18 Nov 2020 12:24:49 GMT',
        server: 'ESF',
        'transfer-encoding': 'chunked',
        vary: 'Origin, X-Origin, Referer',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'x-xss-protection': '0'
      },
      status: 429,
      statusText: 'Too Many Requests',
      request: {
        responseURL: 'https://www.googleapis.com/gmail/v1/users/cliles84%40gmail.com/labels'
      }
    },
    config: {
      url: 'https://www.googleapis.com/gmail/v1/users/cliles84%40gmail.com/labels',
      method: 'GET',
      paramsSerializer: [Function (anonymous)],
      headers: {
        'x-goog-api-client': 'gdcl/3.2.2 gl-node/14.15.1 auth/5.10.1',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'google-api-nodejs-client/3.2.2 (gzip)',
        Authorization: 'Bearer ya29.A0AfH6SMDVHKF_cXCD0_ovbcQHr98_YAZRduIVVbaSegfyT-ua4b_BnmjbwoGx9tZwqSfOQ9Wl1byT21YUwxF_n9nKxrfqreftIEkhKlLcgsye50Xnblq4c9JowIoRySJuGRn9WhuByZX4wGluNh1omgMpuJ8Ba3FjATA4Bj0Etxb6Ww',
        Accept: 'application/json'
      },
      params: [Object: null prototype] {},
      validateStatus: [Function (anonymous)],
      retry: true,
      responseType: 'json',
      retryConfig: {
        currentRetryAttempt: 3,
        retry: 3,
        httpMethodsToRetry: [Array],
        noResponseRetries: 2,
        statusCodesToRetry: [Array]
      }
    },
    code: 429,
    errors: [
      {
        message: 'User-rate limit exceeded.  Retry after 2020-11-18T12:25:19.261Z',
        domain: 'global',
        reason: 'rateLimitExceeded'
      }
    ]
  }

  {
    response: {
      config: {
        url: 'https://www.googleapis.com/gmail/v1/users/cliles84%40gmail.com/labels',
        method: 'GET',
        paramsSerializer: [Function (anonymous)],
        headers: [Object],
        params: [Object: null prototype] {},
        validateStatus: [Function (anonymous)],
        retry: true,
        responseType: 'json',
        retryConfig: [Object]
      },
      data: { error: [Object] },
      headers: {
        'alt-svc': 'h3-29=":443"; ma=2592000,h3-T051=":443"; ma=2592000,h3-Q050=":443"; ma=2592000,h3-Q046=":443"; ma=2592000,h3-Q043=":443"; ma=2592000,quic=":443"; ma=2592000; v="46,43"',
        'cache-control': 'private',
        connection: 'close',
        'content-encoding': 'gzip',
        'content-type': 'application/json; charset=UTF-8',
        date: 'Wed, 18 Nov 2020 07:32:21 GMT',
        server: 'ESF',
        'transfer-encoding': 'chunked',
        vary: 'Origin, X-Origin, Referer',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'x-xss-protection': '0'
      },
      status: 429,
      statusText: 'Too Many Requests',
      request: {
        responseURL: 'https://www.googleapis.com/gmail/v1/users/cliles84%40gmail.com/labels'
      }
    },
    config: {
      url: 'https://www.googleapis.com/gmail/v1/users/cliles84%40gmail.com/labels',
      method: 'GET',
      paramsSerializer: [Function (anonymous)],
      headers: {
        'x-goog-api-client': 'gdcl/3.2.2 gl-node/14.15.1 auth/5.10.1',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'google-api-nodejs-client/3.2.2 (gzip)',
        Authorization: 'Bearer ya29.A0AfH6SMBMIqelxH_bM2wDbuozP9m4kggzcvVF5R0Z2YKlht6lL9ZB4h-zDKzyQFZN_VEUkLOjrPOpDYdMhmhQhSArsbN8f1FCd5LTfguFM-M8KNUPuJxnnytjr8jkC3llE4F_i2f-xuMaMT5G2lEU66LwzFBaYRphF_xi2-lO6wHRgw',
        Accept: 'application/json'
      },
      params: [Object: null prototype] {},
      validateStatus: [Function (anonymous)],
      retry: true,
      responseType: 'json',
      retryConfig: {
        currentRetryAttempt: 3,
        retry: 3,
        httpMethodsToRetry: [Array],
        noResponseRetries: 2,
        statusCodesToRetry: [Array]
      }
    },
    code: 429,
    errors: [
      {
        message: 'User-rate limit exceeded.  Retry after 2020-11-18T07:46:50.663Z',
        domain: 'global',
        reason: 'rateLimitExceeded'
      }
    ]
  }
*/