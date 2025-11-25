import dotenv from "dotenv"
dotenv.config({
    path:'./env'
})
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
import connectDB from "./db/index.js";
connectDB();
/*
import express from "express"
const app=express()
(async ()=>{ 
    try{
        await mongoose.connect('${process.env.MONGODB_URL}/${DB_NAME}')
        app.on("error",()=>{console.log("error",error);
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`app is listening at port ${process.env.PORT}`);
            
        })
    }
    catch(error){
        console.error("ERROR:",error);
        throw error  
    }

})()
*/