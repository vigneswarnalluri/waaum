import { default as makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, downloadMediaMessage } from "@whiskeysockets/baileys"
import P from "pino"
import qrcode from "qrcode-terminal"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import express from 'express'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'))

// Rate limiting
const messageCounts = new Map()
const mediaCounts = new Map()

// Statistics
const stats = {
    messagesForwarded: 0,
    mediaForwarded: 0,
    messagesFiltered: 0,
    errors: 0,
    startTime: new Date()
}

// Helper functions
function resetRateLimit() {
    messageCounts.clear()
    mediaCounts.clear()
}

function checkRateLimit(type = 'message') {
    if (!config.rateLimit.enabled) return true
    
    const now = Date.now()
    const minute = Math.floor(now / 60000)
    const counts = type === 'media' ? mediaCounts : messageCounts
    const maxCount = type === 'media' ? config.rateLimit.maxMediaPerMinute : config.rateLimit.maxMessagesPerMinute
    
    if (!counts.has(minute)) {
        counts.set(minute, 0)
    }
    
    const currentCount = counts.get(minute)
    if (currentCount >= maxCount) {
        return false
    }
    
    counts.set(minute, currentCount + 1)
    return true
}

function shouldForwardMessage(text, sender) {
    if (!config.filters.enabled) return true
    
    // Check blocked users
    if (config.filters.blockedUsers.length > 0 && config.filters.blockedUsers.includes(sender)) {
        return false
    }
    
    // Check allowed users (if specified, only allow these users)
    if (config.filters.allowedUsers.length > 0 && !config.filters.allowedUsers.includes(sender)) {
        return false
    }
    
    // Check exclude keywords
    if (config.filters.excludeKeywords.length > 0) {
        const lowerText = text.toLowerCase()
        for (const keyword of config.filters.excludeKeywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                return false
            }
        }
    }
    
    // Check include keywords (if specified, only forward messages with these keywords)
    if (config.filters.keywords.length > 0) {
        const lowerText = text.toLowerCase()
        for (const keyword of config.filters.keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                return true
            }
        }
        return false
    }
    
    return true
}

function logMessage(level, message) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`
    
    console.log(logEntry)
    
    if (config.logging.saveToFile) {
        fs.appendFileSync(config.logging.logFile, logEntry + '\n')
    }
}

// Express app setup
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
        <title>WhatsApp Bot Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .status { padding: 15px; margin: 20px 0; border-radius: 5px; }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
            .stat-number { font-size: 2em; font-weight: bold; color: #25D366; }
            .stat-label { color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 WhatsApp Bot Dashboard</h1>
            
            <div class="status success">
                <h3>✅ Bot Status: Running</h3>
                <p>Your WhatsApp bot is successfully running on Railway!</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${stats.messagesForwarded}</div>
                    <div class="stat-label">Messages Forwarded</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.mediaForwarded}</div>
                    <div class="stat-label">Media Forwarded</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.messagesFiltered}</div>
                    <div class="stat-label">Messages Filtered</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.errors}</div>
                    <div class="stat-label">Errors</div>
                </div>
            </div>
            
            <div class="status info">
                <h3>📱 WhatsApp Connection</h3>
                <p>Check Railway logs for QR code to connect WhatsApp</p>
                <p><strong>Source Group:</strong> ${config.groups.sourceGroup}</p>
                <p><strong>Target Group:</strong> ${config.groups.targetGroup}</p>
                <p><a href="/qr" style="color: #25D366; font-weight: bold;">🔗 View QR Code in Web Interface</a></p>
            </div>
            
            <h3>🔧 Configuration</h3>
            <p>Edit <code>config.json</code> to modify bot settings:</p>
            <ul>
                <li>Group IDs</li>
                <li>Message filters</li>
                <li>Rate limiting</li>
                <li>Media forwarding settings</li>
            </ul>
        </div>
    </body>
    </html>
    `)
})

