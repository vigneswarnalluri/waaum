# 🚀 Railway Deployment Guide

## Step 1: Prepare Your Code
1. Make sure your bot is working locally
2. Your `auth_info` folder is ready
3. All dependencies are in `package.json`

## Step 2: Create GitHub Repository
```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial WhatsApp bot commit"

# Create GitHub repo and push
git remote add origin https://github.com/vigneswarnalluri/whatsapp-bot.git
git push -u origin main
```

## Step 3: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your whatsapp-bot repository
6. Railway will automatically detect it's a Node.js app
7. Deploy!

## Step 4: Configure Environment Variables
In Railway dashboard:
- Go to your project
- Click on "Variables" tab
- Add any environment variables you need

## Step 5: Upload auth_info
1. Go to Railway dashboard
2. Click on your project
3. Go to "Files" tab
4. Upload your `auth_info` folder
5. Restart the deployment

## Step 6: Monitor Your Bot
- Check logs in Railway dashboard
- Access web interface at your Railway URL
- Monitor WhatsApp connection status

## 🔧 Railway Configuration

### Package.json Scripts
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  }
}
```

### Railway will automatically:
- Install dependencies from `package.json`
- Run `npm start` to start your app
- Provide a public URL
- Keep your app running 24/7

## 💡 Tips for Railway
1. **Free tier limits**: 500 hours/month, 512MB RAM
2. **Upgrade if needed**: $5/month for more resources
3. **Custom domain**: Free subdomain included
4. **Environment variables**: Set in Railway dashboard
5. **Logs**: Available in Railway dashboard

## 🚨 Important Notes
- Keep your `auth_info` folder secure
- Don't commit sensitive data to GitHub
- Use environment variables for configuration
- Monitor your bot regularly
- Railway will keep your bot running 24/7
