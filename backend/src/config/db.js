import mongoose from 'mongoose';
export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: process.env.NODE_ENV !== 'production' });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
