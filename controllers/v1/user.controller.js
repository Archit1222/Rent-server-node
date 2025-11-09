const userSchema = require('../../models/user.model')
const gameSchema = require('../../models/game.model')
const shopSchema = require('../../models/shop.model')
const inappSchema = require('../../models/inapp.model')
const purchaseSchema = require('../../models/shoppurchase.model')
const notificationSchema = require('../../models/notification.model')
const tournamentSchema = require('../../models/tournament.model')
const QuerySchema= require('../../models/query.model')
const shopRentSchema= require('../../models/shopRent.model')

const { responseStatus, messages, gameConstants, socketConstants, swMessages, shopConstants, getBadge } = require('../../helpers/constant')

const { sendEmail } = require('../../helpers/email')

const utils = require('../../helpers/utils')

const ejs = require('ejs')

const sharp = require('sharp')

const moment = require('moment')

const matchSchema = require('../../models/match.model')

const { shopConfig } = require('../../helpers/shopConfig')
const { tournamentFixture } = require('./gamePlayhelper')
const adminModel = require('../../models/admin.model')
const countermodel= require('../../models/counter.model')
const shopModel = require('../../models/shop.model')
const { default: mongoose } = require('mongoose')

function stringGen(len) {
    var text = "";

    var charset = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < len; i++)
        text += charset.charAt(Math.floor(Math.random() * charset.length));

    return text;
}
module.exports.signUp = async (req, res, next) => {
    try {
        let message = messages
        const { email, password, refferal,userName,gender } = req.body
        let user = await userSchema.findOne({ email })
        const unverifiedCondition = user && !user.emailVerified
        if (!user || unverifiedCondition) {
            unverifiedCondition ? userSchema.deleteOne({ _id: user._id }).then() : null
            if (refferal) {
                const isValid = await userSchema.findOne({ selfRefferalCode: refferal, emailVerified: true })
                if (!isValid) {
                    return res.status(responseStatus.badRequest).json(utils.errorResponse(message.validRefferal));
                }
                // else {
                //     const updated = await userSchema.findOneAndUpdate({ _id: isValid._id }, { $inc: { coins: parseInt(process.env.REFFERAL_COINS) } }, { new: true })
                //     global.io.to(isValid.socketId).emit(socketConstants.coinsUpdate, { coins: updated.coins })
                // }
            }
            const userData = await userSchema({gender:gender|| null, userName,email, password: await utils.hashPassword(password), selfRefferalCode: stringGen(10), refferalCode: refferal ? refferal : null }).save()
            const token = utils.SIGNJWT({ id: userData._id })
            ejs.renderFile('views/verifyEmail.ejs', { email: email, url: `${process.env.SERVER_HOST}/api/v1/user/verify-email?userId=${token}`, year: new Date().getFullYear() }, (err, data) => {
                if (err) console.log(err)
                else sendEmail(email, 'Sign-up Email Verification', data)
            })
            return res.status(responseStatus.created).json(utils.successResponse(message.signUp, { userId: userData._id }));
        }
        else {
            return res.status(responseStatus.badRequest).json(utils.errorResponse(user.email == email ? message.emailExists : message.phoneExists));
        }

    } catch (error) {
        return next(error)
    }

}

module.exports.forgot = async (req, res, next) => {
    try {
        const { email } = req.body
        let message =  messages
        const user = await userSchema.findOne({ email })
        if (user) {
            if (!user.emailVerified) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.verifyEmailForgot))
            const otp = utils.generateOtp(6)
            ejs.renderFile('views/forgot.email.ejs', { email: user.email, otp, year: new Date().getFullYear() }, (err, data) => {
                if (err) console.log(err)
                else sendEmail(user.email, 'Restore Password', data)
            })
            userSchema.updateOne({ _id: user._id }, { otp }).then()
            return res.status(responseStatus.success).json(utils.successResponse(message.forgot))
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse(message.emailNotReg))

    } catch (error) {
        return next(error)
    }
}

