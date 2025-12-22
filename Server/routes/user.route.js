import express from 'express'
import userAuth from '../middleware/userAuth.js';
import { getUserData } from '../controllers/user.controller.js';
import { getTechnicianWallet } from '../controllers/user.controller.js';


const userRoutesr = express.Router();


userRoutesr.get('/data', userAuth, getUserData);
userRoutesr.get('/wallet', userAuth, getTechnicianWallet);

export default userRoutesr;