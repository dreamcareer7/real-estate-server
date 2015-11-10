module.exports = {
  pg: {
    connection: process.env.DATABASE_URL
  },
  redis: {
    connection: process.env.REDIS_URL
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
    listing_images: process.env.BUCKET_LISTING_IMAGES
  },
  airship: {
    key: process.env.AIRSHIP_KEY,
    secret: process.env.AIRSHIP_SECRET,
    masterSecret: process.env.AIRSHIP_MASTER_SECRET
  },
  ntreis: {
    user: process.env.NTREIS_USER,
    password: process.env.NTREIS_PASSWORD
  },
  slack: {
    webhook: process.env.SLACK_WEBHOOK,
    this : process.env.SLACK_THIS
  },
  google: {
    api_key: process.env.GOOGLE_API_KEY
  },
  bing: {
    api_key: process.env.BING_API_KEY
  },
  crypto: {
    pw_reset_key: process.env.CRYPTO_KEY,
    pw_reset_iv: process.env.CRYPTO_IV
  },
  webapp: {
    password_reset_base_url: process.env.WEBAPP_BASE_URL
  },
  twilio: {
    sid: process.env.TWILIO_SID,
    auth_token: process.env.TWILIO_AUTH_TOKEN
  },
  newrelic: {
    app_name: [process.env.NEWRELIC_APPNAME],
    license_key: process.env.NEWRELIC_LICENSE_KEY,
    logging: {
      level: process.env.NEWRELIC_LOG_LEVEL
    }
  }
};
