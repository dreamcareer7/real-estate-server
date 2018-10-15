/*
  Also should be exported:
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
*/

module.exports = {
  cluster: {
    workers: process.env.CLUSTER_WORKERS
  },

  pg: {
    connection: process.env.DATABASE_URL
  },

  url: {
    protocol: 'https',
    hostname: process.env.API_HOSTNAME,
    port: 443
  },

  http: {
    port: process.env.PORT
  },

  redis: {
    url: process.env.REDIS_URL
  },

  salt: {
    string: process.env.SALT_STRING
  },

  buckets: {
    private: process.env.BUCKET_PRIVATE,
    public: process.env.BUCKET_PUBLIC,
  },
  cloudfront: {
    keypair: {
      id: process.env.CF_KEYPAIR_ID,
      private: process.env.CF_PRIVATE_KEY ? (new Buffer(process.env.CF_PRIVATE_KEY, 'base64')).toString('ascii') : null// https://github.com/dokku/dokku/issues/1262
    }
  },
  cdns: {
    private: process.env.CDN_PRIVATE,
    public: process.env.CDN_PUBLIC
  },

  airship: {
    key: process.env.AIRSHIP_KEY,
    secret: process.env.AIRSHIP_SECRET,
    masterSecret: process.env.AIRSHIP_MASTER_SECRET
  },

  slack: {
    webhook: process.env.SLACK_WEBHOOK,
    name: process.env.SLACK_NAME,
    enabled: true,
    support: {
      enabled: process.env.SLACK_SUPPORT_ENABLED === 'yes',
      oauth2_token: process.env.SLACK_SUPPORT_OAUTH2_TOKEN,
      signing_secret: process.env.SLACK_SUPPORT_SIGNING_SECRET
    }
  },

  google: {
    api_key: process.env.GOOGLE_API_KEY,
    use_key: true,
    client_id: process.env.GOOGLE_CLIENT_ID,
    project_id: process.env.GOOGLE_PROJECT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    web_hook: process.env.GOOGLE_WEB_HOOK
  },

  bing: {
    api_key: process.env.BING_API_KEY,
    use_key: true
  },

  crypto: {
    key: process.env.CRYPTO_KEY,
    iv: process.env.CRYPTO_IV,
    sign: {
      private: process.env.CRYPTO_SIGN_PRIVATE_KEY ? (new Buffer(process.env.CRYPTO_SIGN_PRIVATE_KEY, 'base64')).toString('ascii') : null,
      public: process.env.CRYPTO_SIGN_PUBLIC_KEY ? (new Buffer(process.env.CRYPTO_SIGN_PUBLIC_KEY, 'base64')).toString('ascii') : null
    }
  },

  webapp: {
    protocol: 'https',
    hostname: process.env.WEBAPP_BASE_URL,
    port: process.env.WEBAPP_PORT
  },

  app: {
    name: process.env.APP_NAME
  },

  twilio: {
    sid: process.env.TWILIO_SID,
    auth_token: process.env.TWILIO_AUTH_TOKEN
  },

  branch: {
    branch_key: process.env.BRANCH_KEY
  },

  datadog: {
    api_key: process.env.DATADOG_API_KEY
  },

  mailgun: {
    General: {
      api_key: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
    },
    Marketing: {
      api_key: process.env.MAILGUN_MARKETING_API_KEY,
      domain: process.env.MAILGUN_MARKETING_DOMAIN,
    }
  },

  email: {
    from: process.env.EMAIL_FROM,
    seamless_address: process.env.SEAMLESS_ADDRESS,
    seamless_delay: process.env.SEAMLESS_DELAY
  },

  intercom: {
    enabled: process.env.INTERCOM_ENABLED,
    app: process.env.INTERCOM_APP,
    token: process.env.INTERCOM_TOKEN
  },

  stripe: {
    key: process.env.STRIPE_KEY
  },

  godaddy: {
    key: process.env.GODADDY_KEY,
    secret: process.env.GODADDY_SECRET
  },

  forms: {
    url: process.env.RECHAT_FORMS_URL
  },

  docusign: {
    baseurl: process.env.DOCUSIGN_BASEURL,
    integrator_key: process.env.DOCUSIGN_INTEGRATOR_KEY,
    secret_key: process.env.DOCUSIGN_SECRET_KEY
  },

  webserver: {
    host: process.env.RECHAT_WEBSERVER_HOST
  },

  brokerwolf: {
    host: process.env.BROKERWOLF_HOST,
    clientcode: process.env.BROKERWOLF_CLIENT_CODE,
    apitoken: process.env.BROKERWOLF_API_TOKEN,
    consumerkey: process.env.BROKERWOLF_CONSUMER_KEY,
    secretkey: process.env.BROKERWOLF_SECRET_KEY,
    enabled: process.env.BROKERWOLF_ENABLED
  },
  ms_graph: {
    client_id: process.env.MSGRAPH_CLIENT_ID,
    client_secret: process.env.MSGRAPH_CLIENT_SECRET,
    redirect_url: process.env.MSGRAPH_REDIRECT_URL || 'https://alpine.api.rechat.com/ms-auth-redirect',
    authorization_url:
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    api_url: 'https://graph.microsoft.com/v1.0',
    api_endpoints: {
      emails: 'me/messages',
      events: 'me/events',
      contacts: 'me/contacts'
    },
    user_login_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?response_type=code%20id_token&response_mode=form_post&nonce=XRl0OwU2Ow9ODsCEe5Wrp4LoUEgjSGr3&scope=profile%20offline_access%20https://graph.microsoft.com/mail.readwrite%20https://graph.microsoft.com/calendars.readwrite%20https://graph.microsoft.com/contacts.readwrite%20openid&x-client-SKU=passport-azure-ad&x-client-Ver=3.0.9',
  },
  task_notification_delay: process.env.TASK_NOTIFICATION_DELAY
}
