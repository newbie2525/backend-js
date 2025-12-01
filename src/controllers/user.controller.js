import { asynchandler } from "../utils/asynchandle.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";   // ⬅️ renamed
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {jwt} from "jsonwebtoken"
const generateAccessAndRefreshTokens= async(userId)=>{
  try{
    const user=await User.findById(userId)
    const accessToken=user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()

    user.refreshToken=refreshToken
    await user.save({validateBeforeSave :false})

    return {accessToken,refreshToken}
  }
  catch(error){
    throw new ApiError(500,"something went wrong while generating refresh and access tokens")
  }
}
const registerUser = asynchandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  console.log("email:", email);

  // validate fields
  if ([fullName, email, username, password].some(field => field?.trim() === "")) {
    throw new ApiError(400, "ALL FIELDS ARE REQUIRED");
  }

  // user already exists?
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (existedUser) {
    throw new ApiError(409, "user with email or username already exists");
  }
 // console.log(req.files);
  

  // multer file paths
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar upload failed");
  }

  // create user in DB
  const newUser = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  });

  // fetch without sensitive fields
  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "USER REGISTERED SUCCESSFULLY")
  );
});
const loginUser =asynchandler(async(req,res)=>{
  //req body - > data
  //username or email based access
  //find the user
  //password check
  //access and refresh token
  //send cookies
  //response
  const {email,username,password}=req.body

  if (!username && !email) {
    throw new ApiError(400,"username or password is required")
  }
   const user=await User.findOne({
    $or:[{username},{email}]
  })
  if(!user){
    throw new ApiError(404,"user not registered")
  }
  const isPasswordValid= await user.isPasswordCorrect(password)
   if(!isPasswordValid){
    throw new ApiError(401,"Invalid user credentials")
  }
  const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

  const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

  const options={
    httpOnly:true,
    secure:false
  }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(200,{
        user:loggedInUser,accessToken,refreshToken
      },
      "user logged in Succesfully"
    )
    )
})
const logoutUser=asynchandler(async(req,res)=>{
 await User.findByIdAndUpdate(req.user._id,{$set:{
    refreshToken:undefined
  }
  },{
    new:true
  })
  
  const options={
    httpOnly:true,
    secure:true
  }
  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{},"User logged Out"))
})
const refreshAccessToken = asynchandler(async(req,res)=>{
  //req.cookies.refreshToken — if using cookies
  //req.body.refreshToken — if sent inside request body
  const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized request")
  }

  try {
    const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
    const user=await User.findById(decodedToken?._id)
    if(!user){
      throw new ApiError(401,"Invalid refresh token")
    }
    if(incomingRefreshToken!== user?.refreshToken){
      throw new ApiError(401,"refresh token expired")
    }
  
    const options={
      httpOnly:true,
      secure:true
    }
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)
  
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(
        200,{accessToken,refreshToken: newRefreshToken},
        "access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
  }

})
const changeCurrentUserPassword=asynchandler(async(req,res)=>{
  const {oldPassword,newPassword}=req.body
  const user =await User.findById(req.user?.id)
  const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)
  if(!isPasswordCorrect){
    throw new ApiError(400,"old password is incorrect")
  }
  user.password=newPassword
  await user.save({validateBeforeSave:false})
  return res
  .status(200)
  .json(new ApiResponse(200,{},"Password changed successfully"))
})
const getCurrrentUser=asynchandler(async(req,res)=>{
  return res
  .status(200)
  .json(new ApiResponse(200,req.user,"current user fetched successfully"))
})
const updateAccountDetails=asynchandler(async(req,res)=>{
  //fetch current user from req.user
  //get data from req.body
  //update in db
  //response
  const {fullName,username}=req.body

  if(!fullName || !username){
    throw new ApiError(400,"atleast one field is required to update")
  }
 const user= User.findByIdAndUpdate(req.user._id,{
    $set:{fullName,email:email

}
},{new:true}).select("-password ")
return res
.status(200)
.json(new ApiResponse(200,user,"user details updated successfully"))
})
const updateUserAvatar=asynchandler(async(req,res)=>{
  const avatarLocalPath=req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400,"avatar file is required")
  }
  const avatar= await uploadOnCloudinary(avatarLocalPath)
  if(!avatar){
    throw new ApiError(500,"something went wrong while uploading avatar")
  } 
  const user= await User.findByIdAndUpdate(req.user._id,{
    $set:{avatar:avatar.url}
  },{new:true}).select("-password -refreshToken")
  return res
  .status(200)
  .json(new ApiResponse(200,user,"user avatar updated successfully"))
})
const updateCoverImage=asynchandler(async(req,res)=>{
  const coverImageLocalPath=req.file?.path  
  if(!coverImageLocalPath){
    throw new ApiError(400,"cover image file is required")
  }     
  const coverImage= await uploadOnCloudinary(coverImageLocalPath)
  if(!coverImage){
    throw new ApiError(500,"something went wrong while uploading cover image")
  }
  const user= await User.findByIdAndUpdate(req.user._id,{
    $set:{coverImage:coverImage.url}
  },{new:true}).select("-password -refreshToken")
})
const getUserChannelProfile=asynchandler(async(req,res)=>{
  const {username}=req.params
  if(!username){
    throw new ApiError(400,"username is required")
  }
  const channel=await User.aggregate([
    {$match:{username:username?.toLowerCase()}
    },
    {$lookup:{from:"subscriptions",
    localField:"_id",
    foreignField:"channel",
    as:"subscribers"
    }},
    {$lookup:{
      from:"subscriptions",
      localField:"_id",
      foreignField:"subscriber",
      as:"subscribedTo"
    }},
    {
      $addFields:{
        subscribersCount:{$size:"$subscribers"},
        subscribedToCount:{$size:"$subscribedTo"},
        isSubscribed:{$cond:{
          if:{$in:[req.user?._id,"$subscribers.subscriber"]},
          then:true,
          else:false
        }
      }
    }
  },
    {$project:{
      fullName:1,
      username:1,
      subscribersCount:1,
      subscribedToCount:1,
      isSubscribed:1,
      avatar:1,
      coverImage:1
        }
    }
  ])
  if (!channel?.length) {
    throw new ApiError(404,"channel not found")
  }
  return res
  .status(200)
  .json(new ApiResponse(200,channel[0],"channel profile fetched successfully"))
})

export {registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  getCurrrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateCoverImage,
  getUserChannelProfile};
