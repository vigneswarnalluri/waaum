# 🚀 WhatsApp Bot Deployment Guide

## ☁️ Cloud Deployment Options

### 1. Railway (Recommended - Free Tier)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy
railway init
railway up
```

### 2. Render (Free Tier)
```bash
# Connect your GitHub repo to Render
# Render will auto-deploy when you push changes
```

### 3. DigitalOcean Droplet ($5/month)
```bash
# Create Ubuntu 20.04 droplet
# SSH into server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone your bot
git clone https://github.com/vigneswarnalluri/whatsapp-bot.git
cd whatsapp-bot

# Install dependencies
npm install

# Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## 🏠 Home Server Setup

### Raspberry Pi Setup
```bash
# Install Node.js on Raspberry Pi
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup bot
git clone https://github.com/vigneswarnalluri/whatsapp-bot.git
cd whatsapp-bot
npm install

# Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## 🔧 Environment Variables

Create a `.env` file for production:
```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

## 📱 WhatsApp Authentication

### For Cloud Deployment:
1. Run bot locally first to generate QR code
2. Scan QR code with WhatsApp
3. Copy `auth_info` folder to cloud server
4. Bot will maintain connection

### For Home Server:
1. Run bot on server
2. Access via SSH tunnel or VNC
3. Scan QR code
4. Bot stays connected

## 🔒 Security Considerations

1. **Keep auth_info secure** - Don't commit to public repos
2. **Use environment variables** for sensitive data
3. **Enable firewall** on server
4. **Regular updates** of dependencies
5. **Monitor logs** for suspicious activity

## 📊 Monitoring

### PM2 Monitoring
```bash
pm2 status
pm2 logs
pm2 monit
```

### Web Interface
- Access at `http://your-server-ip:3000`
- Monitor bot status
- Configure settings remotely

## 🔄 Auto-Deployment

### GitHub Actions (for cloud)
```yaml
name: Deploy Bot
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: railway up
```

## 💡 Tips

1. **Start with free tiers** to test
2. **Use PM2** for process management
3. **Monitor memory usage** - WhatsApp bots can be memory intensive
4. **Set up alerts** for when bot goes down
5. **Regular backups** of auth_info folder
6. **Use HTTPS** for web interface in production
