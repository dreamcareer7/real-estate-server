const microsoft_details = {
  address_1: 'rechat-test@outlook.com',
  tokens_1: {
    access_token: 'GlsSB5gTTkynEx16V7EnNexoVj15u.....',
    refresh_token: 'OmJrvcRpDBsWgY0ixn2GOW0kDSHMs9LxhpTA',
    id_token: 'xxxxxxxxxxxxxxxxxxxx',
    expires_in: new Date().getTime(),
    ext_expires_in: new Date().getTime(),
    scope: 'openid offline_access profile email User.Read Contacts.Read Mail.Read'
  },

  address_2: 'rechat-test-2@outlook.com',
  tokens_2: {
    access_token: 'GlsUBzA2jx8dx_keCJver96nMm.....',
    refresh_token: 'A9yVvz8OVLUro8iKTcvoCoXo7Pa6pajnviTBgD2gdqQQtiIeYi',
    id_token: 'xxxxxxxxxxxxxxxxxxxx',
    expires_in: new Date().getTime(),
    ext_expires_in: new Date().getTime(),
    scope: 'openid offline_access profile email User.Read Contacts.Read Mail.Read'
  }
}


module.exports = {
  profile: {
    email: 'rechat-test@outlook.com',
    remote_id: '432ea353e4efa7f6',
    displayName: 'Saeed Vayghani',
    firstName: 'Saeed',
    lastName: 'Vayghani',
    photo: 'https://outlook.com/...'  
  },

  tokens: microsoft_details.tokens_1,

  scope: microsoft_details.tokens_1.scope.split(' '),
  scopeSummary: []
}