module.exports.verifyOtp = async (req, res, next) => {
    try {
        const { email, otp, type } = req.body
        let message = req.headers.language == "sw" ? swMessages : messages
        const user = await userSchema.findOne({ email })
        if (user) {

            if (user.otp == otp) {

                return res.status(responseStatus.success).json(utils.successResponse(message.verifyOtp, { type, userId: user._id }))
            }
            else return res.status(responseStatus.badRequest).json(utils.errorResponse(message.correctOtp))
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse(message.userNot))

    } catch (error) {
        return next(error)
    }
}

module.exports.login = async (req, res, next) => {
    try {
        const { email, password, type="email" } = req.body
        let message =  messages

       // if (!deviceToken) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.deviceTokenError))
        const min = 1e15; // 1000000000000000
        const max = 1e16 - 1; // 9999999999999999

        let deviceToken=Math.floor(Math.random() * (max - min + 1)) + min; 

        if (type == "email") {
            if (!email) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.enterEmail))
            if (!password) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.enterPassword))
           // if (!language) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.enterLanguage))

            const user = await userSchema.findOne({ email })

            if (user && user.emailVerified) {
                if (user.isBlock) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.blocked))
                const checkPassword = await utils.comparePassword(user.password, password)
                if (checkPassword) {
                    //const alreadyMatch = await matchSchema.findOne({ players: user?._id, endTime: null }).lean()
                    //if (alreadyMatch) return res.status(responseStatus.badRequest).json(utils.errorResponse(user.language == "en" ? messages.alreadyInMatch : swMessages.alreadyInMatch))
                    //global.io.to(user.socketId).emit(socketConstants.error, { message: user.language == "en" ? messages.deviceErr : swMessages.deviceErr, status: 401 })
                    await countermodel.updateOne({},{$inc:{counter:1}})
                    await userSchema.updateOne({ _id: user._id }, { deviceToken})
                    const token = utils.SIGNJWT({ id: user._id, deviceToken, password: user.password })
                    return res.status(responseStatus.success).json(utils.successResponse(message.loggedIn, { token }))


                }
                return res.status(responseStatus.badRequest).json(utils.errorResponse(message.correctEmail))
            }
            else if (user && !user.emailVerified) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.verifyEmail))
            else return res.status(responseStatus.badRequest).json(utils.errorResponse(message.correctEmail))
        }
        else {
            if (!userName) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.userName))

            const user = await userSchema.findOne({ userName })
            if (user) {
                return res.status(responseStatus.badRequest).json(utils.errorResponse(message.userNameAlready))
            }
            else {
                const userData = await userSchema({ userName, userType: type, completeProfile: true, language }).save()
                userSchema.updateOne({ _id: userData._id }, { deviceToken }).then()
                const token = utils.SIGNJWT({ id: userData._id, deviceToken })
                return res.status(responseStatus.success).json(utils.successResponse(message.loggedIn, { token }))
            }
            // else {
            //     userSchema.updateOne({ _id: user._id }, { deviceToken }).then()
            //     const token = utils.SIGNJWT({ id: user._id, deviceToken })
            //     return res.status(responseStatus.success).json(utils.successResponse(messages.loggedIn, { token }))
            // }

        }
    }
    catch (err) {
        next(err)
    }


}


