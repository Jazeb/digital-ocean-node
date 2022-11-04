const mongoose = require('mongoose').set('debug', true);
const Schema = mongoose.Schema;

const KeysCollection = Schema({
    serialKey: {
        type: String,
        required: true,
    }
}, { collection: 'KeysCollection' }, { __v: false });

module.exports = mongoose.model('KeysCollection', KeysCollection);