import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken'; 
import crypto from 'crypto';
import Session from '../models/Session.js';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; //14 ngay tinh theo mili s


//Update: Mobile goi header x-client den xac dinh user
const isMobileClient = (req) => req.headers['x-client'] === 'mobile';

//UPdate: Lay refresh token tu cookie neu la web, tu body neu la mobile
const getRefreshTokenFromReq = (req) =>
    req.cookies?.refreshToken || req.body?.refreshToken;



//Ham signUP dang ky user moi
export const signUp = async(req, res) => {
    try {
        let {username, password, email, firstName, lastName} = req.body;

        if (!username || !password || !email || !firstName || !lastName) {
            return res.status(400).json({message: "Khong the thieu username, password, email, fristName va lastName",
            });
        }

        //Fix: chuan hoa schema dang lowercase va trim
     username = username.trim().toLowerCase();
        email = email.trim().toLowerCase();

        //Kiem tra xem username da ton tai chua
const duplicate = await User.findOne  ({username});

if (duplicate) {
    return res.status(409).json({message: "Username da ton tai"});
}

 //Update: kiem tra email trung (schema co unique, tranh loi 500)
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(409).json({ message: "Email da ton tai" });
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
        let {username, password} = req.body;

        if (!username || !password) {
         return res.status(400).json({message: "Khong the thieu username hoac password"});  
        }

        //Update: Chuan hoa de khop voi data da save
        username = username.trim().toLowerCase();

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

        //Tra refresh token trong body
        if (isMobileClient(req)) {
            return res.status(200).json({
                message: `User ${user.displayName} da Logged in!`,
                accessToken,
                refreshToken,
            });
        }

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
        console.error("Loi khi goi signIn", error);
        return res.status(500).json({message:"Loi he thong khi dang nhap"});
    }
};

//Update: Ham refreshToken cap access token moi
export const refreshToken = async (req, res) => {
    try {
        const token = getRefreshTokenFromReq(req);
        if (!token) {
            return res.status(401).json({ message: "Khong tim thay refresh token" });
        }

        const session = await Session.findOne({ refreshToken: token });
        if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({ message: "Refresh token het han hoac khong dung" });
        }

        const accessToken = jwt.sign(
            { userId: session.userId },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL }
        );

        return res.status(200).json({ accessToken });
    } catch (error) {
        console.error("Loi khi goi refreshToken", error);
        return res.status(500).json({ message: "Loi he thong khi lam moi token" });
    }
};


//Ham signOut dang xuat
export const signOut = async(req, res) => {
try {
    //Lay refresh token tu cookie hoac body (cho mobile)
    const token = getRefreshTokenFromReq(req);

   if (token) {
            await Session.deleteOne({ refreshToken: token });
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            });
        }
    return res.sendStatus(204);
  
} catch (error) {
console.error("Loi khi goi signOut", error);
return res.status(500).json({message: "Loi he thong khi dang xuat khoi tai khoan"});
}



};