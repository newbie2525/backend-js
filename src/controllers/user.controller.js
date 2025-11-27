import { asynchandler } from "../utils/asynchandle.js"
import { ApiError } from "../utils/ApiError.js";
import { user } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser=asynchandler(async(req,res)=>{
   // get user details from frontend
   //validation - not empty
   //check if user already exists ; useraname or email
   //check for images,check for avatar
   //upload them to cloudinary,avatar
   //create user object-create entry in db
   //remove password and refresh token field from response
   //check for user creation
   //return res



const {fullName,email,username,password}=req.body
console.log("email :",email);

// if(fullName=""){
//     throw new ApiError(400,"FULL NAME IS REQUIRED")
// }
if([fullName,email,username,password].some((field)=>field?.trim()==="")){
    throw new ApiError(400,"ALL FIELDS ARE REQUIRED")
}
const existedUser=user.findOne({
    $or:[{username},{email}]
})
if(existedUser){
    throw new ApiError(409,"user with email already exists" )
}
 
const avatarLocalPath=req.files?.avatar[0]?.path
const coverImageLocalPath=req.files?.coverImage[0]?.path

if(!avatarLocalPath){
    throw new ApiError(400,"avatar file is required")
}
 const avatar=await uploadOnCloudinary(avatarLocalPath)
 const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
    throw new ApiError(400,"avatar file is required")
}
const user= await user.create({fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
})
    const createdUser=await user.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"USER REGISTERED SUCCESSFULLY")
    )
} )

export {registerUser}