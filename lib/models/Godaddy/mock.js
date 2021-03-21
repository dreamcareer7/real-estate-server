const Nock = require('nock')
const config = require('../../config.js')

const nock = Nock(config.cloudflare.base_url)

nock.post('/client/v4/zones/c4b7ac2fe93fe0595f0c062960c16867/dns_records').times(2).reply(200, {
  result: {
    id: '32a353f2bfa9c571229afea30f67bcf1',
    zone_id: 'c4b7ac2fe93fe0595f0c062960c16867',
    zone_name: 'suggestion.com',
    name: 'suggestion.com',
    type: 'CNAME',
    content: 'dns.rechat.site',
    proxiable: true,
    proxied: false,
    ttl: 120,
    locked: false,
    meta: {
      auto_added: false,
      managed_by_apps: false,
      managed_by_argo_tunnel: false,
      source: 'primary'
    },
    created_on: '2021-03-21T01:49:03.841657Z',
    modified_on: '2021-03-21T01:49:03.841657Z'
  }
})

nock.post('/client/v4/zones').reply(200, {
  result: {
    id: 'c4b7ac2fe93fe0595f0c062960c16867',
    name: 'suggestion.com',
    status: 'pending',
    paused: false,
    type: 'full',
    development_mode: 0,
    name_servers: [ 'noel.ns.cloudflare.com', 'tani.ns.cloudflare.com' ],
    original_name_servers: [ 'ns3.epik.com', 'ns4.epik.com' ],
    original_registrar: 'epik inc. (id: 617)',
    original_dnshost: null,
    modified_on: '2021-03-21T00:34:20.246610Z',
    created_on: '2021-03-21T00:34:20.246610Z',
    activated_on: null,
    meta: {
      step: 4,
      wildcard_proxiable: false,
      custom_certificate_quota: 0,
      page_rule_quota: 3,
      phishing_detected: false,
      multiple_railguns_allowed: false
    },
    owner: {
      id: 'b83bdb9833d6d9a53bc1d6d3538b361e',
      type: 'user',
      email: 'emil@rechat.com'
    },
    account: { id: '841cd430fbd5c8eaff3f49ae3e4cf590', name: 'emil@rechat.com' },
    permissions: [
      '#access:edit',        '#access:read',
      '#analytics:read',     '#app:edit',
      '#auditlogs:read',     '#billing:edit',
      '#billing:read',       '#cache_purge:edit',
      '#dns_records:edit',   '#dns_records:read',
      '#lb:edit',            '#lb:read',
      '#legal:edit',         '#legal:read',
      '#logs:edit',          '#logs:read',
      '#member:edit',        '#member:read',
      '#organization:edit',  '#organization:read',
      '#ssl:edit',           '#ssl:read',
      '#stream:edit',        '#stream:read',
      '#subscription:edit',  '#subscription:read',
      '#teams:edit',         '#teams:read',
      '#teams:report',       '#waf:edit',
      '#waf:read',           '#webhooks:edit',
      '#webhooks:read',      '#worker:edit',
      '#worker:read',        '#zone:edit',
      '#zone:read',          '#zone_settings:edit',
      '#zone_settings:read'
    ],
    plan: {
      id: '0feeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      name: 'Free Website',
      price: 0,
      currency: 'USD',
      frequency: '',
      is_subscribed: false,
      can_subscribe: false,
      legacy_id: 'free',
      legacy_discount: false,
      externally_managed: false
    }
  }
})

const godaddy = {}
godaddy.domains = {}
godaddy.shoppers = {}

godaddy.domains.available = (options, cb) => {
  const res = {
    available: true,
    domain: options.domain,
    definitive: true,
    price: 17990000,
    currency: 'USD',
    period: 1
  }

  cb(null, res)
}

godaddy.domains.purchase = (options, cb) => {
  const res = {
    orderId: 841636,
    itemCount: 1,
    total: 26170000,
    currency: 'USD'
  }

  cb(null, res)
}

godaddy.domains.suggest = (options, cb) => {
  const res = [
    'suggestion.com',
    'suggestion.org',
    'suggestion.net',
  ]

  cb(null, res)
}

godaddy.domains.bulkAvailable = (options, cb) => {
  const domains = options.domains.map(domain => {
    return {
      available: true,
      domain: domain,
      definitive: true,
      price: 47990000,
      currency: 'USD',
      period: 1
    }
  })

  cb(null, {domains})
}

godaddy.domains.getAgreements = (options, cb) => {
  cb(null, [
    {
      url: 'http://mock-nra-url',
      content: 'Mock NRA Content',
      title: 'Mock Domain Name Registration Agreement',
      agreementKey: 'Mock DNRA'
    }
  ])
}

godaddy.domains.update = (options, cb) => {
  cb()
}

godaddy.shoppers.createSubAccount = (options, cb) => {
  cb(null, {
    shopperId: '1060842'
  })
}

module.exports = godaddy
