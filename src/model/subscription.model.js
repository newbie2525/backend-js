import mongoose,{Schema} from "mongoose";
 const subscriptionSchema=new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,//who is subscribing
        ref:"User",
        
    },
    channel:{
        type:Schema.Types.ObjectId,//to which channel
        ref:"User",
    }
 },{timewstamps:true})
export const Subscription=mongoose.model("Subscription",subscriptionSchema)