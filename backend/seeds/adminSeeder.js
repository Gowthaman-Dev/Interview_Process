import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      process.exit(0);
    }
    
    await User.create({
      name: 'Super Admin',
      email: adminEmail,
      password: 'admin123', // Will be hashed by pre-save hook
      role: 'Admin',
    });
    
    console.log('🎉 Admin user created successfully');
    console.log(`Email: ${adminEmail}`);
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();