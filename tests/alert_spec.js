var Tests  = require('./Tests.js');

var criteria = {'title':'Test Title','maximum_price':10,'maximum_lot_square_meters':20,'minimum_bathrooms':1,'maximum_square_meters':80,'location':{'longitude':-96.829745315497,'latitude':32.872731293644},'horizontal_distance':3430.2113073037,'property_type':'Residential','vertical_distance':3430.2113073037,'minimum_square_meters':0,'minimum_lot_square_meters':0,'currency':'USD','maximum_year_built':2015,'minimum_year_built':0,'points':[{'longitude':-96.849273508670,'latitude':32.900630987905},{'longitude':-96.810217122324,'latitude':32.900630987905},{'longitude':-96.810217122324,'latitude':32.842285247314},{'longitude':-96.849273508670,'latitude':32.842285247314},{'longitude':-96.849273508670,'latitude':32.900630987905}],'minimum_bedrooms':0,'minimum_price':0,'property_subtypes':['RES-Single Family','RES-Half Duplex','RES-Farm\/Ranch','RES-Condo','RES-Townhouse']};

var room;

var createRoom = (cb) => {
  var create = require('./room_spec.js').createRoom;

  var fn = create((err, json) => {
    room = json.data;
    cb(null, json);
  })

  return fn;
}

var createAlert = (cb) => {
  return frisby.create('create alert')
  .post('/rooms/'+room.id+'/alerts', criteria)
  .after(cb)
  .expectStatus(200)
  .expectJSON({
      code:'OK',
      data:criteria
    });
}

var curlify = require('request-as-curl');

var vcriteria = { maximum_price: 9223372036854776000,
limit: '75',
maximum_lot_square_meters: 856872169904754400,
minimum_bathrooms: 1,
maximum_square_meters: 856872169904754400,
location: { longitude: -96.7981853613128, latitude: 32.84284394397976 },
horizontal_distance: 1200,
property_type: 'Residential',
vertical_distance: 1200,
minimum_square_meters: 0,
minimum_lot_square_meters: 0,
currency: 'USD',
maximum_year_built: 2015,
minimum_year_built: 0,
points:
 [ { longitude: -96.8137143351765, latitude: 32.86503819566057 },
   { longitude: -96.78265638744912, latitude: 32.86503819566057 },
   { longitude: -96.78265638744912, latitude: 32.81862570220059 },
   { longitude: -96.8137143351765, latitude: 32.81862570220059 },
   { longitude: -96.8137143351765, latitude: 32.86503819566057 } ],
minimum_bedrooms: 0,
minimum_price: 0,
property_subtypes:
 [ 'RES-Single Family',
   'RES-Half Duplex',
   'RES-Farm/Ranch',
   'RES-Condo',
   'RES-Townhouse' ],
created_by: '66f30c4e-6d33-11e5-8206-230211c15dec' }

var vAlert = (cb) => {
  return frisby.create('virtual alert')
  .post('/valerts', vcriteria)
  .expectStatus(200)
  .after( (err, res) => {
//     console.log(curlify(res.req, vcriteria));
//     console.log(res.headers['content-length']);
    cb(err, res);
  } );
}

var tasks = {
//   createRoom,
//   createAlert,
  vAlert
}

Tests.run(tasks);