module.exports.login1 = async (req, res, next) => {
    try {

        let { type, userName, socialId, profilePicture = null, deviceToken, language } = req.body
        // check for socialId if exists then directly login else create new user

        let message = req.headers.language == "sw" ? swMessages : messages

        let userExists = await userSchema.findOne({ socialId })
        if (userExists) {
            if (userExists.isBlock) return res.status(responseStatus.badRequest).json(utils.errorResponse(user.language == "en" ? messages.blocked : swMessages.blocked))

            const alreadyMatch = await matchSchema.findOne({ players: userExists?._id, endTime: null }).lean()
            if (alreadyMatch) return res.status(responseStatus.badRequest).json(utils.errorResponse(user.language == "en" ? messages.alreadyInMatch : swMessages.alreadyInMatch))
            global.io.to(userExists.socketId).emit(socketConstants.error, { message: userExists.language == "en" ? messages.deviceErr : swMessages.deviceErr, status: 401 })
            const token = utils.SIGNJWT({ id: userExists._id, deviceToken })

            await userSchema.updateOne({ _id: userExists._id }, { deviceToken, language, firstLogin: false })

            return res.status(responseStatus.success).json(utils.successResponse(message.loggedIn, { token, completeProfile: userExists.completeProfile, firstLogin: false }))

        }
        else {
            // create new user 
            let createdUser = await userSchema({ type, userName, socialId, profileImage: profilePicture, deviceToken, language }).save()
            userSchema.updateOne({ _id: createdUser._id }, { deviceToken, selfRefferalCode: stringGen(10), firstLogin: false }).then()
            const token = utils.SIGNJWT({ id: createdUser._id, deviceToken })
            return res.status(responseStatus.success).json(utils.successResponse(message.loggedIn, { token, firstLogin: true }))
        }


    } catch (error) {
        next(error)
    }
}

module.exports.refferal = async (req, res, next) => {
    try {
        let { refferal } = req.body
        let message = req.headers.language == "sw" ? swMessages : messages
        const isValid = await userSchema.findOne({ selfRefferalCode: refferal })
        if (!isValid) {
            return res.status(responseStatus.badRequest).json(utils.errorResponse(message.validRefferal));
        }
        else {
            const updated = await userSchema.findOneAndUpdate({ _id: isValid._id }, { $inc: { coins: parseInt(process.env.REFFERAL_COINS) } }, { new: true })
            global.io.to(isValid.socketId).emit(socketConstants.coinsUpdate, { coins: updated.coins, badge: getBadge(updated.coins, false) })

            await userSchema.updateOne({ _id: req.user._id }, { refferalCode: refferal })

            return res.status(responseStatus.created).json(utils.successResponse(message.refferalComp));

        }

    } catch (error) {
        next(error)
    }
}

module.exports.resetPassword = async (req, res, next) => {

    const { email, password,otp,isOtp } = req.body
    console.log('req.body',req.body)
    let message = messages
    const user = await userSchema.findOne({ email: email })
    if (user) {
        if(isOtp){
            if(!otp){
              return res.status(responseStatus.badRequest).json(utils.errorResponse(message.otp))
            }
             if(String(user.otp)!==String(otp)){
             return res.status(responseStatus.badRequest).json(utils.errorResponse(message.invalidotp))
            }
            else{
                return res.status(responseStatus.success).json(utils.successResponse(message.verifyOtp))
            }
        }
       
        const newPassword = await utils.hashPassword(password)
        await userSchema.updateOne({ email: email }, { password: newPassword, otp: null })
        return res.status(responseStatus.success).json(utils.successResponse(message.resetPassword))
    }
    else return res.status(responseStatus.badRequest).json(utils.errorResponse(message.userNot))
}

module.exports.verifyEmail = async (req, res, next) => {
    const { userId } = req.query
    let message = req.headers.language == "sw" ? swMessages : messages
    if (userId && utils.verifyJwt(userId)) {
        const verify = await utils.verifyJwt(userId)

        const user = await userSchema.findOne({ _id: verify.id, emailVerified: false })
        if (user) {
            const refferal = user.refferalCode
            if (refferal) {
                const isValid = await userSchema.findOne({ selfRefferalCode: refferal, emailVerified: true })
                if (!isValid) {
                    return res.status(responseStatus.badRequest).json(utils.errorResponse(message.validRefferal));
                }
                else {
                    const updated = await userSchema.findOneAndUpdate({ _id: isValid._id }, { $inc: { coins: parseInt(process.env.REFFERAL_COINS) } }, { new: true })
                    global.io.to(isValid.socketId).emit(socketConstants.coinsUpdate, { coins: updated.coins, badge: getBadge(updated.coins, false) })
                }
            }
            await userSchema.updateOne({ _id: verify.id }, { emailVerified: true })
            return res.render('emailVerified')
        }
        else return res.render('linkExpire')
    }
    else return res.render('linkExpire')
}

