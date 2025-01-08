//user details

const mongoose=require('mongoose')
const user_schema= new mongoose.Schema({
    username:{type:String,required:true},
    password:{type:String,required:true},
    form_filled:{type:Boolean,default:false}
},{
    collection:"user_schema"
})

mongoose.model('user_schema',user_schema);
