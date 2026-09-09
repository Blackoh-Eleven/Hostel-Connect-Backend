const mongoose = require('mongoose')

const petitionerSchema = new mongoose.Schema({
    petitionerName: String,
    department:String,
    level:String,
    email:String
})

const petitionerFormat = mongoose.model('Petitions',petitionerSchema)
module.exports = petitionerFormat