import test from 'node:test';
import assert from 'node:assert/strict';

const uri=process.env.MONGO_URI_TEST;
test('API authorization and branch isolation integration suite (requires disposable *_test MongoDB URI)',{skip:!uri||!/_test(?:\?|$)/i.test(uri)},async t=>{
  process.env.NODE_ENV='test';process.env.JWT_SECRET=process.env.JWT_SECRET||'integration-test-secret-please-change-123456789';
  const mongoose=(await import('mongoose')).default;
  const {connectDB}=await import('../src/config/db.js');
  const {User,Item}=await import('../src/models/index.js');
  const {app,httpServer}=await import('../server.js');
  const request=(await import('supertest')).default;
  await connectDB(uri);
  await Promise.all([User.deleteMany({email:/^stockpilot-test-/}),Item.deleteMany({sku:/^TEST-/})]);
  const suffix=Date.now().toString();
  const accounts={
    admin:await User.create({name:'Test Admin',email:`stockpilot-test-admin-${suffix}@example.test`,password:'Test-Admin-Password-123!',role:'admin',branchId:'HQ'}),
    manager:await User.create({name:'Test Manager',email:`stockpilot-test-manager-${suffix}@example.test`,password:'Test-Manager-Password-123!',role:'manager',branchId:'BR-A'}),
    staff:await User.create({name:'Test Staff',email:`stockpilot-test-staff-${suffix}@example.test`,password:'Test-Staff-Password-123!',role:'staff',branchId:'BR-A'})
  };
  const server=httpServer.listen(0);await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  async function login(role){const agent=request.agent(base);const res=await agent.post('/api/auth/login').send({email:accounts[role].email,password:`Test-${role[0].toUpperCase()+role.slice(1)}-Password-123!`});assert.equal(res.status,200,`${role} login`);return agent;}
  try {
    const admin=await login('admin'),manager=await login('manager'),staff=await login('staff');
    for(const [role,agent] of Object.entries({admin,manager,staff})){
      const users=await agent.get('/api/users');assert.equal(users.status,role==='admin'?200:403,`${role} users endpoint`);
      const audit=await agent.get('/api/audit');assert.equal(audit.status,role==='staff'?403:200,`${role} audit endpoint`);
    }
    const createItem=branchId=>({sku:`TEST-${roleSafe(branchId)}-${suffix}`,name:'Integration Test Item',category:'Test',branchId,quantity:10,reorderPoint:2,unitCost:1});
    function roleSafe(v){return v.replace(/[^A-Z0-9]/gi,'');}
    const branchItem=await manager.post('/api/items').send(createItem('BR-A'));assert.equal(branchItem.status,201,'manager can create within own branch');
    const adminItem=await admin.post('/api/items').send(createItem('HQ'));assert.equal(adminItem.status,201,'admin can create item for a branch');
    assert.equal((await staff.post('/api/items').send(createItem('BR-A'))).status,403,'staff cannot create items');
    const managerItems=await manager.get('/api/items');assert.equal(managerItems.status,200);assert(managerItems.body.data.every(item=>item.branchId==='BR-A'),'manager sees only own branch');
    assert.equal((await manager.patch(`/api/items/${adminItem.body.data._id}`).send({name:'Cross-branch edit'})).status,404,'manager cannot edit another branch');
    assert.equal((await staff.post('/api/movements').send({itemId:branchItem.body.data._id,type:'adjustment',quantity:5})).status,403,'staff cannot adjust stock');
    assert.equal((await staff.post('/api/requisitions').send({itemId:branchItem.body.data._id,quantity:2,reason:'Integration test request'})).status,201,'staff can submit requisition');
    assert.equal((await staff.patch('/api/requisitions/000000000000000000000000/decision').send({status:'approved'})).status,403,'staff cannot approve requisitions');
    assert.equal((await admin.get('/api/users')).status,200,'admin can manage user accounts');
    await t.test('logout clears the session',async()=>{const res=await staff.post('/api/auth/logout');assert.equal(res.status,200);assert.equal((await staff.get('/api/auth/me')).status,401);});
  } finally {
    await new Promise(resolve=>httpServer.close(resolve));
    await Promise.all([User.deleteMany({email:/^stockpilot-test-/}),Item.deleteMany({sku:/^TEST-/})]);
    await mongoose.disconnect();
  }
});