// console.log('qqq', "09" == new Date().getDay())
module.exports.completeProfile = async (req, res, next) => {
    try {
        const { fullName, userName, day, month, year, country, avatar } = req.body
        let message = req.headers.language == "sw" ? swMessages : messages

        //age condition 
        if (moment().utc().diff(new Date(`${year}/${month}/${day}`), 'seconds') < 94608000) {
            return res.status(responseStatus.badRequest).json(utils.errorResponse(message.ageLimit))
        }

        // const dateCondition = (year > new Date().getFullYear()) || (month > (new Date().getMonth()) + 1) || (day > new Date().getDate())

        // if (dateCondition) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.validDate))

        let profileImage = null
        const alreadyUserName = await userSchema.aggregate([
            {
                $project: {
                    userName: { $toLower: "$userName" },
                    language: 1
                }
            },
            {
                $match: {
                    userName: userName.toLowerCase(),
                    _id: { $ne: utils.parseMongoId(req.user._id) },
                }
            }

        ])
        if (alreadyUserName.length > 0) return res.status(responseStatus.badRequest).json(utils.errorResponse(alreadyUserName.language == "en" ? messages.userNameAlready : swMessages.userNameAlready))

        if (req.file) {
            const newPath = `public/user/${Date.now()}.${req.file.mimetype.replace('image/', '')}`
            sharp(req.file.path)
                .resize(100)
                .toFile(newPath, (err, info) => {
                    if (err) console.log(err)
                })
            profileImage = newPath
        }

        const user = await userSchema.findOneAndUpdate({ _id: req.user._id }, {
            userName, country, day, month, year, fullName, completeProfile: true, profileImage, avatar: avatar ? avatar : null
        }, { new: true })


        return res.status(responseStatus.success).json(utils.successResponse(message.profileCompleted, {
            userName: user.userName,
            country: user.country,
            day: user.day,
            month: user.month,
            year: user.year,
            fullName: user.fullName,
            profileImage: user.profileImage,
            avatar: user.avatar
        }))

    } catch (error) {
        return next(error)
    }
}

module.exports.editProfile = async (req, res, next) => {
    try {
        const { userName,email } = req.body
        // let message =  messages
        // let avatar = req.body.avatar
        // console.log(req.body)
        // console.log('diff13', moment().diff(new Date(`${year}/${month}/${day}`), 'seconds'))
        // if (moment().utc().diff(new Date(`${year}/${month}/${day}`), 'seconds') < 94608000) {
        //     return res.status(responseStatus.badRequest).json(utils.errorResponse(message.ageLimit))
        // }

        // const alreadyUserName = await userSchema.aggregate([
        //     {
        //         $project: {
        //             userName: { $toLower: "$userName" },
        //             language: 1
        //         }
        //     },
        //     {
        //         $match: {
        //             _id: { $ne: utils.parseMongoId(req.user._id) },
        //             userName: userName.toLowerCase()
        //         }
        //     }

        // ])
        // console.log('eee', alreadyUserName)
        // if (alreadyUserName.length > 0) return res.status(responseStatus.badRequest).json(utils.errorResponse(alreadyUserName.language == "en" ? messages.userNameAlready : swMessages.userNameAlready))

        // let profileImage = null
        // if (req.file) {
        //     const newPath = `public/user/${Date.now()}.${req.file.mimetype.replace('image/', '')}`
        //     sharp(req.file.path)
        //         .resize(100)
        //         .toFile(newPath, (err, info) => {
        //             if (err) console.log(err)
        //         })
        //     profileImage = newPath
        //     avatar = null
        // }

        let updateObj=Object.assign({})

        if(email && email!=req.user.email){

            let userExists= await userSchema.findOne({email})
            if(userExists){
                return res.status(responseStatus.badRequest).json(utils.errorResponse("Email already exists."))
            }
            updateObj['email']=email
            updateObj['emailVerified']=false
             updateObj['deviceToken']=null
        }

        // if (avatar) profileImage = null

        // if (!avatar && !profileImage) {
        //     avatar = req.user.avatar
        //     profileImage = req.user.profileImage
        // }


        const user = await userSchema.findOneAndUpdate({ _id: req.user._id }, {
            userName: userName ? userName : req.user.userName,
            ...updateObj

        }, { new: true })

        return res.status(responseStatus.success).json(utils.successResponse(messages.profileUpdated,user))

    } catch (error) {
        return next(error)
    }
}

