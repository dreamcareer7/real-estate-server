/*
  Also should be exported:
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
*/

module.exports = {
  pg: {
    connection: process.env.DATABASE_URL
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
    attachments: process.env.BUCKET_ATTACHMENTS
  },

  cdns: {
    avatars: process.env.CDN_AVATARS,
    user_covers: process.env.CDN_USER_COVERS,
    photos: process.env.CDN_PHOTOS,
    attachments: process.env.CDN_ATTACHMENTS
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
    iv: process.env.CRYPTO_IV
  },

  webapp: {
    protocol: 'https',
    hostname: process.env.WEBAPP_BASE_URL
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
  }
}
