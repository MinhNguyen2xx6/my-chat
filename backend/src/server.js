import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './libs/db.js';
import authRoute from './routes/authRoute.js';
import userRoute from './routes/userRoute.js';
import cookieParser from 'cookie-parser';
import { protectedRoute } from './middlewares/authMiddleware.js';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 5001;


//middleware
app.use(express.json());
app.use(cookieParser());

//public routes
app.use('/api/auth', authRoute);

//health check
app.get('/health', (req, res) => res.status(200).json({ ok: true }));

//private routes
app.use(protectedRoute); //middleware xac minh token
app.use('/api/users', userRoute);


connectDB().then(() => {
    app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    });
});
