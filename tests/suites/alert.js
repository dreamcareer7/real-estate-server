var criteria = require('./data/alert_criteria.js');


registerSuite('room', ['create']);

var create = (cb) => {
    return frisby.create('create alert')
        .post('/rooms/' + results.room.create.data.id + '/alerts', criteria)
        .after(cb)
        .expectHeaderContains('Content-Type', 'json')
        .expectStatus(200)
        .expectJSON({
            code: 'OK',
            data: criteria
        });
}

var virtual = (cb) => {
    var criteria = require('./data/valert_criteria.js')
    return frisby.create('virtual alert')
        .post('/valerts', criteria)
        .after(cb)
        .expectHeaderContains('Content-Type', 'json')
        .expectStatus(200)
        .expectJSON({
            code: 'OK',
            data: [
                {
                    type: 'compact_listing'
                }
            ]
        })
}


var bulkAlertShare = (cb) => {
    return frisby.create('bulk alert share')
        .post('/alerts', {alert: results.alert.create.data})
        .after(cb)
        .expectHeaderContains('Content-Type', 'json')
        .expectStatus(200)
        .expectJSON({
            code: 'OK'
        })
        .expectJSONTypes({
            code: String,
            data: Array,
            info: Object
        });
}

var patchAlert = (cb) => {
    return frisby.create('patch alert')
        .put('/rooms/' + results.alert.create.data.room + '/alerts/' + results.alert.create.data.id)
        .after(cb)
        .expectHeaderContains('Content-Type', 'json')
        .expectStatus(200)
        .expectJSON({
            code: 'OK'
        })
        .expectJSONTypes({
            data: Object
        });
}

var getRoomAlerts = (cb) => {
    return frisby.create('get room alerts')
        .get('/rooms/' + results.alert.create.data.room + '/alerts')
        .after(cb)
        .expectHeaderContains('Content-Type', 'json')
        .expectStatus(200)
        .expectJSON({
            code: 'OK'
        })
        .expectJSONTypes({
            data: Object,
            info: Object
        });
}

var getAlerts = (cb) => {
    return frisby.create('get room alerts')
        .get('/alerts')
        .after(cb)
        .expectHeaderContains('Content-Type', 'json')
        .expectStatus(200)
        .expectJSON({
            code: 'OK'
        })
        .expectJSONTypes({
            data: Object,
            info: Object
        });
}

var deleteAlert = (cb) => {
    return frisby.create('delete alert')
        .delete('/rooms/' + results.alert.create.data.room + '/alerts/' + results.alert.create.data.id)
        .after(cb)
        .expectStatus(204)
}


module.exports = {
    create,
    virtual,
    bulkAlertShare,
    patchAlert,
    getRoomAlerts,
    getAlerts,
    deleteAlert
}