module.exports.getProfile = async (req, res, next) => {
    try {
        const user = req.user
        let message = messages
         let count= await countermodel.findOne({})

        let rentedShops= await shopSchema.find({rentUser:user._id})

        //const purchases = await purchaseSchema.find({ user: user._id }).populate({ path: 'item', select: 'name imageUrl type' })
        return res.status(responseStatus.success).json(utils.successResponse(message.profile, {
            userId: user._id,
            userName: user.userName,
            email:user.email,
            totaluserCount:count.counter,
            rentedShops,
            AvatarNumber:user.AvatarNumber
            // country: user.country,
            // day: user.day,
            // month: user.month,
            // year: user.year,
            // fullName: user.fullName,
            // completeProfile: user.completeProfile,
            // coins: user.coins,
            // profileImage: user.profileImage,
            // avatar: user.avatar,
            // selfRefferalCode: user.selfRefferalCode,
            // emojiPurchased: purchases.filter((e) => e.item.type === shopConfig.shopTypes[3]).map(e => e.item),
            // badge: getBadge(user.coins, false),
            // firstLogin: user.firstLogin,
        }))

    } catch (error) {
        next(error)
    }
}

module.exports.getShopItems = async (req, res, next) => {
    try {
        let message = req.headers.language == "sw" ? swMessages : messages
        const shops = await shopSchema.aggregate([
            {
                $limit: 1
            },
            {
                $lookup: {
                    from: 'shops',
                    pipeline: [
                        {
                            $lookup: {
                                from: "purchases",
                                let: { id: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$item', '$$id'] },
                                                    { $eq: ['$user', req.user._id] }
                                                ]

                                            }
                                        }
                                    }
                                ],
                                as: "purchase"
                            }
                        },
                        {
                            $project: {
                                name: { $cond: [{ $eq: [req.headers.language, 'en'] }, '$nameEn', '$nameSw'] },
                                type: 1,
                                cost: 1,
                                costType: 1,
                                imageUrl: 1,
                                coinsGet: 1,
                                isPurchased: { $gt: [{ $size: "$purchase" }, 0] },
                                createdAt: 1
                            }
                        },
                        {
                            $sort: { createdAt: -1 }
                        }

                    ],
                    as: 'shop'
                }
            },
            {
                $project: {
                    _id: 0,
                    coins: {
                        $filter: {
                            input: "$shop",
                            as: "item",
                            cond: { $eq: ["$$item.type", 'coins'] },
                        }
                    },
                    skins: {
                        $filter: {
                            input: "$shop",
                            as: "item",
                            cond: { $eq: ["$$item.type", 'skins'] },
                        }
                    },
                    cardDecks: {
                        $filter: {
                            input: "$shop",
                            as: "item",
                            cond: { $eq: ["$$item.type", 'cardDecks'] },
                        }
                    },
                    emojis: {
                        $filter: {
                            input: "$shop",
                            as: "item",
                            cond: { $eq: ["$$item.type", 'emojis'] },
                        }
                    },
                }
            }

        ])

        return res.status(responseStatus.success).json(utils.successResponse(message.shopList, shops[0]))

    } catch (error) {
        next(error)
    }
}


