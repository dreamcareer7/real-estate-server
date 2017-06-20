/*
  Also should be exported:
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
*/

module.exports = {
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

  amazon: {
    cfbase: process.env.AMAZON_CFBASE
  },

  buckets: {
    avatars: process.env.BUCKET_AVATARS,
    user_covers: process.env.BUCKET_USER_COVERS,
    photos: process.env.BUCKET_PHOTOS,
    attachments: process.env.BUCKET_ATTACHMENTS,
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
    avatars: process.env.CDN_AVATARS,
    user_covers: process.env.CDN_USER_COVERS,
    photos: process.env.CDN_PHOTOS,
    attachments: process.env.CDN_ATTACHMENTS,
    private: process.env.CDN_PRIVATE,
    public: process.env.CDN_PUBLIC
  },

  airship: {
    key: process.env.AIRSHIP_KEY,
    secret: process.env.AIRSHIP_SECRET,
    masterSecret: process.env.AIRSHIP_MASTER_SECRET
  },

  ntreis: {
    login_url: process.env.NTREIS_URL,
    user: process.env.NTREIS_USER,
    password: process.env.NTREIS_PASSWORD,
    pause: process.env.NTREIS_PAUSE
  },

  slack: {
    webhook: process.env.SLACK_WEBHOOK,
    name: process.env.SLACK_NAME,
    enabled: true
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
    api_key: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    token: process.env.MAILGUN_TOKEN
  },

  email: {
    seamless_address: process.env.SEAMLESS_ADDRESS,
    seamless_delay: process.env.SEAMLESS_DELAY
  },

  intercom: {
    enabled: process.env.INTERCOM_ENABLED,
    app: process.env.INTERCOM_APP,
    key: process.env.INTERCOM_KEY
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

  formstack: {
    access_token: process.env.FORMSTACK_ACCESS_TOKEN
  },

  docusign: {
    baseurl: process.env.DOCUSIGN_BASEURL,
    integrator_key: process.env.DOCUSIGN_INTEGRATOR_KEY,
    secret_key: process.env.DOCUSIGN_SECRET_KEY
  },

  webserver: {
    host: process.env.RECHAT_WEBSERVER_HOST
  }
}
