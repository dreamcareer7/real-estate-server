const r53 = {}

r53.createHostedZone = (params, cb) => {
  cb(null, {
    HostedZone: {
      Id: 'Mock_Hosted_Zone'
    },

    DelegationSet: {
      NameServers: ['ns1.google.com']
    }
  })
}

r53.changeResourceRecordSets = (params, cb) => cb()

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

godaddy.shoppers.createSubAccount = (options, cb) => {
  cb(null, {
    shopperId: '1060842'
  })
}

module.exports = {
  r53,
  godaddy
}