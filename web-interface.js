import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

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
            .group-config { margin: 15px 0; }
            .input-group { display: flex; gap: 10px; align-items: center; }
            .input-group input { flex: 1; }
            .detect-btn { background: #17a2b8; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
            .detect-btn:hover { background: #138496; }
            .help-text { color: #666; font-size: 12px; margin-top: 5px; display: block; }
            .group-actions { margin: 20px 0; display: flex; gap: 10px; flex-wrap: wrap; }
            .update-btn { background: #28a745; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
            .update-btn:hover { background: #218838; }
            .test-btn { background: #ffc107; color: #212529; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
            .test-btn:hover { background: #e0a800; }
            .restart-btn { background: #dc3545; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
            .restart-btn:hover { background: #c82333; }
            .action-buttons { margin: 20px 0; display: flex; gap: 10px; flex-wrap: wrap; }
            #currentStatus { background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6; }
            #currentStatus p { margin: 8px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 WhatsApp Bot Configuration</h1>
            <div id="status"></div>
            
            <div class="section">
                <h3>📱 Group Settings</h3>
                <div class="group-config">
                    <label>Source Group ID (where messages come from):</label>
                    <div class="input-group">
                        <input type="text" id="sourceGroup" placeholder="120363405469016629@g.us">
                        <button type="button" onclick="detectCurrentGroup('source')" class="detect-btn">🔍 Detect Current</button>
                    </div>
                    <small class="help-text">Group ID where messages will be monitored and forwarded from</small>
                </div>
                
                <div class="group-config">
                    <label>Target Group ID (where messages go to):</label>
                    <div class="input-group">
                        <input type="text" id="targetGroup" placeholder="120363417347954807@g.us">
                        <button type="button" onclick="detectCurrentGroup('target')" class="detect-btn">🔍 Detect Current</button>
                    </div>
                    <small class="help-text">Group ID where messages will be forwarded to</small>
                </div>
                
                <div class="group-actions">
                    <button onclick="updateGroupConfig()" class="update-btn">⚡ Update Groups (Hot Reload)</button>
                    <button onclick="restartBot()" class="restart-btn">🔄 Full Restart Bot</button>
                    <button onclick="testGroupConnection()" class="test-btn">🧪 Test Group Connection</button>
                </div>
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
            
            <div class="action-buttons">
                <button onclick="loadConfig()">📥 Load Current Config</button>
                <button onclick="saveConfig()">💾 Save Configuration</button>
                <button onclick="restartBot()">🔄 Restart Bot</button>
                <button onclick="window.open('/qr', '_blank')">📱 View QR Code</button>
            </div>
            
            <div class="section">
                <h3>📊 Current Status</h3>
                <div id="currentStatus">
                    <p><strong>Source Group:</strong> <span id="currentSourceGroup">Loading...</span></p>
                    <p><strong>Target Group:</strong> <span id="currentTargetGroup">Loading...</span></p>
                    <p><strong>Bot Status:</strong> <span id="botStatus">Loading...</span></p>
                </div>
            </div>
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
                    
                    // Update status display
                    document.getElementById('currentSourceGroup').textContent = config.groups.sourceGroup || 'Not set'
                    document.getElementById('currentTargetGroup').textContent = config.groups.targetGroup || 'Not set'
                    document.getElementById('botStatus').textContent = 'Connected' // This could be dynamic
                    
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
            
            async function updateGroupConfig() {
                const sourceGroup = document.getElementById('sourceGroup').value.trim()
                const targetGroup = document.getElementById('targetGroup').value.trim()
                
                if (!sourceGroup || !targetGroup) {
                    showStatus('Please enter both source and target group IDs', 'error')
                    return
                }
                
                if (!sourceGroup.includes('@g.us') || !targetGroup.includes('@g.us')) {
                    showStatus('Group IDs must end with @g.us', 'error')
                    return
                }
                
                try {
                    showStatus('Updating group configuration...', 'info')
                    
                    // Update the configuration
                    const config = {
                        groups: {
                            sourceGroup: sourceGroup,
                            targetGroup: targetGroup
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
                        showStatus('✅ Group configuration saved! Hot reloading...', 'success')
                        
                        // Trigger hot reload
                        await hotReloadConfig()
                    } else {
                        throw new Error('Failed to update configuration')
                    }
                } catch (error) {
                    showStatus('Error updating group configuration: ' + error.message, 'error')
                }
            }
            
            async function testGroupConnection() {
                const sourceGroup = document.getElementById('sourceGroup').value.trim()
                const targetGroup = document.getElementById('targetGroup').value.trim()
                
                if (!sourceGroup || !targetGroup) {
                    showStatus('Please enter both source and target group IDs first', 'error')
                    return
                }
                
                try {
                    showStatus('Testing group connections...', 'info')
                    
                    const response = await fetch('/api/test-groups', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sourceGroup, targetGroup })
                    })
                    
                    const result = await response.json()
                    
                    if (response.ok) {
                        showStatus(\`✅ Group test successful! Source: \${result.sourceGroup.name}, Target: \${result.targetGroup.name}\`, 'success')
                    } else {
                        showStatus(\`❌ Group test failed: \${result.error}\`, 'error')
                    }
                } catch (error) {
                    showStatus('Error testing groups: ' + error.message, 'error')
                }
            }
            
            async function detectCurrentGroup(type) {
                try {
                    showStatus('Detecting current group...', 'info')
                    
                    const response = await fetch('/api/detect-group', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type })
                    })
                    
                    const result = await response.json()
                    
                    if (response.ok && result.groupId) {
                        const inputId = type === 'source' ? 'sourceGroup' : 'targetGroup'
                        document.getElementById(inputId).value = result.groupId
                        showStatus(\`✅ Detected \${type} group: \${result.groupName}\`, 'success')
                    } else {
                        showStatus(\`❌ Could not detect \${type} group: \${result.error}\`, 'error')
                    }
                } catch (error) {
                    showStatus('Error detecting group: ' + error.message, 'error')
                }
            }
            
            async function hotReloadConfig() {
                try {
                    showStatus('⚡ Hot reloading configuration...', 'info')
                    
                    const response = await fetch('/api/hot-reload', { method: 'POST' })
                    const result = await response.json()
                    
                    if (response.ok) {
                        showStatus('✅ Configuration hot reloaded successfully!', 'success')
                        
                        // Update status display
                        setTimeout(() => {
                            loadConfig()
                        }, 1000)
                    } else {
                        throw new Error(result.error || 'Hot reload failed')
                    }
                } catch (error) {
                    showStatus('Error hot reloading: ' + error.message, 'error')
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
    try {
        // Send restart signal by writing to a restart file
        fs.writeFileSync('restart.txt', new Date().toISOString())
        res.json({ success: true, message: 'Restart signal sent' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
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

// QR Code API endpoint
app.get('/api/qr', async (req, res) => {
    try {
        // Import the currentQRCode and connectionStatus from the main bot file
        const { currentQRCode, connectionStatus } = await import('./index.js')
        res.json({ 
            qrCode: currentQRCode,
            connectionStatus: connectionStatus || { connected: false, connectionState: 'unknown' }
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Connection status API endpoint
app.get('/api/status', async (req, res) => {
    try {
        const { connectionStatus } = await import('./index.js')
        res.json({ 
            connectionStatus: connectionStatus || { connected: false, connectionState: 'unknown' }
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Test group connection endpoint
app.post('/api/test-groups', async (req, res) => {
    try {
        const { sourceGroup, targetGroup } = req.body
        
        // Import the bot instance to test group connections
        const { testGroupConnection } = await import('./index.js')
        const result = await testGroupConnection(sourceGroup, targetGroup)
        
        res.json(result)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Detect current group endpoint
app.post('/api/detect-group', async (req, res) => {
    try {
        const { type } = req.body
        
        // Import the bot instance to detect groups
        const { detectCurrentGroup } = await import('./index.js')
        const result = await detectCurrentGroup(type)
        
        res.json(result)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Hot reload endpoint
app.post('/api/hot-reload', async (req, res) => {
    try {
        // Import the hot reload function
        const { hotReloadConfig } = await import('./index.js')
        const result = await hotReloadConfig()
        
        res.json(result)
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
            .qr-code { background: white; padding: 20px; border: 2px solid #25D366; border-radius: 10px; display: inline-block; margin: 20px 0; }
            .qr-code img { max-width: 100%; height: auto; }
            .instructions { margin: 20px 0; color: #666; }
            .refresh { background: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
            .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
            .waiting { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
            .ready { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 WhatsApp Bot QR Code</h1>
            <div class="instructions">
                <h3>📱 Connection Steps:</h3>
                <ol style="text-align: left; margin: 10px 0;">
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to <strong>Settings → Linked Devices</strong></li>
                    <li><strong>If you see an error:</strong> First unlink any existing "WhatsApp Bot" device, then continue</li>
                    <li>Tap <strong>"Link a Device"</strong></li>
                    <li>Scan the QR code below (expires in ~20 seconds)</li>
                </ol>
                <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; text-align: left;">
                    <strong>⚠️ Having connection issues?</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>Make sure you unlinked the old device from WhatsApp settings first</li>
                        <li>Wait 10-15 seconds after unlinking before scanning</li>
                        <li>QR codes expire quickly - scan as soon as it appears</li>
                        <li>Check that your phone has a stable internet connection</li>
                    </ul>
                </div>
            </div>
            <div id="status" class="status waiting">
                Waiting for QR code...
            </div>
            <div id="connection-status" style="display: none; background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                <h4 style="margin: 0 0 10px 0;">📡 Connection Status</h4>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span id="status-text">Checking...</span></p>
                <p style="margin: 5px 0;"><strong>Last Update:</strong> <span id="status-time">-</span></p>
                <div style="background: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px;">
                    <strong>📱 If bot shows connected but phone doesn't:</strong>
                    <ol style="margin: 5px 0; padding-left: 20px;">
                        <li>Open WhatsApp → Settings → Linked Devices</li>
                        <li>Pull down to <strong>REFRESH</strong> the screen</li>
                        <li>Wait 30 seconds and refresh again if needed</li>
                        <li>The device should appear as "WhatsApp Bot" or "Chrome"</li>
                    </ol>
                </div>
            </div>
            <div class="qr-code" id="qr-container" style="display: none;">
                <img id="qr-image" src="" alt="WhatsApp QR Code">
            </div>
            <button class="refresh" onclick="checkQRCode()">🔄 Refresh</button>
            <p><small>This page will automatically refresh when a new QR code is generated</small></p>
        </div>
        
        <script>
            function checkQRCode() {
                fetch('/api/qr')
                    .then(response => response.json())
                    .then(data => {
                        // Update QR code display
                        if (data.qrCode) {
                            document.getElementById('qr-image').src = data.qrCode;
                            document.getElementById('qr-container').style.display = 'block';
                            document.getElementById('status').innerHTML = '✅ QR Code ready - scan with WhatsApp';
                            document.getElementById('status').className = 'status ready';
                        } else {
                            document.getElementById('qr-container').style.display = 'none';
                            document.getElementById('status').innerHTML = '⏳ Waiting for QR code...';
                            document.getElementById('status').className = 'status waiting';
                        }
                        
                        // Update connection status
                        if (data.connectionStatus) {
                            const statusDiv = document.getElementById('connection-status');
                            const statusText = document.getElementById('status-text');
                            const statusTime = document.getElementById('status-time');
                            
                            if (data.connectionStatus.connected) {
                                statusDiv.style.display = 'block';
                                statusText.innerHTML = '<span style="color: green;">✅ Connected</span>';
                                statusText.className = 'status connected';
                                if (data.connectionStatus.lastUpdate) {
                                    const date = new Date(data.connectionStatus.lastUpdate);
                                    statusTime.textContent = date.toLocaleString();
                                }
                                // Hide QR code if connected
                                if (data.connectionStatus.connected) {
                                    document.getElementById('qr-container').style.display = 'none';
                                    document.getElementById('status').innerHTML = '✅ Bot is connected! Check your phone\'s Linked Devices and refresh if needed.';
                                    document.getElementById('status').className = 'status ready';
                                }
                            } else if (data.connectionStatus.connectionState === 'connecting') {
                                statusDiv.style.display = 'block';
                                statusText.innerHTML = '<span style="color: orange;">🔄 Connecting...</span>';
                                statusTime.textContent = 'Just now';
                            } else {
                                statusDiv.style.display = 'none';
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        document.getElementById('status').innerHTML = '❌ Error loading QR code';
                        document.getElementById('status').className = 'status error';
                    });
            }
            
            // Check for QR code and status every 2 seconds
            setInterval(checkQRCode, 2000);
            
            // Check immediately on page load
            checkQRCode();
        </script>
    </body>
    </html>
    `)
})

app.listen(PORT, () => {
    console.log(`🌐 Web interface running at http://localhost:${PORT}`)
})
