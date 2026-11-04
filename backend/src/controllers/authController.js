import bcrypt from 'bcrypt';
import User from '../models/User.js';


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