module.exports.shopPurchase = async (req, res, next) => {
    try {
        const { itemId } = req.body
        let message = req.headers.language == "sw" ? swMessages : messages
        if (!utils.validMongoId(itemId)) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.invalidItemId))
        const shopItem = await shopSchema.findOne({ _id: itemId })
        if (shopItem) {
            const shopCost = parseInt(shopItem.cost)
            if (req.user.coins >= shopCost) {
                await purchaseSchema({ item: itemId, user: req.user._id }).save()
                const updatedUser = await userSchema.findOneAndUpdate({ _id: req.user._id }, { $inc: { coins: (-shopCost) } }, { new: true })
                return res.status(responseStatus.success).json(utils.successResponse(message.ItemPurchase, { coins: updatedUser.coins, badge: getBadge(updatedUser.coins, false) }))
            }
            else return res.status(responseStatus.badRequest).json(utils.errorResponse(message.insufficentPurchase))
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse(message.itemNot))

    } catch (error) {
        next(error)
    }
}

module.exports.purchaseCoins = async (req, res, next) => {
    try {
        const { receipt, coins } = req.body
        let message = req.headers.language == "sw" ? swMessages : messages
        const { TransactionID } = JSON.parse(req.body.receipt)
        //if (TransactionID) {
        const alreadyExistTransaction = await inappSchema.findOne({ transactionId: TransactionID })
        if (alreadyExistTransaction) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.transactionId))
        //}
        if (!receipt) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.enterReciept))
        await inappSchema({ reciept: receipt, user: req.user, transactionId: TransactionID, coinsPurchased: coins }).save()

        //update coins
        const updateUser = await userSchema.findOneAndUpdate({ _id: req.user._id }, { $inc: { coins: coins } }, { new: true })

        return res.status(responseStatus.success).json(utils.successResponse(message.coinsPurchased, { coins: updateUser.coins, badge: getBadge(updateUser.coins, false) }))

    } catch (error) {
        next(error)
    }
}

//'knffllilaagkccllnnfakolk.AO-J1OzTsONB1c_x99Q3IwjxmKhVMe7r6SRuYRYsSHTIfM7crWh7TbMR2B5ZZm3pIlZwTCyzr6ln7xiNY2z_J5GWwnYJ923u5Q'


module.exports.getShops = async (req, res, next) => {
    try {
        let data = await shopSchema.find({}).select('imageUrl')
        let message = req.headers.language == "sw" ? swMessages : messages
        data = data.map(e => e.imageUrl)
        return res.status(responseStatus.success).json(utils.successResponse(message.shopList, data))

    } catch (error) {
        next(error)
    }

}

