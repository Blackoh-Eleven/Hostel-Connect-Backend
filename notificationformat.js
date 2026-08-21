const mongoose = require('mongoose');

const notification = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },

    message: {
        type:String,
        required:true
    },

    read:{
        type:Boolean,
        default:false
    }
});

const NotificationFormat = mongoose.model("notify",notification);
module.exports = NotificationFormat