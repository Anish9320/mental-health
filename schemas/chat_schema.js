const mongoose = require('mongoose');

//Schema
const chatSchema = new mongoose.Schema({
    userId:{
        type: Number,
        required: true
    },
    userName:{
        type: String,
        required: true
    },
    textMessage: {
        type: String,
        required: true
    },
    sentDate:{
        type: Date,
        required : true
    },
    messageReceipt:{
        type: Number,
        required: true
    }
},
    {
        timestamps:true
    }
)

const ChatModel = mongoose.model("mental health Chat",chatSchema)

module.exports = {ChatModel}