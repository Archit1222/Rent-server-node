const userRoutes = require('express').Router()
const userController = require('../../controllers/v1/user.controller')

const { auth } = require('../../middlewares/auth')

const { validator } = require('../../middlewares/validator')
const validation = require('../../validations/user.validations')

const multer = require('../../middlewares/multer')


// userRoutes.use(multer)

userRoutes.post('/signUp', validator(validation.signUp), userController.signUp)

userRoutes.post('/login', validator(validation.login), userController.login)

userRoutes.post('/forgot', validator(validation.forgot), userController.forgot)

userRoutes.post('/reset', validator(validation.resetPassword), userController.resetPassword)

userRoutes.post('/completeProfile', auth, multer, validator(validation.completeProfile), userController.completeProfile)

userRoutes.post('/refferal', auth, validator(validation.refferal), userController.refferal)

userRoutes.post('/getProfile', auth, userController.getProfile)

userRoutes.post('/editProfile', auth, userController.editProfile)

userRoutes.get('/verify-email', userController.verifyEmail)


userRoutes.post('/verify-otp', validator(validation.verifyOtp), userController.verifyOtp)

userRoutes.get('/shop-list', auth, userController.getShopItems)

userRoutes.post('/register-tournament', auth, userController.registerTournament)

userRoutes.post('/notification-list', auth, userController.notificationList)

userRoutes.post('/shop-purchase', auth, userController.shopPurchase)

userRoutes.post('/coin-purchase', auth, userController.purchaseCoins)

userRoutes.get('/shopImages', userController.getShops)

userRoutes.get('/logout', auth, userController.logout)

userRoutes.get('/delete', auth, userController.deleteUser)

userRoutes.get('/privacyPolicy', userController.privacyPolicy)

userRoutes.get('/termsAndConditions', userController.termsAndConditions)

userRoutes.post('/get-fixture-data', auth, validator(validation.getFixtureScreen), userController.getFixtureSrceenData)

userRoutes.get('/get-version', userController.getVersion)

userRoutes.post('/contact-us',validator(validation.contactUs),auth, userController.contactUs)

userRoutes.post('/enterShop',validator(validation.enterShop),auth, userController.enterShop)

userRoutes.post('/admin-contact-us',validator(validation.admincontactUs), userController.admincontactUs)

//userRoutes.post('/contact-us', userController.enterShop)

userRoutes.get('/contact-us-page', userController.contactusPage)





module.exports = userRoutes
