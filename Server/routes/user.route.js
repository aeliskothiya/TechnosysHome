import express from 'express'
import userAuth from '../middleware/userAuth.js';
import { getTechnicianWallet,getUserData } from '../controllers/user.Controller.js';


const userRoutesr = express.Router();


userRoutesr.get('/data', userAuth, getUserData);
userRoutesr.get('/wallet', userAuth, getTechnicianWallet);

export default userRoutesr;