module.exports = {
  appId: 'com.mindspark.game',
  appName: 'MindSpark',
  webDir: 'out',
  server: {
    // PRODUCTION: Replace with your actual deployed URL
    // url: 'https://your-deployed-domain.com',
    
    // LOCAL DEV: Use your PC's IP for testing on phone
    url: 'http://192.168.1.6:3000',
    cleartext: true,
    androidScheme: 'https'
  }
};