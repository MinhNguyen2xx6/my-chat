import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        
        await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
        console.log("MongoDB connected !!! good");
    } catch (error) {
        console.log("MG_DB connection failed", error);
        process.exit(1);
    }
};