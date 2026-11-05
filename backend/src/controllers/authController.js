import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken'; 
import crypto from 'crypto';
import Session from '../models/Session.js';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; //14 ngay tinh theo mili s


//Ham signUP dang ky user moi
export const signUp = async(req, res) => {
    try {
        const {username, password, email, firstName, lastName} = req.body;

        if (!username || !password || !email || !firstName || !lastName) {
            return res.status(400).json({message: "Khong the thieu username, password, email, fristName va lastName",
            });
        }

        //Kiem tra xem username da ton tai chua
const duplicate = await User.findOne  ({username});

if (duplicate) {
    return res.status(409).json({message: "Username da ton tai"});
}
        //Ma hoa pwd
    const hashedPassword = await bcrypt.hash(password, 10); //salt=10

        //Tao user moi
    await User.create({
        username,
        hashedPassword,
        email,
        displayName: `${firstName} ${lastName}`
    });

        // Return
    return res.sendStatus(204);


    } catch (error) {
        console.error('Loi khi goi signUp', error);
            return res.status(500).json({message: "Loi he thong khi dang ky"});
    }
};


//Ham signIn dang nhap
export const signIn = async(req, res) => {

    try {
        //Lay inputs
        const {username, password} = req.body;

        if (!username || !password) {
         return res.status(400).json({message: "Khong the thieu username hoac password"});  
        }


        //lay hashPwd trong db de so voi pwd input
        const user = await User.findOne({username});

        if(!user) {
            return res.status(401).json({message: 'Username hoac password khong chinh xac'});   
        }


        //Kiem tra password
        const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);

        if (!passwordCorrect) {
            return res
            .status(401)
            .json({message: "username hoac password khong chinh xac"});
        }

        //neu nhu khop thi tao accessToken voi jwt
        const accessToken = jwt.sign({userId: user.id}, 
            process.env.ACCESS_TOKEN_SECRET, 
            {expiresIn: ACCESS_TOKEN_TTL});


        //tao refreshtoken
        const refreshToken = crypto.randomBytes(64).toString('hex');

        //tao session moi de luu refreshToken
            await Session.create({
                userId: user._id,
                refreshToken,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
            })

        //tra refresh token ve trong cookie
        res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none", //backend, frontend deploy rieng
        maxAge: REFRESH_TOKEN_TTL,
        })


        //tra access token ve trong res 
        return res.status(200).json({message: `User ${user.displayName} da Logged in!`, accessToken});



    } catch (error) {
        console.error("Loi khi goi signUp", error);
        return res.status(500).json({message:"Loi he thong khi dang nhap"});
    }
};


//Ham signOut dang xuat
export const signOut = async(req, res) => {
try {
    //Lay refresh token tu cookie
    const token = req.cookies?.refreshToken;

    if (token){
        //Xoa refresh token tu Session
        await Session.deleteOne({refreshToken: token});
        //Xoa cookie
        res.clearCookie("refreshToken");
    } return res.sendStatus(204);
  
} catch (error) {
console.error("Loi khi goi signOut", error);
return res.status(500).json({message: "Loi he thong khi dang xuat khoi tai khoan"});
}



};