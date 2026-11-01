import { setServers } from 'node:dns/promises';

setServers(['8.8.8.8', '8.8.4.4']);
import 'dotenv/config'; import {connectDB} from './config/db.js'; import {User} from './models/index.js';
if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<12||!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32){console.error('Set ADMIN_PASSWORD (12+ chars) and JWT_SECRET (32+ chars) in .env');process.exit(1);}
await connectDB(process.env.MONGO_URI);
const email=(process.env.ADMIN_EMAIL||'admin@example.com').toLowerCase();let user=await User.findOne({email});if(user){console.log('Admin already exists:',email);}else{user=await User.create({name:process.env.ADMIN_NAME||'System Administrator',email,password:process.env.ADMIN_PASSWORD,role:'admin',branchId:process.env.ADMIN_BRANCH_ID||'HQ'});console.log('Admin created:',user.email);}await (await import('mongoose')).default.disconnect();
