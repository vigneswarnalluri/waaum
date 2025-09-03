import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000

// Middleware
app.use(express.json())
app.use(express.static('public'))

// Serve the main page
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WhatsApp Bot Configuration</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .section h3 { margin-top: 0; color: #25D366; }
            input, textarea, select { width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
            button:hover { background: #128C7E; }
            .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
            .checkbox-item { display: flex; align-items: center; }
            .checkbox-item input { width: auto; margin-right: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 WhatsApp Bot Configuration</h1>
            <div id="status"></div>
            
            <div class="section">
                <h3>📱 Group Settings</h3>
                <label>Source Group ID:</label>
                <input type="text" id="sourceGroup" placeholder="120363405469016629@g.us">
                
                <label>Target Group ID:</label>
                <input type="text" id="targetGroup" placeholder="120363417347954807@g.us">
            </div>
            
            <div class="section">
                <h3>📤 Forward Settings</h3>
                <div class="checkbox-group">
                    <div class="checkbox-item">
                        <input type="checkbox" id="forwardText" checked>
                        <label for="forwardText">Text Messages</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="forwardImages" checked>
                        <label for="forwardImages">Images</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="forwardVideos" checked>
                        <label for="forwardVideos">Videos</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="forwardAudio" checked>
                        <label for="forwardAudio">Audio</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="forwardDocuments" checked>
                        <label for="forwardDocuments">Documents</label>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h3>🔍 Message Filters</h3>
                <label>
                    <input type="checkbox" id="filtersEnabled">
                    Enable Message Filtering
                </label>
                
                <label>Include Keywords (comma-separated):</label>
                <textarea id="keywords" placeholder="urgent, important, meeting"></textarea>
                
                <label>Exclude Keywords (comma-separated):</label>
                <textarea id="excludeKeywords" placeholder="spam, test, ignore"></textarea>
                
                <label>Allowed Users (comma-separated phone numbers):</label>
                <textarea id="allowedUsers" placeholder="919876543210,919876543211"></textarea>
                
                <label>Blocked Users (comma-separated phone numbers):</label>
                <textarea id="blockedUsers" placeholder="919876543212,919876543213"></textarea>
            </div>
            
            <div class="section">
                <h3>⚡ Rate Limiting</h3>
                <label>
                    <input type="checkbox" id="rateLimitEnabled" checked>
                    Enable Rate Limiting
                </label>
                
                <label>Max Messages per Minute:</label>
                <input type="number" id="maxMessagesPerMinute" value="10" min="1" max="100">
                
                <label>Max Media per Minute:</label>
                <input type="number" id="maxMediaPerMinute" value="5" min="1" max="50">
            </div>
            
            <div class="section">
                <h3>📝 Logging</h3>
                <label>Log Level:</label>
                <select id="logLevel">
                    <option value="silent">Silent</option>
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info" selected>Info</option>
                    <option value="debug">Debug</option>
                </select>
                
                <label>
                    <input type="checkbox" id="saveToFile" checked>
                    Save logs to file
                </label>
            </div>
            
            <button onclick="loadConfig()">📥 Load Current Config</button>
            <button onclick="saveConfig()">💾 Save Configuration</button>
            <button onclick="restartBot()">🔄 Restart Bot</button>
        </div>
        
        <script>
            function showStatus(message, type = 'success') {
                const status = document.getElementById('status')
                status.innerHTML = \`<div class="status \${type}">\${message}</div>\`
                setTimeout(() => status.innerHTML = '', 5000)
            }
            
            async function loadConfig() {
                try {
                    const response = await fetch('/api/config')
                    const config = await response.json()
                    
                    // Load group settings
                    document.getElementById('sourceGroup').value = config.groups.sourceGroup || ''
                    document.getElementById('targetGroup').value = config.groups.targetGroup || ''
                    
                    // Load forward settings
                    document.getElementById('forwardText').checked = config.settings.forwardText
                    document.getElementById('forwardImages').checked = config.settings.forwardImages
                    document.getElementById('forwardVideos').checked = config.settings.forwardVideos
                    document.getElementById('forwardAudio').checked = config.settings.forwardAudio
                    document.getElementById('forwardDocuments').checked = config.settings.forwardDocuments
                    
                    // Load filters
                    document.getElementById('filtersEnabled').checked = config.filters.enabled
                    document.getElementById('keywords').value = config.filters.keywords.join(', ')
                    document.getElementById('excludeKeywords').value = config.filters.excludeKeywords.join(', ')
                    document.getElementById('allowedUsers').value = config.filters.allowedUsers.join(', ')
                    document.getElementById('blockedUsers').value = config.filters.blockedUsers.join(', ')
                    
                    // Load rate limiting
                    document.getElementById('rateLimitEnabled').checked = config.rateLimit.enabled
                    document.getElementById('maxMessagesPerMinute').value = config.rateLimit.maxMessagesPerMinute
                    document.getElementById('maxMediaPerMinute').value = config.rateLimit.maxMediaPerMinute
                    
                    // Load logging
                    document.getElementById('logLevel').value = config.logging.level
                    document.getElementById('saveToFile').checked = config.logging.saveToFile
                    
                    showStatus('Configuration loaded successfully!')
                } catch (error) {
                    showStatus('Error loading configuration: ' + error.message, 'error')
                }
            }
            
            async function saveConfig() {
                try {
                    const config = {
                        groups: {
                            sourceGroup: document.getElementById('sourceGroup').value,
                            targetGroup: document.getElementById('targetGroup').value
                        },
                        settings: {
                            forwardText: document.getElementById('forwardText').checked,
                            forwardImages: document.getElementById('forwardImages').checked,
                            forwardVideos: document.getElementById('forwardVideos').checked,
                            forwardAudio: document.getElementById('forwardAudio').checked,
                            forwardDocuments: document.getElementById('forwardDocuments').checked
                        },
                        filters: {
                            enabled: document.getElementById('filtersEnabled').checked,
                            keywords: document.getElementById('keywords').value.split(',').map(s => s.trim()).filter(s => s),
                            excludeKeywords: document.getElementById('excludeKeywords').value.split(',').map(s => s.trim()).filter(s => s),
                            allowedUsers: document.getElementById('allowedUsers').value.split(',').map(s => s.trim()).filter(s => s),
                            blockedUsers: document.getElementById('blockedUsers').value.split(',').map(s => s.trim()).filter(s => s)
                        },
                        rateLimit: {
                            enabled: document.getElementById('rateLimitEnabled').checked,
                            maxMessagesPerMinute: parseInt(document.getElementById('maxMessagesPerMinute').value),
                            maxMediaPerMinute: parseInt(document.getElementById('maxMediaPerMinute').value)
                        },
                        logging: {
                            level: document.getElementById('logLevel').value,
                            saveToFile: document.getElementById('saveToFile').checked,
                            logFile: 'bot.log'
                        }
                    }
                    
                    const response = await fetch('/api/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(config)
                    })
                    
                    if (response.ok) {
                        showStatus('Configuration saved successfully!')
                    } else {
                        throw new Error('Failed to save configuration')
                    }
                } catch (error) {
                    showStatus('Error saving configuration: ' + error.message, 'error')
                }
            }
            
            async function restartBot() {
                try {
                    const response = await fetch('/api/restart', { method: 'POST' })
                    if (response.ok) {
                        showStatus('Bot restart requested!')
                    } else {
                        throw new Error('Failed to restart bot')
                    }
                } catch (error) {
                    showStatus('Error restarting bot: ' + error.message, 'error')
                }
            }
            
            // Load config on page load
            window.onload = loadConfig
        </script>
    </body>
    </html>
    `)
})

// API endpoints
app.get('/api/config', (req, res) => {
    try {
        const configPath = path.join(__dirname, 'config.json')
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        res.json(config)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/api/config', (req, res) => {
    try {
        const configPath = path.join(__dirname, 'config.json')
        fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2))
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/api/restart', (req, res) => {
    // In a real implementation, you'd restart the bot process
    res.json({ success: true, message: 'Restart signal sent' })
})

app.get('/api/stats', (req, res) => {
    try {
        // In a real implementation, you'd get stats from the bot process
        const stats = {
            messagesForwarded: 0,
            mediaForwarded: 0,
            messagesFiltered: 0,
            errors: 0,
            uptime: '0h 0m 0s',
            startTime: new Date().toISOString()
        }
        res.json(stats)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// QR Code endpoint for better display
app.get('/qr', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>WhatsApp QR Code</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .qr-code { font-family: monospace; font-size: 8px; line-height: 8px; background: white; padding: 20px; border: 2px solid #25D366; border-radius: 10px; display: inline-block; }
            .instructions { margin: 20px 0; color: #666; }
            .refresh { background: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 WhatsApp Bot QR Code</h1>
            <div class="instructions">
                <p>1. Open WhatsApp on your phone</p>
                <p>2. Go to Settings → Linked Devices → Link a Device</p>
                <p>3. Scan the QR code below</p>
            </div>
            <div class="qr-code" id="qr-code">
                <p>QR Code will appear here when bot starts...</p>
                <p>Check Railway logs for the QR code</p>
            </div>
            <button class="refresh" onclick="location.reload()">🔄 Refresh</button>
            <p><small>If QR code is not visible, check Railway logs</small></p>
        </div>
    </body>
    </html>
    `)
})

app.listen(PORT, () => {
    console.log(`🌐 Web interface running at http://localhost:${PORT}`)
})
