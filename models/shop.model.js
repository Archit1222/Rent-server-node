const mongoose = require('mongoose')

const { shopConfig } = require('../helpers/shopConfig')
const shopSchema =new  mongoose.Schema({
    name: { type: String },
    status: { type: String, enum:["rented","non-rented"] },
    users: [{ type: mongoose.Types.ObjectId, default: null, ref: 'user'}],
    rentUser:{type: mongoose.Types.ObjectId, default: null, ref: 'user'}

}, { timestamps: true })

module.exports = mongoose.model('shop', shopSchema)

//this.model.insertMany(shopConfig.shopData).then()
