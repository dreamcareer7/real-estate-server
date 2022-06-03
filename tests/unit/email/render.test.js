const { expect } = require('chai')
const { render } = require('../../../lib/models/Email/campaign/send')

/*
 * The reason I'm using this very long lorem ipsum is to detect catastrophic backtracing.
 * According to Google:
 *  "Catastrophic backtracking is a condition that can occur if you're checking a (usually long) string against a complex regular expression."
 * It basically means the regexp engine falls into a loop and cannot resolve the regexp because it's too long and complex.
 * This actually happened the other day and stopped our email processing.
 * Which means our regexp is now in the realm of a "complex regular expression".
 * Yep. I'm proud of meself lol.
 */

const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Nec tincidunt praesent semper feugiat nibh sed pulvinar proin. Ante metus dictum at tempor commodo. Ullamcorper a lacus vestibulum sed arcu non odio euismod. Rutrum quisque non tellus orci ac auctor augue mauris. Malesuada fames ac turpis egestas sed. Nulla facilisi cras fermentum odio eu feugiat pretium nibh ipsum. Tristique senectus et netus et malesuada fames ac turpis egestas. Metus dictum at tempor commodo. Suspendisse interdum consectetur libero id. Pretium quam vulputate dignissim suspendisse in est ante in nibh. Iaculis eu non diam phasellus vestibulum. Viverra tellus in hac habitasse platea dictumst.Velit sed ullamcorper morbi tincidunt ornare. Mollis aliquam ut porttitor leo a diam. Fusce id velit ut tortor pretium viverra suspendisse potenti. Id leo in vitae turpis massa sed. Lacus vestibulum sed arcu non odio euismod lacinia at quis. Sodales ut eu sem integer vitae. Consequat semper viverra nam libero. Posuere morbi leo urna molestie at elementum eu facilisis sed. Ut ornare lectus sit amet est. Cursus turpis massa tincidunt dui ut. In nibh mauris cursus mattis molestie a iaculis. Tortor pretium viverra suspendisse potenti nullam ac tortor. Ultricies integer quis auctor elit sed vulputate mi. Eu volutpat odio facilisis mauris sit amet massa vitae tortor. Cursus in hac habitasse platea dictumst quisque. Vitae justo eget magna fermentum iaculis eu non diam. PLACEHOLDER_HERE Cras semper auctor neque vitae tempus quam pellentesque nec. Placerat vestibulum lectus mauris ultrices eros in cursus turpis massa. Posuere urna nec tincidunt praesent semper feugiat nibh sed pulvinar. Nascetur ridiculus mus mauris vitae. Consectetur purus ut faucibus pulvinar elementum integer enim neque. Nunc lobortis mattis aliquam faucibus purus in. Lobortis mattis aliquam faucibus purus. Lacinia at quis risus sed vulputate odio ut. Urna nec tincidunt praesent semper feugiat nibh sed pulvinar. At augue eget arcu dictum. Non consectetur a erat nam at lectus urna duis. Risus viverra adipiscing at in tellus integer. Neque laoreet suspendisse interdum consectetur libero id faucibus nisl tincidunt. Commodo ullamcorper a lacus vestibulum sed arcu. Phasellus egestas tellus rutrum tellus pellentesque eu tincidunt tortor. Erat pellentesque adipiscing commodo elit at imperdiet dui accumsan sit. Diam maecenas ultricies mi eget mauris. Faucibus in ornare quam viverra. Nunc sed blandit libero volutpat sed. Dolor magna eget est lorem ipsum. Sed risus pretium quam vulputate dignissim suspendisse in. Convallis convallis tellus id interdum velit laoreet id donec. Aliquet sagittis id consectetur purus ut faucibus. In aliquam sem fringilla ut morbi tincidunt. Tellus in metus vulputate eu scelerisque felis. Tincidunt nunc pulvinar sapien et ligula ullamcorper. Ultricies leo integer malesuada nunc vel risus commodo viverra maecenas. Nunc sed velit dignissim sodales. Cras adipiscing enim eu turpis egestas. Tempus urna et pharetra pharetra. Pharetra pharetra massa massa ultricies mi. Faucibus vitae aliquet nec ullamcorper sit. Laoreet id donec ultrices tincidunt arcu non sodales neque sodales. Mauris augue neque gravida in fermentum. Pretium quam vulputate dignissim suspendisse in est. Fusce id velit ut tortor pretium viverra. Commodo quis imperdiet massa tincidunt nunc pulvinar sapien. Lacus laoreet non curabitur gravida. Ut tristique et egestas quis ipsum. Mi quis hendrerit dolor magna eget est lorem. Arcu odio ut sem nulla pharetra diam. In vitae turpis massa sed elementum tempus egestas. Duis ultricies lacus sed turpis tincidunt id aliquet risus. Sit amet cursus sit amet dictum sit. Magna fermentum iaculis eu non diam phasellus. Malesuada nunc vel risus commodo viverra maecenas accumsan. Viverra orci sagittis eu volutpat odio facilisis mauris. Eu nisl nunc mi ipsum faucibus. Risus nullam eget felis eget. A condimentum vitae sapien pellentesque habitant. Morbi tempus iaculis urna id volutpat lacus laoreet non. A scelerisque purus semper eget duis at tellus. Amet mauris commodo quis imperdiet massa tincidunt nunc pulvinar. Diam maecenas sed enim ut sem. Vel elit scelerisque mauris pellentesque. Nisi vitae suscipit tellus mauris a. Posuere urna nec tincidunt praesent. Ante in nibh mauris cursus mattis. Fames ac turpis egestas maecenas pharetra convallis posuere morbi leo. Lobortis feugiat vivamus at augue eget. Molestie a iaculis at erat pellentesque adipiscing commodo elit at. Interdum varius sit amet mattis. Sed cras ornare arcu dui vivamus arcu. Molestie at elementum eu facilisis sed. Sit amet risus nullam eget felis. Molestie at elementum eu facilisis sed odio morbi quis. Neque gravida in fermentum et. Id venenatis a condimentum vitae sapien pellentesque habitant morbi. Lacus laoreet non curabitur gravida arcu ac tortor. At erat pellentesque adipiscing commodo elit at imperdiet. Pulvinar sapien et ligula ullamcorper malesuada proin. Velit ut tortor pretium viverra suspendisse potenti. Luctus venenatis lectus magna fringilla urna porttitor rhoncus dolor purus. Morbi leo urna molestie at elementum eu facilisis. Ultricies integer quis auctor elit sed vulputate mi sit amet. Neque viverra justo nec ultrices. Quis imperdiet massa tincidunt nunc pulvinar. Molestie a iaculis at erat pellentesque adipiscing commodo elit at. A diam maecenas sed enim ut sem viverra aliquet. Eu tincidunt tortor aliquam nulla facilisi cras fermentum. Dapibus ultrices in iaculis nunc sed augue lacus viverra. Pellentesque habitant morbi tristique senectus. Urna neque viverra justo nec ultrices dui sapien. Massa massa ultricies mi quis hendrerit. Sit amet cursus sit amet dictum. Aenean sed adipiscing diam donec adipiscing tristique risus nec feugiat. Vulputate ut pharetra sit amet aliquam. Scelerisque eleifend donec pretium vulputate sapien nec sagittis aliquam malesuada. Feugiat nibh sed pulvinar proin gravida. Vitae tortor condimentum lacinia quis vel eros. Habitasse platea dictumst quisque sagittis purus. Dictum sit amet justo donec enim diam vulputate ut pharetra. Eu ultrices vitae auctor eu augue ut. Varius vel pharetra vel turpis. Imperdiet sed euismod nisi porta. Mollis nunc sed id semper risus in hendrerit gravida rutrum. Amet mauris commodo quis imperdiet massa tincidunt nunc pulvinar sapien. Molestie at elementum eu facilisis sed odio. Tortor vitae purus faucibus ornare suspendisse sed nisi lacus. Maecenas accumsan lacus vel facilisis volutpat est velit egestas dui. Consectetur adipiscing elit ut aliquam. Viverra nam libero justo laoreet. Elementum pulvinar etiam non quam lacus. Eros donec ac odio tempor orci. Massa vitae tortor condimentum lacinia quis vel eros donec. Vel elit scelerisque mauris pellentesque pulvinar pellentesque habitant morbi. Dui accumsan sit amet nulla facilisi. Bibendum enim facilisis gravida neque convallis a cras semper auctor. Dui id ornare arcu odio ut sem nulla. Tortor posuere ac ut consequat semper viverra nam libero. Rhoncus urna neque viverra justo nec ultrices dui sapien. In massa tempor nec feugiat. Lectus nulla at volutpat diam ut venenatis. A erat nam at lectus urna duis convallis convallis. Auctor augue mauris augue neque gravida in fermentum et. Donec ultrices tincidunt arcu non. In eu mi bibendum neque egestas congue quisque egestas. At lectus urna duis convallis. Commodo viverra maecenas accumsan lacus vel. Malesuada nunc vel risus commodo viverra maecenas accumsan lacus vel. Felis donec et odio pellentesque. Risus viverra adipiscing at in tellus.'

