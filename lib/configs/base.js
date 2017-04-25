const domain_contact = {
  nameFirst: 'Shayan',
  nameLast: 'Hamidi',
  organization: 'Rechat inc' ,
  email: 'support@rechat.com' ,
  phone: '+1.9729711191' ,
  addressMailing: {
    address1: 'Address' ,
    city: 'Dallas',
    state: 'Texas' ,
    postalCode: '55555' ,
    country: 'US'
  }
}

module.exports = {
  pg: {
    connection: {
      user: null,
      database: null,
      password: null
    },
    pool_size: 100
  },

  url: {
    protocol: 'http',
    hostname: 'localhost',
    port: 3078
  },

  allowed_upload_types: ['png', 'gif', 'jpg', 'jpeg', 'docx', 'pdf', 'xls', 'xlsx', 'mp4', 'mov'],

  assets: 'http://assets.rechat.com',

  redis: {
    url: process.env.NODE_ENV === 'tests' ? 'redis://127.0.0.1:6379/1' : 'redis://127.0.0.1:6379'
  },

  http: {
    port: 3078,
    sport: 3079
  },

  auth: {
    access_token_lifetime: 86400 * 7
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
    attachments: null,
    private: null
  },

  cdns: {
    avatars: null,
    user_covers: null,
    photos: null,
    attachments: null,
    private: null
  },

  cloudfront: {
    keypair: {
      id: null,
      private: null
    }
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
    enabled: false,
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
  },

  crypto: {
    key: null,
    iv: null,
    sign: {
      alghoritm: 'RSA-SHA256',
      private: null,
      public: null
    }
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

  app: {
    name: 'rechat'
  },

  webapp: {
    hostname: 'localhost',
    protocol: 'http',
    port: 8080
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
    enabled: false,
    app: null,
    key: null
  },

  facebook: {
    app_id: null,
    app_secret: null
  },

  recommendations: {
    url: 'http://recommender.d.rechat.com'
  },

  webserver: {
    host: 'rechat.site'
  },

  stripe: {
    key: null
  },

  godaddy: {
    key: null,
    secret: null,

    registrant: domain_contact,
    admin: domain_contact,
    tech: domain_contact,
    billing: domain_contact,

    ipv4: '66.228.50.73',
    ipv6: '2600:9000:5302:f100::1'
  },

  formstack: {
    access_token: null
  },

  forms: {
    url: null
  },

  docusign: {
    baseurl: 'https://account-d.docusign.com',
    integrator_key: null,
    secret_key: null
  },

  selenium: {
    desiredCapabilities: {},
    host: 'hub.browserstack.com',
    port: 80,
    user: null,
    key: null,
  },

  scheduler: {
    queues: {
      fetch: {
        listings: {
          command: ['listings.js', '-e', '-n', '-l', 1000],
          interval: 30000,
          priority: 2
        },

        agents: {
          command: ['agents.js', '-l', 1000],
          interval: 60000 * 30,
          priority: 1
        },

        photos: {
          command: ['photos.js', '-d', 100, '-u', 100, '-l', 1000],
          interval: 30000,
          priority: 2
        },

        delete_photos: {
          command: ['delete_photos.js'],
          interval: 10000,
          priority: 3
        },

        open_houses: {
          command: ['openhouses.js', '-l', 1000],
          interval: 60000 * 30,
          priority: 1
        },

        offices: {
          command: ['offices.js', '-l', 1000],
          interval: 60000 * 30,
          priority: 1
        },

        rooms: {
          command: ['rooms.js', '-l', 1000],
          interval: 60000 * 30,
          priority: 1
        },

        units: {
          command: ['units.js', '-l', 1000],
          interval: 60000 * 30,
          priority: 1
        }
      },

      refresh: {
        refresh_listings: {
          command: ['refresh/listings.js'],
          interval: 60000 * 5,
          priority: 1
        },

        refresh_agents: {
          command: ['refresh/agents.js'],
          interval: 60000 * 30,
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
        }
      },

      geocode: {
        fix: {
          command: [ 'geocode/fix.js' ],
          interval: 1 * 3600 * 1000,
          priority: 3
        }
      }
    }
  }
}
