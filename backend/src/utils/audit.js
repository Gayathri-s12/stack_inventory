import { AuditLog } from '../models/index.js';
export async function audit(req, action, entityType, entityId, details={}, anomaly=false, session=null){
  const record={actor:req.user?._id,action,entityType,entityId:String(entityId||''),branchId:req.user?.branchId||'HQ',details,anomaly,ip:req.ip};
  const docs=await AuditLog.create([record], session?{session}:{});
  return docs[0];
}
