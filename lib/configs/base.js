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
  cluster: {
    workers: require('os').cpus().length
  },

  pg: {
    connection: {
      user: null,
      database: null,
      password: null
    },
    connection_timeout: 10000,
    pool_size: 1000
  },

  url: {
    protocol: 'http',
    hostname: 'localhost',
    port: 3078
  },

  allowed_upload_types: ['png', 'gif', 'jpg', 'jpeg', 'docx', 'doc', 'pdf', 'xls', 'xlsx', 'mp4', 'mov', 'webm', 'txt', 'csv', 'heic', 'mp4', 'html', 'pages'],

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

  buckets: {
    private: null,
    public: null
  },

  cdns: {
    avatars: null,
    user_covers: null,
    photos: null,
    attachments: null,
    private: null,
    public: null
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
    name: 'Development',
    support: {
      enabled: false,
      signing_secret: null
    }
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
    from_ses: 'support@rechat.com',
    aws_region: 'us-west-2',
    parallel: 10,
    seamless_address: null,
    seamless_delay: '2 minute', // Postgres interval
    seamless_timeout: '30 minute', // Postgres interval
    stat_update_delay: 1000 * 30
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
    normal: {
      api_key: null,
      domain: null,
      token: null
    },
    marketing: {
      api_key: null,
      domain: null,
      token: null
    }
  },

  intercom: {
    enabled: false,
    app: null,
    token: null
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

  forms: {
    url: null
  },

  puppeteer: {
    host: 'https://screenshots.api.rechat.com'
  },

  docusign: {
    baseurl: 'https://account-d.docusign.com',
    integrator_key: null,
    secret_key: null
  },
  scheduler: {
    queues: {
      refresh: {
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
        fix_geocode: {
          command: [ 'geocode/fix.js' ],
          interval: 1 * 3600 * 1000,
          priority: 3
        }
      },

      calendar: {
        calendar_notification: {
          command: [ 'calendar/notification.js' ],
          interval: 0.5 * 3600 * 1000,
          priority: 1
        }
      }
    }
  },
  ms_graph: {
    client_id: process.env.MSGRAPH_CLIENT_ID,
    client_secret: process.env.MSGRAPH_CLIENT_SECRET,
    redirect_url: 'https://alpine.api.rechat.com/ms-auth-redirect',
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

  amqp: {
    connection: 'amqp://localhost'
  },

  task_notification_delay: 1000 * 60 * 5,

  calendar: {
    notification_hour: 8, // Time of the day at which users will receive calendar notifications
  },

  showings: {
    crawling_gap_hour: '2 hours',
    first_crawl_time_window: 90,
    recurring_crawl_days_back: 60
  },

  google_credential: {
    sync_gap_hour: '2 hours'
  }
}