module.exports = {
  pg: {
    connection: {
      user: null,
      database: null,
      password: null
    },
    pool_size: 100
  },
  redis: {
    connection: null
  },
  http: {
    port: 3078,
    sport: 3079
  },
  redis: 'redis://localhost:6379',
  auth: {
    access_token_lifetime: 86400
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
    staging: 600000,
    timeout: 300000
  },
  osm: {
    url: 'http://52.10.27.178/search.php?q='
  },
  slack: {
    webhook: null,
    this: 'NTREIS Connector'
  },
  google: {
    address_batch_size: 5,
    concurrency: 5,
    pause: 200,
    api_key: null,
    url: 'https://maps.googleapis.com/maps/api/geocode/json',
    staging: 600000,
    use_key: false
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
    from: 'support@rechat.co',
    source: 'support@rechat.co',
    aws_region: 'us-west-2',
    parallel: 10
  },
  crypto: {
    key: null,
    iv: null
  },
  tests: {
    client_id: 'bf0da47e-7226-11e4-905b-0024d71b10fc',
    client_secret: 'secret',
    username: 'd@d.com',
    password: 'aaaaaa',
    port: 3079
  },
  twilio: {
    sid: null,
    auth_token: null,
    parallel: 10,
    from: "7205732428"
  },
  newrelic: {
    app_name: null,
    license_key: null,
    logging: {
      level: 'info'
    }
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
  datadogs: {
    api_key:null
  },
  scheduler: {
    tasks: {
      listings: {
        command: ['listings.js', '-e', '-n', '-l', 20],
        interval:60000,
        priority:0
      },

      agents: {
        command: ['agents.js', '-l', 20],
        interval:300000,
        priority:2
      },

      photos: {
        command: ['photos.js', '-d', 100, '-u', 100, '-l', 10],
        interval: 60000,
        priority:1
      },

      open_houses: {
        command: ['openhouses.js', '-l', 10],
        interval: 60000*5,
        priority:2
      },

      offices: {
        command: ['offices.js', '-l', 10],
        interval: 60000*5,
        priority:2
      }
    }
  }
};
