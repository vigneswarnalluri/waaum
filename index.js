import { default as makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, downloadMediaMessage } from "@whiskeysockets/baileys"
import P from "pino"
import qrcode from "qrcode-terminal"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

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
            console.log("If QR code is split, try:")
            console.log("1. Make terminal window wider")
            console.log("2. Use Railway web interface logs")
            console.log("3. Check Railway dashboard for better QR display")
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
startBot()