// const lorem = 'ABC PLACEHOLDER_HERE 123 PLACEHOLDER_HERE'

const recipient = {
  first_name: 'John',
  last_name: null,
  address: [
    {
      street_address: '1265 Barry'
    }
  ],
  phone_number: '+14243828604'
}

const placeholders = [
  {
    field: '{{recipient.first_name}}',
    value: recipient.first_name
  },

  {
    field: '{{ recipient.first_name }}',
    value: recipient.first_name
  },

  {
    field: '{{ recipient.first_name or "foo"}}',
    value: recipient.first_name
  },

  {
    field: '{{ recipient.first_name    or    "foo"}}',
    value: recipient.first_name
  },

  {
    field: '{{ recipient.first_name    or"foo"}}',
    value: recipient.first_name
  },

  {
    field: '{{recipient.empty_attribute}}',
    value: ''
  },

  {
    field: '{{recipient.last_name}}',
    value: ''
  },

  {
    field: '{{recipient.last_name or "last"}}',
    value: 'last'
  },

  {
    field: '{{recipient.empty_attribute or "foo"}}',
    value: 'foo'
  },

  {
    field: '{{recipient.empty_attribute or ""}}',
    value: ''
  },

  {
    field: '{{recipient.empty_attribute or "😀"}}',
    value: '😀'
  },

  {
    field: '{{recipient.phone_number}}',
    value: '(424) 382-8604'
  },

  {
    field: '{{recipient.address.0.street_address}}',
    value: recipient.address[0].street_address
  },

  {
    field: '{{recipient.address.0.full_address}}',
    value: ''
  },

  {
    field: '{{recipient.address.0.full_address or "foo"}}',
    value: 'foo'
  },

  {
    field: '{{recipient.address.0.full_address or ""}}',
    value: ''
  },
]

const bogus = [
  {
    field: '{{recipient.address.0.full_address or \'\'}}',
  },

  {
    field: '{{recipient.address.0.full_address or "}}',
  },

  {
    field: '{{recipient.address.0.full_address or }}',
  },

  {
    field: '{{recipient full_address}}',
  },

  {
    field: '{{recipient}}',
  },

  {
    field: '{{  or }}',
  },

  {
    field: '{{ or process.exit() }}',
  },

  {
    field: '{{ or foo }}'
  }
]


const testPlaceholder = ({field, value}) => {
  const must = lorem.replace(/PLACEHOLDER_HERE/g, value)
  const text = lorem.replace(/PLACEHOLDER_HERE/g, field)
  const result = render(text, {recipient})

  expect(result).to.equal(must)
}

describe('Email campaign placeholders', () => {
  for(const placeholder of placeholders) {
    it(`Test placeholder ${placeholder.field}`, testPlaceholder.bind(null, placeholder))
  }

  for(const { field } of bogus) {
    const value = field
    it(`Test bogus placeholder ${field}`, testPlaceholder.bind(null, { field, value }))
  }
})