module.exports.notificationList = async (req, res, next) => {
    try {
        let message = req.headers.language == "sw" ? swMessages : messages
        const { offset, limit } = req.body
        const pagination = [{ $skip: offset ? offset : 0 }, { $limit: limit ? limit : 10 }]
        const notificationList = await notificationSchema.aggregate([
            {
                $match: {
                    $or: [
                        { userId: req.user._id, },
                        { type: "Admin Notification" }
                    ]

                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    type: 1,
                    createdAt: 1
                }
            },
            {
                "$facet": {
                    data: pagination,
                    totalCount: [
                        { "$count": "count" }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$totalCount",
                    preserveNullAndEmptyArrays: true
                }
            }


        ])
        let totalCount = notificationList && notificationList[0] && notificationList[0].totalCount ? notificationList[0].totalCount.count : 0
        return res.status(responseStatus.success).json(utils.successResponse(message.notificationList, {
            data: notificationList[0].data,
            paginationData: utils.paginationData(totalCount, limit ? limit : 10, offset ? offset : 0)
        }))

    } catch (error) {
        next(error)
    }
}




module.exports.logout = async (req, res, next) => {
    try {
        //delete account in guest mode
        let message =  messages
        
        await userSchema.updateOne({ _id: req.user._id }, { deviceToken: null, socketId: null })
        return res.status(responseStatus.success).json(utils.successResponse(message.logout))

    } catch (error) {
        next(err)
    }
}

module.exports.registerTournament = async (req, res, next) => {
    try {
        let message = req.headers.language == "sw" ? swMessages : messages
        const { tournamentId } = req.body
        const tournamnetDetails = await tournamentSchema.findOne({ _id: tournamentId })
        if (tournamnetDetails) {

            if (tournamnetDetails.isStart) return res.status(responseStatus.badRequest).json(utils.errorResponse(message.tournamentStart))
            if (req.user.coins < tournamnetDetails.registerCoins) {
                return res.status(responseStatus.badRequest).json(utils.errorResponse(message.insufficentCoinsTour))
            }
            else if (tournamnetDetails.players.map(e => e.toString()).includes(String(req.user._id))) {
                global.io.emit('registeredUsers', { tournament: tournamnetDetails?._id, playersCount: parseInt(tournamnetDetails?.players.length - 1) || 0 })


                let [result] = await Promise.all([
                    userSchema.findOneAndUpdate({ _id: req.user._id }, { $inc: { coins: tournamnetDetails.registerCoins } }, { new: true }),
                    tournamentSchema.updateOne({ _id: tournamentId }, { $pull: { players: req.user._id } })
                ])
                io.to(req.user.socketId).emit(socketConstants.coinsUpdate, { coins: req.user.coins + tournamnetDetails.registerCoins, badge: getBadge(req.user.coins + tournamnetDetails.registerCoins, false) })

                return res.status(responseStatus.success).json(utils.successResponse(message.unregistered, result.coins))
            }
            else if (tournamnetDetails.totalPlayers == tournamnetDetails.players.length) {
                return res.status(responseStatus.badRequest).json(utils.errorResponse(message.maximumPlayers))
            }
            else {
                global.io.emit('registeredUsers', { tournament: tournamnetDetails?._id, playersCount: parseInt(tournamnetDetails?.players.length + 1) || 0 })

                //deduct user coins
                let [result] = await Promise.all([
                    userSchema.findOneAndUpdate({ _id: req.user._id }, { $inc: { coins: -(tournamnetDetails.registerCoins) } }, { new: true }),
                    tournamentSchema.updateOne({ _id: tournamentId }, { $addToSet: { players: req.user._id } })
                ])
                return res.status(responseStatus.success).json(utils.successResponse(message.tournamentReg, result.coins))
            }
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse(message.tournamentNot))
    }
    catch (err) {
        next(err)
    }

}

module.exports.deleteUser = async (req, res, next) => {
    try {
        const { _id, language } = req.user
        await userSchema.deleteOne({ _id })

        await shopRentSchema.deleteMany({userId:_id})
        return res.status(responseStatus.success).json(utils.successResponse(messages.deleteAccount))
    }
    catch (err) {
        next(err)
    }

}

module.exports.sendEmail = async (req, res, next) => {
    try {
        const { title, message,owneremail } = req.body

        if(!title){
            return res.status(responseStatus.badRequest).json(utils.errorResponse("Title is required."))
        }

        if(!message){
            return res.status(responseStatus.badRequest).json(utils.errorResponse("Message is required."))
        }

         ejs.renderFile('views/contactemail.ejs', { email:req.user.email, message,name:"" }, (err, data) => {
                if (err) console.log(err)
                else  sendEmail(owneremail,title,data)
        })
       
        return res.status(responseStatus.success).json(utils.successResponse("Message sent successfully."))
    }
    catch (err) {
        next(err)
    }

}

module.exports.privacyPolicy = async (req, res, next) => {

    try { return res.render('privacyPolicy.ejs'); }
    catch (err) { next(err); }
}

module.exports.termsAndConditions = async (req, res, next) => {

    try { return res.render('termsAndConditions.ejs'); }
    catch (err) { next(err); }
}


module.exports.contactusPage = async (req, res, next) => {

    try { return res.render('contactus.ejs'); }
    catch (err) { next(err); }
}

module.exports.getFixtureSrceenData = async (req, res, next) => {

    try {

        const { tournament } = req.body;
        if (!utils.validMongoId(tournament)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.tournamentNot));

        const tournamentDetails = await tournamentSchema.findOne({ _id: tournament }).populate("joinedPlayers");

        if (!tournamentDetails) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.tournamentNot));
        if (tournamentDetails.isEnd) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.tournamentEnded, { winner: tournamentDetails.winner }));

        const fixture = await tournamentFixture(tournamentDetails);
        const updatedFixture = [];

        fixture?.map(i => { updatedFixture.push({ ...i, status: { ...i.status, message: req.user.language == 'en' ? messages[i.status.message] : swMessages[i.status.message] } }) })
        return res.status(responseStatus.success).json({ fixture: updatedFixture, tournament: { ...tournamentDetails._doc, winningAmount: (tournamentDetails.registerCoins * tournamentDetails?.totalPlayers) * 0.75, joinedPlayers: tournamentDetails?.joinedPlayers?.length || 0 } })
    }
    catch (err) { next(err); }
}

