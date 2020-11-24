const Slack    = require('../../Slack')
const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/google')
const { disconnect } = require('../credential/update')



const lockJob = async (credential, jobName) => {
  /*
    Lock users_jobs record

    select * from users_jobs where google_credential = credential.id AND job_name = 'contact' FOR UPDATE;
    ==> lock will be released after commiting or rollbacking current transaction
  */

  await UsersJob.lockByGoogleCredential(credential.id, jobName)
  await UsersJob.upsertByGoogleCredential(credential, jobName, 'pending')
}

const reportFailure = async (credential, error) => {
  const emoji = ':skull:'
  const text  = `SyncGoogleCalendar - Job Finished With Failure ${credential.id} - ${credential.email} - ${error}`

  Slack.send({ channel: 'integration_logs', text, emoji })
}

const postpone = async (credential, jobName, ex) => {
  Context.log('Postpone-Google-Job', credential.id, jobName, ex.code, ex.statusCode, ex.message, ex.errors)

  let interval = '5 minutes'
  let rateLimitExceeded  = false
  let dailyLimitExceeded = false

  const fiveXErr = [500, 501, 502, 503, 504]
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
    interval = '30 minutes'
  }

  if ( ex.code === 403 && rateLimitExceeded ) {
    interval = '60 minutes'

    if (dailyLimitExceeded) {
      interval = '24 hours'
    }
  }

  await UsersJob.postponeByGoogleCredential(credential.id, jobName, interval)
}

const handleException = async (credential, jobName, msg, ex) => {
  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - StatusCode: ${ex.statusCode || ex.code} - Message: ${ex.message} - Info: ${JSON.stringify(obj)}`
  const emoji = ':skull:'

  const invalidGrantsCodes = [ex.statusCode, ex.code]
  const invalidGrantsMsgs  = ['invalid_grant', 'Invalid Credentials']

  let invalidGrant = false

  if ( invalidGrantsCodes.includes(401) || invalidGrantsMsgs.includes(ex.message) ) {
    invalidGrant = true
  }


  // Operations
  Slack.send({ channel: 'integration_logs', text, emoji })

  if (invalidGrant) {
    await disconnect(credential.id)
    await UsersJob.deleteByGoogleCredential(credential.id)
  } else {  
    await UsersJob.upsertByGoogleCredential(credential, jobName, 'failed')
    await postpone(credential, jobName, ex)
  }
}


module.exports = {
  lockJob,
  reportFailure,
  postpone,
  handleException
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