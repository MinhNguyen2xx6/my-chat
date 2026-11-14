// Thay vì: require('dotenv').config();
import dotenv from 'dotenv';
dotenv.config();

// Thay vì: const express = require('express');
import express from 'express';

// Thay vì: const connectDB = require('./config/db.js');
import connectDB from '../config/db.js';
const app = express();

// Gọi hàm kết nối CSDL
connectDB();

app.use(express.json());

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại port ${PORT}`);
});