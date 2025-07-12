const yup = require('yup');
const { gameConstants, messages, typeOfVersion } = require('../helpers/constant');

module.exports.signUp = yup.object({
    body: yup.object({
        // phone: yup.string().required(),
        // countryCode: yup.string().required(),
        userName:yup.string().required(),
        email: yup.string().required().email(),
        password: yup.string().required(),
        refferal: yup.string().optional(),
        gender:yup.string().optional().oneOf(["male","female","others"])
    })
})

module.exports.forgot = yup.object({
    body: yup.object({
        email: yup.string().required().email()
    })
})

module.exports.forgotLink = yup.object({
    body: yup.object({
        token: yup.string().required()
    })
})

module.exports.login = yup.object({
    body: yup.object({
       // type: yup.string().oneOf(['google', 'apple']).required(),
        //userName: yup.string().required(),
        //socialId: yup.string().required(),
        email: yup.string().required(),
        password:yup.string().required(),
        deviceToken: yup.string().optional(),
       // deviceToken: yup.string().required(),
        // deviceToken: yup.string().required('Something went wrong. Please restart the application.')
    })
})

module.exports.adminLogin = yup.object({
    body: yup.object({
        email: yup.string().optional().email(),
        password: yup.string().optional(),
    })
})

module.exports.resetPassword = yup.object({
    body: yup.object({
        email:yup.string().required().email(),
        password: yup.string().optional(),
        otp: yup.string().optional(),
        isOtp:yup.boolean().required()
    })
})

module.exports.resetPasswordAdmin = yup.object({
    body: yup.object({
        token: yup.string().required(),
        password: yup.string().required(),
    })
})

module.exports.completeProfile = yup.object({
    body: yup.object({
        userName: yup.string().required(),
        fullName: yup.string().required(),
        day: yup.string().required(),
        month: yup.string().required(),
        year: yup.string().required(),
        country: yup.string().required()
    })
})

module.exports.verifyOtp = yup.object({
    body: yup.object({
        email: yup.string().required().email(),
        otp: yup.number().required(),
        // type: yup.string().oneOf(['signUp', 'forgot']).required()
    })
})

module.exports.blockUser = yup.object({
    body: yup.object({
        user: yup.string().matches(gameConstants.regexForMongoId, 'Please enter valid mongodb object id').required()
    })
})

module.exports.verify = yup.object({
    body: yup.object({
        phone: yup.string().required(),
        countryCode: yup.string().required(),
        otp: yup.string().required(),
        type: yup.string().oneOf(['signUp', 'forgot']).required()
    })
})

module.exports.sync = yup.object({
    body: yup.object({
        sync: yup.array().of(
            yup.object({
                phone: yup.string().required(),
                //  countryCode: yup.string().required(),
            })
        ).required(),
    })
})

module.exports.addFriend = yup.object({
    body: yup.object({
        userId: yup.string().matches(gameConstants.regexForMongoId, messages.validUserId).required(),
    })
})

module.exports.leaderBoard = yup.object({
    body: yup.object({
        status: yup.string().oneOf(['daily', 'weekly', 'monthly', 'yearly', 'all']).required()
    })
})

module.exports.changePassword = yup.object({
    body: yup.object({
        oldPassword: yup.string().required(),
        newPassword: yup.string().required(),
    })
})

module.exports.addTournament = yup.object({
    body: yup.object({
        name: yup.string().required(),
        dateTime: yup.string().required(),
        totalPlayers: yup.string().required(),
        registerCoins: yup.string().required(),
    })
})

module.exports.tournamentDetail = yup.object({
    body: yup.object({
        tournament: yup.string().matches(/^[0-9a-zA-Z]{24}$/, 'Required valid object Id').required(),
        offset: yup.number().optional(),
        limit: yup.number().optional()
    })
})

module.exports.notificationEdit = yup.object({
    body: yup.object({
        id: yup.string().matches(gameConstants.regexForMongoId, "Please enter valid id.").required(),
    })
})

module.exports.addShopItem = yup.object({
    body: yup.object({
        name: yup.string().required(),
        status: yup.string().oneOf(["rented","non-rented"]).required()
    })
})


module.exports.editShopItem = yup.object({
    body: yup.object({
       id: yup.string().required(),
       name: yup.string().required(),
       status: yup.string().oneOf(["rented","non-rented"]).required()
    })
})

module.exports.getFixtureScreen = yup.object({
    body: yup.object({
        tournament: yup.string().required()
    })
})

module.exports.contactUs = yup.object({
    body: yup.object({
        email: yup.string().required().email(),
        concern:yup.string().required(),
        name:yup.string().required(),
        shopType:yup.string().required()
    })
})

module.exports.enterShop = yup.object({
    body: yup.object({
        shopId: yup.string().required()
    })
})

module.exports.refferal = yup.object({
    body: yup.object({
        refferal: yup.string().required(),
    })
})

module.exports.versoinUpdate = yup.object({
    body: yup.object({
        androidVersion: yup.string().required(),
        iosVersion: yup.string().required()
    })
})


module.exports.manualUser = yup.object({
    body: yup.object({
        userName:yup.string().required(),
        email: yup.string().required().email(),
        password: yup.string().required(),
        gender:yup.string().required().oneOf(["male","female","others"])
    })
})