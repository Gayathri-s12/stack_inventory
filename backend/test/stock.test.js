import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateFEFO, hasPermission } from '../src/utils/stock.js';

test('FEFO allocates earliest expiry first and skips expired batches',()=>{
 const now=new Date('2026-01-01T00:00:00Z');
 const batches=[{_id:'later',batchNumber:'B2',quantity:8,expiryDate:'2026-08-01'},{_id:'expired',batchNumber:'OLD',quantity:100,expiryDate:'2025-12-01'},{_id:'soon',batchNumber:'B1',quantity:3,expiryDate:'2026-03-01'}];
 const result=allocateFEFO(batches,5,now);
 assert.equal(result.ok,true);assert.deepEqual(result.allocations,[{batchId:'soon',batchNumber:'B1',quantity:3},{batchId:'later',batchNumber:'B2',quantity:2}]);
});
test('FEFO refuses to fulfil from expired or insufficient batches',()=>{
 const result=allocateFEFO([{_id:'x',batchNumber:'X',quantity:4,expiryDate:'2025-01-01'}],1,new Date('2026-01-01'));
 assert.equal(result.ok,false);assert.equal(result.remaining,1);
});
test('role permission matrix denies staff privileged operations',()=>{
 assert.equal(hasPermission('admin','users:manage'),true);assert.equal(hasPermission('manager','users:manage'),false);assert.equal(hasPermission('staff','stock:adjust'),false);assert.equal(hasPermission('staff','requisition:submit'),true);assert.equal(hasPermission('unknown','inventory:read'),false);
});
