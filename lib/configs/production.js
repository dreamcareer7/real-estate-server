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
    enabled: process.env.SLACK_ENABLED === 'yes',
    support: {
      enabled: process.env.SLACK_SUPPORT_ENABLED === 'yes',
      oauth2_token: process.env.SLACK_SUPPORT_OAUTH2_TOKEN,
      signing_secret: process.env.SLACK_SUPPORT_SIGNING_SECRET
    }
  },

  geo: {
    enabled: process.env.GEO_ENABLED,
  },

  google: {
    api_key: process.env.GOOGLE_API_KEY,
    use_key: true,
    client_id: process.env.GOOGLE_CLIENT_ID,
    project_id: process.env.GOOGLE_PROJECT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    web_hook: process.env.GOOGLE_WEB_HOOK,
    credential_redirect_uri: process.env.GOOGLE_CREDENTIAL_REDIRECT_URL,
  },

  google_integration: {
    credential: {
      client_id: process.env.GOOGLE_INTEGRATION_CLIENT_ID,
      client_secret: process.env.GOOGLE_INTEGRATION_CLIENT_SECRET,
      project_id: process.env.GOOGLE_INTEGRATION_PROJECT_ID,
      redirect_to_uri: process.env.GOOGLE_INTEGRATION_REDIRECT_TO_URI,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
    }
  },

  microsoft_integration: {
    credential: {
      client_id: process.env.MICROSOFT_INTEGRATION_CLIENT_ID,
      client_secret: process.env.MICROSOFT_INTEGRATION_CLIENT_SECRET,
      object_id: process.env.MICROSOFT_INTEGRATION_OBJECT_ID,
      tenant: process.env.MICROSOFT_INTEGRATION_TENANT,
      auth_uri: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?',
      redirect_to_uri: process.env.MICROSOFT_CREDENTIAL_REDIRECT_URL
    }
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
    url: process.env.RECHAT_FORMS_URL,
    cdn: process.env.RECHAT_FORMS_CDN
  },

  docusign: {
    baseurl: process.env.DOCUSIGN_BASEURL,
    integrator_key: process.env.DOCUSIGN_INTEGRATOR_KEY,
    secret_key: process.env.DOCUSIGN_SECRET_KEY
  },

  webserver: {
    host: process.env.RECHAT_WEBSERVER_HOST
  },

  task_notification_delay: process.env.TASK_NOTIFICATION_DELAY,

  amqp: {
    connection: process.env.CLOUDAMQP_URL
  },

  calendar: {
    notification_hour: process.env.CALENDAR_NOTIFICATION_HOUR, // Time of the day at which users will receive calendar notifications
  }
}
