module.exports = {
  appId: 'com.mindspark.game',
  appName: 'MindSpark',
  webDir: 'out',
  server: {
    // Open straight on the student login: the teacher landing lives at "/",
    // and the app must never show it, not even for a frame.
    url: 'https://palegreen-elephant-128101.hostingersite.com/login',
    androidScheme: 'https'
  }
};