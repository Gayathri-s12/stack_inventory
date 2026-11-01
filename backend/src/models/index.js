import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false, minlength: 12 },
  role: { type: String, enum: ['admin','manager','staff'], default: 'staff', index: true },
  branchId: { type: String, default: 'HQ', trim: true, index: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
userSchema.pre('save', async function(){ if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12); });
userSchema.methods.comparePassword = function(p){ return bcrypt.compare(p, this.password); };


const categorySchema = new Schema({name:{type:String,required:true,trim:true,maxlength:80},description:{type:String,default:'',maxlength:500},branchId:{type:String,required:true,index:true},isActive:{type:Boolean,default:true}},{timestamps:true});
categorySchema.index({name:1,branchId:1},{unique:true});

const batchSchema = new Schema({ batchNumber: {type:String, required:true, trim:true}, quantity: {type:Number, required:true, min:0}, expiryDate: {type:Date, default:null} }, {_id:true});
const itemSchema = new Schema({
  sku: {type:String, required:true, trim:true, uppercase:true}, name: {type:String, required:true, trim:true, maxlength:160},
  category: {type:String, required:true, trim:true}, description: {type:String, default:'', maxlength:1000},
  branchId: {type:String, required:true, index:true}, quantity: {type:Number, default:0, min:0}, reorderPoint: {type:Number, default:10, min:0}, reorderDays: {type:Number, default:7, min:1, max:365},
  unit: {type:String, default:'units', trim:true}, unitCost: {type:Number, default:0, min:0}, batches: {type:[batchSchema], default:[]}, isActive:{type:Boolean,default:true}
}, {timestamps:true});
itemSchema.index({sku:1, branchId:1},{unique:true}); itemSchema.index({name:'text',sku:'text',category:'text'});

const allocationSchema = new Schema({batchNumber:{type:String,required:true},quantity:{type:Number,required:true,min:1},expiryDate:{type:Date,default:null}},{_id:false});
const movementSchema = new Schema({ item:{type:Schema.Types.ObjectId,ref:'Item',required:true,index:true}, branchId:{type:String,required:true,index:true}, type:{type:String,enum:['incoming','outgoing','adjustment'],required:true}, quantity:{type:Number,required:true,min:0}, note:{type:String,default:'',maxlength:500}, batchNumber:{type:String,default:''}, allocations:{type:[allocationSchema],default:[]}, performedBy:{type:Schema.Types.ObjectId,ref:'User',required:true}, createdAt:{type:Date,default:Date.now,index:true} });
const requisitionSchema = new Schema({ item:{type:Schema.Types.ObjectId,ref:'Item',required:true}, itemName:{type:String,required:true}, sku:{type:String,required:true}, branchId:{type:String,required:true,index:true}, requestedBy:{type:Schema.Types.ObjectId,ref:'User',required:true}, quantity:{type:Number,required:true,min:1}, reason:{type:String,required:true,maxlength:500}, status:{type:String,enum:['pending','approved','rejected','fulfilled'],default:'pending',index:true}, reviewedBy:{type:Schema.Types.ObjectId,ref:'User',default:null}, reviewNote:{type:String,default:''} },{timestamps:true});
const auditSchema = new Schema({ actor:{type:Schema.Types.ObjectId,ref:'User',default:null,index:true}, action:{type:String,required:true,index:true}, entityType:{type:String,required:true}, entityId:{type:String,default:''}, branchId:{type:String,default:'HQ',index:true}, details:{type:Schema.Types.Mixed,default:{}}, anomaly:{type:Boolean,default:false,index:true}, ip:{type:String,default:''}, createdAt:{type:Date,default:Date.now,index:true} });
export const User = model('User', userSchema);
export const Item = model('Item', itemSchema);
export const Category = model('Category', categorySchema);
export const Transaction = model('Transaction', movementSchema);
export const Requisition = model('Requisition', requisitionSchema);
export const AuditLog = model('AuditLog', auditSchema);
