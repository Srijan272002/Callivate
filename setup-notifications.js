const fs = require('fs');
const path = require('path');

// Check if required environment variables are set
const requiredEnvVars = ['EXPO_PROJECT_ID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.log('Please set these variables in your .env file or environment');
  process.exit(1);
}

// Check for configuration files
const configFiles = {
  android: 'google-services.json',
  ios: 'GoogleService-Info.plist'
};

Object.entries(configFiles).forEach(([platform, filename]) => {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Missing ${platform} configuration file: ${filename}`);
    console.log(`Please obtain ${filename} from your Firebase console and place it in the project root`);
  } else {
    console.log(`✅ Found ${platform} configuration file: ${filename}`);
  }
});

console.log('\n📱 Notification Setup Guide:');
console.log('1. Create a development build using:');
console.log('   npx expo prebuild');
console.log('\n2. For Android, place google-services.json in the project root');
console.log('3. For iOS, place GoogleService-Info.plist in the project root');
console.log('\n4. Update your app.json with:');
console.log(`{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}`); 