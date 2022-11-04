const mongoose = require('mongoose').set('debug', true);
const Schema = mongoose.Schema;

const SerialKeys = Schema({
    userId: {
        type: String,
        required: true,
    },
    serialKey: {
        type: String,
        required: true,
    },
    machineId: {
        type: String,
        required: true
    }
}, { collection: 'SerialKeys' }, { __v: false });

module.exports = mongoose.model('SerialKeys', SerialKeys);