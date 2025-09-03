# 🤖 Advanced WhatsApp Bot

A powerful WhatsApp message forwarding bot with advanced filtering, rate limiting, and web interface capabilities.

## ✨ Features

### 🔄 Core Functionality
- **Message Forwarding**: Automatically forwards messages from source group to target group
- **Media Support**: Handles text, images, videos, audio, and documents
- **Persistent Authentication**: Maintains login sessions across restarts

### 🎛️ Advanced Features
- **Message Filtering**: Filter messages by keywords, users, or content
- **Rate Limiting**: Prevent spam with configurable message limits
- **Web Interface**: Easy configuration through a web dashboard
- **Enhanced Logging**: Detailed logging with file output
- **Error Handling**: Robust error handling and automatic reconnection

### 🔧 Configuration Options
- **Selective Forwarding**: Choose which media types to forward
- **User Management**: Allow/block specific users
- **Keyword Filtering**: Include/exclude messages with specific keywords
- **Rate Limiting**: Set limits for messages and media per minute

## 🚀 Quick Start

### 1. Installation
```bash
# Install dependencies
npm install

# Install new dependency for web interface
npm install express
```

### 2. Configuration
Edit `config.json` to set your group IDs and preferences:

```json
{
  "groups": {
    "sourceGroup": "YOUR_SOURCE_GROUP_ID@g.us",
    "targetGroup": "YOUR_TARGET_GROUP_ID@g.us"
  },
  "settings": {
    "forwardText": true,
    "forwardImages": true,
    "forwardVideos": true,
    "forwardAudio": true,
    "forwardDocuments": true
  }
}
```

### 3. Running the Bot

#### Option 1: Bot Only
```bash
npm start
```

#### Option 2: Web Interface Only
```bash
npm run web
```

#### Option 3: Both Bot and Web Interface
```bash
npm run dev
```

### 4. Web Interface
Access the web interface at `http://localhost:3000` to:
- Configure group IDs
- Set up message filters
- Adjust rate limiting
- Monitor bot status
- View logs

## 📋 Configuration Guide

### Group IDs
To find your group IDs:
1. Run the bot and send a message to your group
2. Check the console output for the group ID
3. Copy the ID to your config file

### Message Filters
```json
{
  "filters": {
    "enabled": true,
    "keywords": ["urgent", "important"],
    "excludeKeywords": ["spam", "test"],
    "allowedUsers": ["919876543210"],
    "blockedUsers": ["919876543211"]
  }
}
```

### Rate Limiting
```json
{
  "rateLimit": {
    "enabled": true,
    "maxMessagesPerMinute": 10,
    "maxMediaPerMinute": 5
  }
}
```

## 🔍 Usage Examples

### Basic Forwarding
- All messages from source group → target group
- No filtering, no rate limiting

### Filtered Forwarding
- Only forward messages containing "urgent" or "important"
- Block messages from specific users
- Limit to 5 messages per minute

### Media-Only Mode
- Disable text forwarding
- Only forward images and videos
- Set media rate limit to 3 per minute

## 📊 Monitoring

### Logs
- Console output with timestamps
- Optional file logging (`bot.log`)
- Different log levels (silent, error, warn, info, debug)

### Web Dashboard
- Real-time configuration
- Status monitoring
- Easy settings adjustment

## 🛠️ Troubleshooting

### Common Issues

1. **QR Code Not Appearing**
   - Check internet connection
   - Restart the bot
   - Clear auth_info folder if needed

2. **Media Not Forwarding**
   - Check if media forwarding is enabled in config
   - Verify rate limits aren't exceeded
   - Check logs for error messages

3. **Messages Not Filtering**
   - Ensure filters are enabled in config
   - Check keyword spelling
   - Verify user phone numbers format

### Getting Group IDs
1. Start the bot
2. Send a test message to your group
3. Look for "Message from: [GROUP_ID]" in console
4. Copy the group ID to your config

## 🔒 Security Notes

- Keep your `auth_info` folder secure
- Don't share your group IDs publicly
- Use rate limiting to prevent abuse
- Regularly update dependencies

## 📝 Changelog

### v2.0.0
- ✅ Added configuration file system
- ✅ Implemented message filtering
- ✅ Added rate limiting
- ✅ Created web interface
- ✅ Enhanced logging system
- ✅ Improved error handling

### v1.0.0
- ✅ Basic message forwarding
- ✅ Media support
- ✅ Authentication persistence

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

ISC License - feel free to use and modify as needed.
