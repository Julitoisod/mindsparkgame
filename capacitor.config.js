module.exports = {
  appId: 'com.mindspark.game',
  appName: 'MindSpark',
  webDir: 'out',
  server: {
    // CHANGE THIS to your Railway URL after deploying
    // Example: url: 'https://mindsparkgame-production.up.railway.app',
    url: 'http://192.168.1.6:3000',
    cleartext: true,
    androidScheme: 'https'
  }
};