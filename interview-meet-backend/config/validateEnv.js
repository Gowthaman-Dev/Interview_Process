const validateEnv = () => {
  const required = ['MONGO_URI', 'JWT_SECRET', 'REFRESH_SECRET', 'ADMIN_EMAIL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log('✅ Environment variables validated');
};

export default validateEnv;