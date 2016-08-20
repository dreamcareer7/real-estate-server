module.exports = {
  pg: {
    connection: {
      user: null,
      database: null,
      password: null
    },
    pool_size: 100
  },

  allowed_upload_types: ['png', 'gif', 'jpg', 'jpeg', 'docx', 'pdf', 'xls', 'xlsx', 'mp4'],

  assets: 'http://assets.rechat.com',

  redis: {
    url: 'redis://127.0.0.1:6379'
  },

  http: {
    port: 3078,
    sport: 3079
  },

  auth: {
    access_token_lifetime: 86400*7
  },

  salt: {
    string: null,
    iterations: 1000,
    length: 5
  },

  amazon: {
    cfbase: null
  },

  buckets: {
    avatars: null,
    user_covers: null,
    listing_images: null,
    photos: null,
    attachments: null
  },

  cdns: {
    avatars: null,
    user_covers: null,
    photos: null,
    attachments: null
  },

  airship: {
    key: null,
    secret: null,
    masterSecret: null,
    parallel: 10
  },

  ntreis: {
    login_url: 'http://matrixrets.ntreis.net/rets/login.ashx',
    user: null,
    password: null,
    parallel: 100,
    gallery: 'Photo',
    pause: 20000,
    default_photo_ext: '.jpg',
    default_limit: 3000,
    version: '0.2',
    photo_update_batch_size: 50,
    concurrency: 5,
    timeout: 300000
  },

  slack: {
    webhook: null,
    name: 'Development'
  },

  google: {
    address_batch_size: 320,
    concurrency: 1,
    pause: 200,
    api_key: null,
    url: 'https://maps.googleapis.com/maps/api/geocode/json',
    use_key: false,
    client_id: null,
    project_id: null,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://accounts.google.com/o/oauth2/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_secret: null,
    redirect_uri: 'http://localhost:3078/calendar/callback?user=',
    scopes: ['https://www.googleapis.com/auth/calendar'],
    access_type: 'offline',
    web_hook: 'https://localhost:3078/calendar/notifications'
  },

  bing: {
    url: 'http://dev.virtualearth.net/REST/v1/Locations',
    api_key: null,
    address_batch_size: 30,
    concurrency: 5,
    pause: 200,
    staging: 1000000
  },

  email: {
    from: 'support@rechat.com',
    source: 'support@rechat.com',
    aws_region: 'us-west-2',
    parallel: 10,
    seamless_address: null,
    seamless_delay: 1200
  },

  crypto: {
    key: null,
    iv: null
  },

  tests: {
    client_id: 'bf0da47e-7226-11e4-905b-0024d71b10fc',
    client_secret: 'secret',
    username: 'test@rechat.com',
    password: 'aaaaaa',
    port: 3079
  },

  twilio: {
    sid: null,
    auth_token: null,
    parallel: 10,
    from: '+17205732428'
  },

  webapp: {
    password_reset_suffix: '/reset_password?token=',
    email_verification_suffix: '/verify_email?token=',
    phone_verification_suffix: '/verify_phone?token=',
    download_suffix: '/get',
    agents_suffix: '/agents'
  },

  branch: {
    base_url: 'https://api.branch.io'
  },

  datadog: {
    api_key: null
  },

  mailgun: {
    api_key: null,
    domain: null,
    token: null
  },

  intercom: {
    enabled:false,
    app: null,
    key: null
  },

  recommendations: {
    url:'http://recommender.d.rechat.com'
  },

  scheduler: {
    queues: {
      fetch: {
        listings: {
          command: ['listings.js', '-e', '-n', '-l', 10000],
          interval:20000,
          priority:2
        },

        agents: {
          command: ['agents.js', '-l', 10000],
          interval: 60000 * 30,
          priority: 1
        },

        photos: {
          command: ['photos.js', '-d', 100, '-u', 100, '-l', 10000],
          interval: 20000,
          priority: 2
        },

        open_houses: {
          command: ['openhouses.js', '-l', 10000],
          interval: 60000*30,
          priority: 1
        },

        offices: {
          command: ['offices.js', '-l', 10000],
          interval: 60000*30,
          priority: 1
        },

        rooms: {
          command: ['rooms.js', '-l', 10000],
          interval: 60000*30,
          priority: 1
        },

        units: {
          command: ['units.js', '-l', 10000],
          interval: 60000*30,
          priority: 1
        }
      },

      refresh: {
        refresh_listings: {
          command: ['refresh/listings.js'],
          interval: 60000*5,
          priority: 1
        },

        refresh_agents: {
          command: ['refresh/agents.js'],
          interval: 60000*30,
          priority: 2
        },

        refresh_schools: {
          command: ['refresh/schools.js'],
          interval: 86400 * 1000 * 7,
          priority: 2
        },

        refresh_mls_areas: {
          command: ['refresh/areas.js'],
          interval: 86400 * 1000 * 7,
          priority: 2
        },

        refresh_counties: {
          command: ['refresh/counties.js'],
          interval: 86400 * 1000 * 7,
          priority: 2
        },

        refresh_subdivisions: {
          command: ['refresh/subdivisions.js'],
          interval: 86400 * 1000 * 7,
          priority: 2
        },
      }
    }
  }
};
