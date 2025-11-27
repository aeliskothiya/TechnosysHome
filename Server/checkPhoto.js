import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/technosys');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(c => console.log('- ' + c.name));
    
    // Check users collection
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema, 'users');
    const user = await User.findOne({}).lean();
    console.log('\nFirst user:', user?.Email);
    console.log('User photo field:', user?.Photo);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkCollections();
