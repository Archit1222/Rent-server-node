const mongoose = require('mongoose')
const counterSchema = mongoose.Schema({
    counter: { type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('logincounter', counterSchema)