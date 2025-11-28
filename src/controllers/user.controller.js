import { asynchandler } from "../utils/asynchandle.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";   // ⬅️ renamed
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

  if (!username ||!email) {
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
    secure:true
  }
    return res
    .status(200)
    .cookie("accesToken",accessToken,options)
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

export { registerUser,loginUser,logoutUser };
