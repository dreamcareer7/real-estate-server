module.exports = {
  open_debounce_key: 'emails_open_event_debouncer',
  open_process_delay: 60,

  email_events: {
    delivered: 'delivered',
    unsubscribed: 'unsubscribed',
    clicked: 'clicked',
    failed: 'failed',
    opened: 'opened'
  },

  reactedToEvents: ['clicked', 'opened'],
  
  // these are the codeTwo IPs which is listed in this page
  // https://www.codetwo.com/kb/codetwo-cloud-geolocations/
  // codeTwo is the product they use to append the signatures.
  // if the request comes from these IPs we don't want to update the email status
  blackListIPS: [
    '13.74.137.176',
    '52.138.216.130',
    '94.245.94.31',
    '40.89.160.84',
    '40.114.221.220',
    '40.113.3.253',
    '13.79.146.65',
    '23.100.56.64',
    '137.116.240.241',
    '20.93.157.195',
    '13.93.42.39',
    '13.81.10.179',
    '40.69.19.60',
    '137.116.240.241',
    '20.58.22.103',
    '20.49.202.3',
    '51.11.109.172',
    '137.116.240.241',
    '20.79.220.33',
    '20.79.222.204',
    '13.94.95.171',
    '137.116.240.241',
    '52.229.64.105',
    '40.86.247.52',
    '20.151.230.19',
    '40.124.2.148',
    '20.98.2.159',
    '20.98.33.77',
    '65.52.215.36',
    '20.97.70.227',
    '40.124.2.148',
    '40.86.165.91',
    '40.86.171.128',
    '52.170.22.60',
    '40.124.2.148',
    '20.92.233.59',
    '13.75.218.232',
    '20.92.116.22',
    '13.77.59.28',
    '137.116.240.241',
    '40.124.2.148',
    '20.74.138.141',
    '20.74.187.164',
    '13.95.173.250',
  ]
}