module.exports.getVersion = async (req, res, next) => {
    try {
        let adminData = await adminModel.findOne({})

        return res.status(responseStatus.success).json(utils.successResponse('Please update the app to continue.', {
            iosVersion: adminData?.iosVersion,
            androidVersion: adminData?.androidVersion
        }))

    } catch (error) {
        next(error)
    }
}

module.exports.contactUs = async (req, res, next) => {
    try {
       const {email,concern,name,shopType,shopId}=req.body

       let query= await QuerySchema.create({email,concern,userId:req.user._id,name,shopType,shopId})

        return res.status(responseStatus.success).json(utils.successResponse('Query updated to admin successfully.', query))

    } catch (error) {
        next(error)
    }
}

module.exports.admincontactUs = async (req, res, next) => {
    try {
       const {email,message,name}=req.body

         ejs.renderFile('views/contactemail.ejs', { email: email, name, message }, (err, data) => {
                if (err) console.log(err)
                else sendEmail(process.env.ADMIN_MAIL,"Contact-us",data)
            })

       

        return res.status(responseStatus.success).json(utils.successResponse('Request sent successfully.'))

    } catch (error) {
        next(error)
    }
}


module.exports.enterShop = async (req, res, next) => {
    try {
       const {shopId}=req.body

      if (!utils.validMongoId(shopId)) return res.status(responseStatus.badRequest).json(utils.errorResponse("Invalid shopId"));

      //let shopRentStatus= await shopRentSchema.findOne({userId:req.user._id,shopId})

    //   if(shopRentStatus){
    //     return res.status(responseStatus.badRequest).json(utils.errorResponse("Shop already rented."));
    //   }

      let shopRent=await shopRentSchema({shopId,userId:req.user._id}).save()


      let shopCounter=await shopRentSchema.find({shopId}).count()


      let count= await countermodel.findOne({})

      return res.status(responseStatus.success).json(utils.successResponse('Entry noted successfully.', {
        shopRent,
        totaluserCount:count.counter,
        shopCounter
    }))

    } catch (error) {
        next(error)
    }
}

module.exports.ownerDashboard = async (req, res, next) => {
    try {
        let storeCount= await shopModel.find({rentUser:req.user._id}).count()
        let queryCount= await QuerySchema.aggregate([
            {
                $lookup:{
                    from:"shops",
                    localField:"shopId",
                    foreignField:"_id",
                    as:"shop"
                }
            },
            {
                $unwind:{
                    path:"$shop"
                }
            },
            {
                $match:{
                    'shop.rentUser':req.user._id
                }
            }

        ])

       let vistorCount=  await shopRentSchema.aggregate([
             {
                $lookup:{
                    from:"shops",
                    localField:"shopId",
                    foreignField:"_id",
                    as:"shop"
                }
            },
            {
                $unwind:{
                    path:"$shop"
                }
            },
            {
                $match:{
                    'shop.rentUser':req.user._id
                }
            }           
        ])
        return res.status(responseStatus.success).json(utils.successResponse("Sucess", { storeCount
            ,queryCount:queryCount.length,shopVistorCount:vistorCount
         }))

    } catch (error) {
        next(error)
    }
}
