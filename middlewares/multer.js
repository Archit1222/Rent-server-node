const multer = require('multer')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/user')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname)
    }
})

module.exports = multer({ storage: storage }).single('profileImage')