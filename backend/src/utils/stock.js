/** Allocate an outbound quantity from valid batches in FEFO order. Does not mutate input. */
export function allocateFEFO(batches, quantity, now = new Date()) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new TypeError('Quantity must be a positive integer');
  const eligible = batches.filter(b => b.quantity > 0 && (!b.expiryDate || new Date(b.expiryDate) > now))
    .slice().sort((a,b) => (a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER) - (b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER));
  if (eligible.reduce((sum,b) => sum + b.quantity, 0) < quantity) return { ok:false, allocations:[], remaining:quantity };
  let remaining=quantity; const allocations=[];
  for (const batch of eligible) { if (!remaining) break; const take=Math.min(batch.quantity,remaining); allocations.push({batchId:String(batch._id),batchNumber:batch.batchNumber,quantity:take}); remaining-=take; }
  return {ok:true,allocations,remaining:0};
}
export const ROLE_PERMISSIONS = Object.freeze({
  admin: new Set(['inventory:read','inventory:write','stock:move','stock:adjust','requisition:submit','requisition:review','users:manage','audit:read','reports:read']),
  manager: new Set(['inventory:read','inventory:write','stock:move','stock:adjust','requisition:submit','requisition:review','audit:read','reports:read']),
  staff: new Set(['inventory:read','stock:move','requisition:submit','reports:read'])
});
export function hasPermission(role, permission) { return ROLE_PERMISSIONS[role]?.has(permission) ?? false; }
