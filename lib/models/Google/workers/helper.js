const UsersJob = require('../../UsersJob/google')


const postpone = async (credential, jobName, ex) => {
  let interval = '5 minutes'

  if ( ex.statusCode === 429 || ex.code === 429 ) {
    interval = '30 minutes'
  }

  const fiveXErr = [500, 501, 502, 503, 504]

  if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {
    interval = '10 minutes'
  }

  await UsersJob.postponeByMicrosoftCredential(credential.id, jobName, interval)
}


module.exports = {
  postpone
}


/*
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
*/