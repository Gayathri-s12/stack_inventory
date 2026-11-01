import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
export function asyncHandler(fn){ return (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next); }
export async function requireAuth(req,res,next){
  const token=req.cookies?.sid;
  if(!token) return res.status(401).json({success:false,message:'Authentication required'});
  try {
    const claims=jwt.verify(token,process.env.JWT_SECRET);
    const user=await User.findById(claims._id).select('name email role branchId isActive');
    if(!user || !user.isActive) return res.status(401).json({success:false,message:'Account disabled or unavailable'});
    req.user=user; next();
  } catch { return res.status(401).json({success:false,message:'Session expired or invalid'}); }
}
export const allowRoles=(...roles)=>(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({success:false,message:'Insufficient permissions'});
export function branchFilter(user){ return user.role==='admin'?{}:{branchId:user.branchId}; }
export function errorHandler(err,req,res,next){
  if(err.isJoi) return res.status(400).json({success:false,message:'Validation failed',details:err.details.map(d=>d.message)});
  if(err.code===11000) return res.status(409).json({success:false,message:'A record with this unique value already exists'});
  if(err.name==='ValidationError'||err.name==='CastError'||err instanceof SyntaxError&&'body' in err) return res.status(400).json({success:false,message:err.message||'Invalid request'});
  console.error(err); res.status(err.status||500).json({success:false,message:process.env.NODE_ENV==='production'?'Internal server error':err.message||'Internal server error'});
}
