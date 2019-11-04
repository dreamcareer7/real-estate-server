const google_details = {
  address_1: 'saeed.uni68@gmail.com',
  tokens_1: {
    access_token: 'ya29.GlsSB5gTTkynEx16V7EnNexoVj15u.....',
    refresh_token: '1/mvS9GZgOmJrvcRpDBsWgY0ixn2GOW0kDSHMs9LxhpTA',
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    token_type: 'Bearer',
    expiry_date: 1558581374
  },
  
  address_2: 'saeed@rechat.com',
  tokens_2: {
    access_token: 'ya29.GlsUBzA2jx8dx_keCJver96nMm.....',
    refresh_token: '1/wf3VTMwGFDqnDwA9yVvz8OVLUro8iKTcvoCoXo7Pa6pajnviTBgD2gdqQQtiIeYi',
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly',
    expiry_date: 1558581374
  },

  scope: [
    'email',
    'profile',
    'openid',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/contacts.readonly'
  ]
}


module.exports = {
  profile: {
    emailAddress: google_details.address_1,
    resourceName: 'people/101097287757226633710',
    displayName: 'Saeed Vayghani',
    firstName: 'Saeed',
    lastName: 'Vayghani',
    photo: 'https://lh5.googleusercontent.com/...',

    messagesTotal: 100,
    threadsTotal: 100,
    historyId: 100
  },

  tokens: google_details.tokens_1,

  scope: google_details.scope,
  scopeSummary: []
}