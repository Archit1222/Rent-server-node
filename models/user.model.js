const mongoose = require('mongoose')
const { gameConstants } = require('../helpers/constant')

const userSchema = mongoose.Schema({
    userName: { type: String, default: null },
    fullName: { type: String, default: null },
    day: { type: String, default: null },
    month: { type: String, default: null },
    year: { type: String, default: null },
    profileImage: { type: String, default: null },
    country: { type: String, default: null },
    email: { type: String, default: null },
    socialEmail: { type: String, default: null },
    password: { type: String, default: null },
    deviceToken: { type: String, default: null },
    deviceType: { type: String, default: null },
    phoneVerified: { type: Boolean, default: false },
    completeProfile: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    isBlock: { type: Boolean, default: false },
    otp: { type: String, default: null },
    socketId: { type: String, default: null },
    userType: { type: String, default: "email" },
    coins: { type: Number, default: parseInt(process.env.COINS) },
    refferalCode: { type: String, default: null },
    selfRefferalCode: { type: String, default: null },
    avatar: { type: String, default: null },
    randomMatchInterval: { type: String, default: null },
    randomMatchTimeout: { type: String, default: null },
    bidCardTimeOut: { type: String, default: null },
    timerStartTime: { type: Date, default: null },
    language: { type: String, default: 'en' },
    inMatch: { type: Boolean, default: false },
    alreadyPlayed: [{ type: mongoose.Types.ObjectId, default: null, ref: 'user' }],
    onHomePage: { type: Boolean, default: false },
    netOff: { type: Boolean, default: false },
    lastMatch: { type: String, default: null },
    totalWins: { type: Number, default: 0 },
    socialId: { type: String, default: null },
    //type:{type: String, default: null,enum:['apple','google'] },
    firstLogin:{type:Boolean,default:true},
    gender:{type:String,enum:["male","female","others",null],default:null,allowNull:true}
}, { timestamps: true })

module.exports = mongoose.model('user', userSchema)