// Store QR code globally
let currentQR = null

// API endpoints
app.get('/api/stats', (req, res) => {
    res.json(stats)
})

app.get('/api/config', (req, res) => {
    res.json(config)
})

// QR Code endpoint for better display
app.get('/qr', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WhatsApp QR Code</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: #f5f5f5; 
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
            }
            .container { 
                max-width: 600px; 
                background: white; 
                padding: 30px; 
                border-radius: 10px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                text-align: center;
            }
            .qr-container {
                background: white;
                padding: 20px;
                border: 2px solid #25D366;
                border-radius: 10px;
                margin: 20px 0;
                display: inline-block;
            }
            .qr-text {
                font-family: monospace;
                font-size: 12px;
                line-height: 1;
                white-space: pre;
                color: #000;
                background: #fff;
            }
            .instructions {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .status {
                padding: 10px;
                border-radius: 5px;
                margin: 10px 0;
            }
            .success { background: #d4edda; color: #155724; }
            .warning { background: #fff3cd; color: #856404; }
            .refresh-btn {
                background: #25D366;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin: 10px;
            }
            .refresh-btn:hover {
                background: #128C7E;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📱 WhatsApp QR Code</h1>
            
            <div class="instructions">
                <h3>How to Connect:</h3>
                <ol style="text-align: left;">
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to Settings → Linked Devices</li>
                    <li>Tap "Link a Device"</li>
                    <li>Scan the QR code below</li>
                </ol>
            </div>
            
            ${currentQR ? `
                <div class="status success">
                    <h3>✅ QR Code Available</h3>
                    <p>Scan this QR code with your WhatsApp app:</p>
                </div>
                
                <div class="qr-container">
                    <div class="qr-text">${currentQR}</div>
                </div>
                
                <div class="status warning">
                    <p><strong>Note:</strong> QR codes expire after 20 seconds. If this one doesn't work, refresh the page.</p>
                </div>
            ` : `
                <div class="status warning">
                    <h3>⏳ Waiting for QR Code</h3>
                    <p>No QR code available yet. The bot is starting up...</p>
                    <p>This page will automatically refresh every 5 seconds.</p>
                </div>
            `}
            
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh QR Code</button>
            
            <div style="margin-top: 30px;">
                <a href="/" style="color: #25D366; text-decoration: none;">← Back to Dashboard</a>
            </div>
        </div>
        
        <script>
            // Auto-refresh every 5 seconds if no QR code
            ${!currentQR ? `
                setTimeout(() => {
                    location.reload();
                }, 5000);
            ` : ''}
        </script>
    </body>
    </html>
    `)
})

// Start Express server
app.listen(PORT, () => {
    console.log(`🌐 Web interface running at http://localhost:${PORT}`)
    logMessage("info", `Web interface started on port ${PORT}`)
})

// WhatsApp Bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info")
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: config.logging.level })
    })

    sock.ev.on("creds.update", saveCreds)

    // Connection handler
    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update
        if (qr) {
            logMessage("info", "QR Code generated - scan with WhatsApp")
            console.log("Scan this QR code with WhatsApp:")
            console.log("=".repeat(50))
            qrcode.generate(qr, { small: true })
            console.log("=".repeat(50))
            console.log("🌐 Better QR display: https://waaum-production.up.railway.app/qr")
            console.log("If QR code is split, use the web interface above")
            
            // Store QR code for web interface
            currentQR = qrcode.generate(qr, { small: true })
        }
        if (connection === "open") {
            logMessage("info", "✅ Connected to WhatsApp successfully")
            console.log("✅ Connected to WhatsApp")
            
            // Reset rate limiting every hour
            setInterval(resetRateLimit, 60 * 60 * 1000)
        } else if (connection === "close") {
            logMessage("error", "❌ Connection closed, retrying...")
            console.log("❌ Connection closed, retrying...")
            setTimeout(startBot, 5000) // Retry after 5 seconds
        }
    })

    // Load group IDs from config
    const sourceGroup = config.groups.sourceGroup
    const targetGroup = config.groups.targetGroup

    // Inside the messages.upsert event
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0]
        if (!msg.message) return
        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid

        // Log group IDs for testing
        logMessage("debug", `Message from: ${from}, Sender: ${sender}`)

        if (from === sourceGroup) {
            // Check rate limiting
            if (!checkRateLimit('message')) {
                logMessage("warn", "Rate limit exceeded for messages")
                return
            }

            // Handle text messages
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text
            if (text && config.settings.forwardText) {
                // Check if message should be forwarded based on filters
                if (!shouldForwardMessage(text, sender)) {
                    stats.messagesFiltered++
                    logMessage("info", `Message filtered out: ${text.substring(0, 50)}...`)
                    return
                }
                
                logMessage("info", `Forwarding text: ${text.substring(0, 50)}...`)
                try {
                    await sock.sendMessage(targetGroup, { text })
                    stats.messagesForwarded++
                    logMessage("info", "✅ Text message forwarded successfully")
                } catch (err) {
                    stats.errors++
                    logMessage("error", `❌ Error forwarding text: ${err.message}`)
                }
            }

            // Handle media messages
            const hasImage = msg.message.imageMessage && config.settings.forwardImages
            const hasVideo = msg.message.videoMessage && config.settings.forwardVideos
            const hasAudio = msg.message.audioMessage && config.settings.forwardAudio
            const hasDocument = msg.message.documentMessage && config.settings.forwardDocuments
            
            if (hasImage || hasVideo || hasAudio || hasDocument) {
                // Check rate limiting for media
                if (!checkRateLimit('media')) {
                    logMessage("warn", "Rate limit exceeded for media")
                    return
                }
                
                try {
                    logMessage("info", "Processing media message...")
                    
                    // Download media as buffer
                    const buffer = await downloadMediaMessage(
                        msg,
                        "buffer",
                        { },
                        {
                            logger: P({ level: config.logging.level }),
                            reuploadRequest: sock.updateMediaMessage
                        }
                    )
            
                    // Check if buffer is valid
                    if (!buffer || buffer.length === 0) {
                        logMessage("error", "❌ Invalid or empty media buffer")
                        return
                    }
                    
                    // Detect type
                    const type = Object.keys(msg.message)[0]
                    logMessage("info", `Forwarding media: ${type}, Buffer size: ${buffer.length} bytes`)
            
                    if (type === "imageMessage") {
                        await sock.sendMessage(targetGroup, {
                            image: buffer,
                            caption: msg.message.imageMessage?.caption || "",
                            mimetype: msg.message.imageMessage?.mimetype || "image/jpeg"
                        })
                    } else if (type === "videoMessage") {
                        await sock.sendMessage(targetGroup, {
                            video: buffer,
                            caption: msg.message.videoMessage?.caption || "",
                            mimetype: msg.message.videoMessage?.mimetype || "video/mp4"
                        })
                    } else if (type === "audioMessage") {
                        await sock.sendMessage(targetGroup, {
                            audio: buffer,
                            mimetype: msg.message.audioMessage?.mimetype || "audio/mpeg",
                            ptt: msg.message.audioMessage?.ptt || false
                        })
                    } else if (type === "documentMessage") {
                        await sock.sendMessage(targetGroup, {
                            document: buffer,
                            mimetype: msg.message.documentMessage?.mimetype || "application/octet-stream",
                            fileName: msg.message.documentMessage?.fileName || "file"
                        })
                    }
            
                    stats.mediaForwarded++
                    logMessage("info", "✅ Media forwarded successfully")
            
                } catch (err) {
                    stats.errors++
                    logMessage("error", `❌ Error forwarding media: ${err.message}`)
                }
            }
            
        }
    })
}

// Start WhatsApp bot
startBot()
