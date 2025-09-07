import { default as makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, downloadMediaMessage } from "@whiskeysockets/baileys"
import P from "pino"
import qrcode from "qrcode"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load configuration function
function loadConfig() {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'))
}

// Load initial configuration
let config = loadConfig()

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

// Global QR code storage
let currentQRCode = null

// Global bot instance for hot reload
let globalSock = null

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

async function validateGroupMembership(sock, groupId) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId)
        logMessage("info", `✅ Bot is member of group: ${groupId}`)
        logMessage("info", `Group name: ${groupMetadata.subject}`)
        logMessage("info", `Group participants: ${groupMetadata.participants.length}`)
        return true
    } catch (error) {
        logMessage("error", `❌ Bot is NOT member of group: ${groupId}`)
        logMessage("error", `Error: ${error.message}`)
        return false
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
    
    // Store global reference for hot reload
    globalSock = sock

    sock.ev.on("creds.update", saveCreds)

    // Connection handler
    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update
        if (qr) {
            logMessage("info", "QR Code generated - scan with WhatsApp")
            console.log("Scan this QR code with WhatsApp:")
            console.log("=".repeat(50))
            
            try {
                // Generate QR code as data URL
                const qrDataURL = await qrcode.toDataURL(qr, {
                    width: 512,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                })
                
                // Store QR code globally
                currentQRCode = qrDataURL
                
                // Also generate terminal version as fallback
                const qrTerminal = await qrcode.toString(qr, { type: 'terminal', small: true })
                console.log(qrTerminal)
                
                console.log("=".repeat(50))
                console.log("🌐 For better QR code display, visit:")
                console.log(`   http://localhost:${process.env.PORT || 3000}/qr`)
                console.log("   or check Railway web interface")
                console.log("=".repeat(50))
                
            } catch (error) {
                logMessage("error", `Failed to generate QR code: ${error.message}`)
                console.log("❌ Failed to generate QR code")
            }
        }
        if (connection === "open") {
            logMessage("info", "✅ Connected to WhatsApp successfully")
            console.log("✅ Connected to WhatsApp")
            
            // Validate group memberships
            setTimeout(async () => {
                logMessage("info", "🔍 Validating group memberships...")
                const sourceValid = await validateGroupMembership(sock, config.groups.sourceGroup)
                const targetValid = await validateGroupMembership(sock, config.groups.targetGroup)
                
                // Log validation results
                if (sourceValid && targetValid) {
                    logMessage("info", "✅ Both groups validated successfully - Bot is ready to forward messages")
                } else {
                    logMessage("warn", "⚠️ Group validation failed - Check bot membership in both groups")
                }
            }, 5000) // Wait 5 seconds after connection
            
            // Reset rate limiting every hour
            setInterval(resetRateLimit, 60 * 60 * 1000)
        } else if (connection === "close") {
            logMessage("error", "❌ Connection closed, retrying...")
            console.log("❌ Connection closed, retrying...")
            setTimeout(startBot, 5000) // Retry after 5 seconds
        }
    })

    // Log configuration for debugging
    logMessage("info", `Bot configured - Source Group: ${config.groups.sourceGroup}, Target Group: ${config.groups.targetGroup}`)

  // Function to process actual message content from messageContextInfo
async function processActualMessage(actualMessage, originalMsg, sock) {
    const from = originalMsg.key.remoteJid
    const sender = originalMsg.key.participant || originalMsg.key.remoteJid
    
    logMessage("debug", "Processing actual message content from messageContextInfo")
    logMessage("debug", `Actual message structure: ${JSON.stringify(Object.keys(actualMessage))}`)
    
    // Extract text content from the actual message - try multiple formats
    let text = actualMessage.conversation || 
               actualMessage.extendedTextMessage?.text || 
               actualMessage.textMessage?.text ||
               actualMessage.message?.conversation ||
               actualMessage.message?.extendedTextMessage?.text
    
    logMessage("debug", `Extracted text content: "${text}"`)
    logMessage("debug", `Text content type: ${typeof text}, Length: ${text ? text.length : 0}`)
    
    // If still no text, log the full structure for debugging
    if (!text) {
        logMessage("debug", `Full actualMessage structure: ${JSON.stringify(actualMessage, null, 2)}`)
    }
    
    if (text && config.settings.forwardText) {
        logMessage("info", `📝 Processing extracted text message for forwarding...`)
        
        // Check if message should be forwarded based on filters
        if (!shouldForwardMessage(text, sender)) {
            stats.messagesFiltered++
            logMessage("info", `Message filtered out: ${text.substring(0, 50)}...`)
            return
        }
        
        logMessage("info", `Forwarding extracted text: ${text.substring(0, 50)}...`)
        try {
            const cleanMessage = { text: text }
            const result = await sock.sendMessage(config.groups.targetGroup, cleanMessage)
            stats.messagesForwarded++
            logMessage("info", `✅ Extracted text message forwarded successfully`)
        } catch (err) {
            stats.errors++
            logMessage("error", `❌ Error forwarding extracted text: ${err.message}`)
        }
    } else if (!text) {
        logMessage("debug", `No text content found in extracted message`)
    }
    
    // Handle media in the actual message
    const hasImage = actualMessage.imageMessage && config.settings.forwardImages
    const hasVideo = actualMessage.videoMessage && config.settings.forwardVideos
    const hasAudio = actualMessage.audioMessage && config.settings.forwardAudio
    const hasDocument = actualMessage.documentMessage && config.settings.forwardDocuments
    
    logMessage("debug", `Media detection - Image: ${hasImage}, Video: ${hasVideo}, Audio: ${hasAudio}, Document: ${hasDocument}`)
    
    if (hasImage || hasVideo || hasAudio || hasDocument) {
        logMessage("info", `📸 Processing extracted media message from messageContextInfo...`)
        if (!checkRateLimit('media')) {
            logMessage("warn", "Rate limit exceeded for media")
            return
        }
        
        try {
            logMessage("info", "Processing extracted media message...")
            
            const buffer = await downloadMediaMessage(
                { ...originalMsg, message: actualMessage },
                "buffer",
                { },
                {
                    logger: P({ level: config.logging.level }),
                    reuploadRequest: sock.updateMediaMessage
                }
            )
            
            if (!buffer || buffer.length === 0) {
                logMessage("error", "❌ Invalid or empty media buffer")
                return
            }
            
            const type = Object.keys(actualMessage)[0]
            const finalCaption = actualMessage[type]?.caption || ""
            
            logMessage("info", `📸 Forwarding extracted ${type} with caption: ${finalCaption ? 'Yes' : 'No'}`)
            
            if (type === "imageMessage") {
                const cleanImageMessage = {
                    image: buffer,
                    mimetype: actualMessage.imageMessage?.mimetype || "image/jpeg"
                }
                if (finalCaption) {
                    cleanImageMessage.caption = finalCaption
                }
                await sock.sendMessage(config.groups.targetGroup, cleanImageMessage)
            } else if (type === "videoMessage") {
                const cleanVideoMessage = {
                    video: buffer,
                    mimetype: actualMessage.videoMessage?.mimetype || "video/mp4"
                }
                if (finalCaption) {
                    cleanVideoMessage.caption = finalCaption
                }
                await sock.sendMessage(config.groups.targetGroup, cleanVideoMessage)
            } else if (type === "audioMessage") {
                await sock.sendMessage(config.groups.targetGroup, {
                    audio: buffer,
                    mimetype: actualMessage.audioMessage?.mimetype || "audio/mpeg",
                    ptt: actualMessage.audioMessage?.ptt || false
                })
            } else if (type === "documentMessage") {
                const cleanDocumentMessage = {
                    document: buffer,
                    mimetype: actualMessage.documentMessage?.mimetype || "application/octet-stream",
                    fileName: actualMessage.documentMessage?.fileName || "file"
                }
                if (finalCaption) {
                    cleanDocumentMessage.caption = finalCaption
                }
                await sock.sendMessage(config.groups.targetGroup, cleanDocumentMessage)
            }
            
            stats.mediaForwarded++
            logMessage("info", "✅ Extracted media forwarded successfully")
            
        } catch (err) {
            stats.errors++
            logMessage("error", `❌ Error forwarding extracted media: ${err.message}`)
        }
    }
}

// Inside the messages.upsert event
sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0]
    if (!msg.message) return
    const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid

    // Enhanced logging for debugging
    logMessage("debug", `Message received from: ${from}, Sender: ${sender}`)
    logMessage("debug", `Expected source group: ${config.groups.sourceGroup}`)
    logMessage("debug", `Message type: ${Object.keys(msg.message)[0]}`)
    
    // Log ALL message types for debugging - from ANY group
    logMessage("info", `🔍 MESSAGE FROM: ${from}`)
    logMessage("info", `🔍 ALL MESSAGE TYPES: ${JSON.stringify(Object.keys(msg.message))}`)
    if (from === config.groups.sourceGroup) {
        logMessage("info", `🔍 SOURCE GROUP MESSAGE - FULL STRUCTURE: ${JSON.stringify(msg.message, null, 2)}`)
    }
    
    // Check for forwarded message indicators
    const messageType = Object.keys(msg.message)[0]
    const isForwarded = msg.message[messageType]?.contextInfo?.forwardingScore > 0
    if (isForwarded) {
        logMessage("debug", "Message is forwarded (forwardingScore > 0)")
    }
    
    // Check if message is from expected source group
    if (from === config.groups.sourceGroup) {
        logMessage("info", `✅ Message from source group detected: ${from}`)
        logMessage("debug", `Message type: ${messageType}`)
        
        // Skip system messages that don't contain user content
        if (messageType === 'senderKeyDistributionMessage' || 
            messageType === 'protocolMessage' || 
            messageType === 'reactionMessage') {
            logMessage("debug", `Skipping system message type: ${messageType}`)
            return
        }
        
        // Handle ephemeral messages (disappearing messages)
        if (messageType === 'ephemeralMessage') {
            logMessage("debug", "Processing ephemeral message - extracting content")
            const ephemeralContent = msg.message.ephemeralMessage?.message
            if (ephemeralContent) {
                // Process the ephemeral message content
                await processActualMessage(ephemeralContent, msg, sock)
                return
            } else {
                logMessage("debug", "No content found in ephemeral message")
                return
            }
        }
        
        // Handle messageContextInfo - extract the actual message content
        if (messageType === 'messageContextInfo') {
            logMessage("debug", "Processing messageContextInfo - extracting actual message content")
            // messageContextInfo contains the actual message in its context
            const actualMessage = msg.message.messageContextInfo?.quotedMessage
            if (actualMessage) {
                // Process the actual message content
                await processActualMessage(actualMessage, msg, sock)
                return
            } else {
                logMessage("debug", "No quoted message found in messageContextInfo")
                return
            }
        }
        
        // Check rate limiting
        if (!checkRateLimit('message')) {
            logMessage("warn", "Rate limit exceeded for messages")
            return
        }

        // Handle text messages (including forwarded messages)
        let text = msg.message.conversation || msg.message.extendedTextMessage?.text
        
        logMessage("debug", `Processing message - Text content: ${text ? 'Yes' : 'No'}`)
        
        // Handle forwarded messages - extract content and strip forwarding metadata
        if (isForwarded) {
            logMessage("debug", "Processing forwarded message")
            // For forwarded messages, extract the text content directly
            if (msg.message.extendedTextMessage?.text) {
                text = msg.message.extendedTextMessage.text
            } else if (msg.message.conversation) {
                text = msg.message.conversation
            }
        }
        
        // Handle quoted messages (replies) - strip context info to avoid forwarding detection
        if (msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage
            const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text
            if (quotedText) {
                text = `${text}\n\n💬 Reply to: ${quotedText}`
                logMessage("debug", "Processing quoted message")
            }
        }
        
        if (text && config.settings.forwardText) {
            logMessage("info", `📝 Processing text message for forwarding...`)
            // Check if message should be forwarded based on filters
            if (!shouldForwardMessage(text, sender)) {
                stats.messagesFiltered++
                logMessage("info", `Message filtered out: ${text.substring(0, 50)}...`)
                return
            }
            
            logMessage("info", `Forwarding text: ${text.substring(0, 50)}...`)
            logMessage("debug", `Sending to target group: ${config.groups.targetGroup}`)
            try {
                // Create a completely clean message object to avoid forwarding detection
                const cleanMessage = {
                    text: text
                }
                
                logMessage("info", `🚀 Attempting to send message to target group: ${config.groups.targetGroup}`)
                logMessage("info", `🚀 Message content: "${text}"`)
                
                const result = await sock.sendMessage(config.groups.targetGroup, cleanMessage)
                stats.messagesForwarded++
                logMessage("info", `✅ Text message forwarded successfully to ${config.groups.targetGroup}`)
                logMessage("info", `🚀 Send result: ${JSON.stringify(result)}`)
            } catch (err) {
                stats.errors++
                logMessage("error", `❌ Error forwarding text to ${config.groups.targetGroup}: ${err.message}`)
                logMessage("error", `Error details: ${JSON.stringify(err)}`)
            }
        } else if (!text) {
            logMessage("debug", `No text content found in message type: ${messageType}`)
        } else if (!config.settings.forwardText) {
            logMessage("debug", `Text forwarding is disabled in config`)
        }
        
        // Catch-all handler for any unhandled message types
        if (!text && !hasImage && !hasVideo && !hasAudio && !hasDocument) {
            logMessage("warn", `⚠️ UNHANDLED MESSAGE TYPE: ${messageType}`)
            logMessage("warn", `⚠️ Message structure: ${JSON.stringify(msg.message, null, 2)}`)
        }

        // Handle media messages (including forwarded media)
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
                
                // Download media as buffer and strip forwarding metadata
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
                
                // Use original caption without attribution
                const finalCaption = msg.message[type]?.caption || ""
        
                // Create completely clean message objects to avoid forwarding detection
                if (type === "imageMessage") {
                    const cleanImageMessage = {
                        image: buffer,
                        mimetype: msg.message.imageMessage?.mimetype || "image/jpeg"
                    }
                    if (finalCaption) {
                        cleanImageMessage.caption = finalCaption
                    }
                    await sock.sendMessage(config.groups.targetGroup, cleanImageMessage)
                } else if (type === "videoMessage") {
                    const cleanVideoMessage = {
                        video: buffer,
                        mimetype: msg.message.videoMessage?.mimetype || "video/mp4"
                    }
                    if (finalCaption) {
                        cleanVideoMessage.caption = finalCaption
                    }
                    await sock.sendMessage(config.groups.targetGroup, cleanVideoMessage)
                } else if (type === "audioMessage") {
                    const cleanAudioMessage = {
                        audio: buffer,
                        mimetype: msg.message.audioMessage?.mimetype || "audio/mpeg",
                        ptt: msg.message.audioMessage?.ptt || false
                    }
                    await sock.sendMessage(config.groups.targetGroup, cleanAudioMessage)
                } else if (type === "documentMessage") {
                    const cleanDocumentMessage = {
                        document: buffer,
                        mimetype: msg.message.documentMessage?.mimetype || "application/octet-stream",
                        fileName: msg.message.documentMessage?.fileName || "file"
                    }
                    if (finalCaption) {
                        cleanDocumentMessage.caption = finalCaption
                    }
                    await sock.sendMessage(config.groups.targetGroup, cleanDocumentMessage)
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

// Test group connection function
async function testGroupConnection(sourceGroup, targetGroup) {
    try {
        // This would need access to the sock instance
        // For now, return a simple validation
        if (!sourceGroup || !targetGroup) {
            return { error: 'Both source and target groups are required' }
        }
        
        if (!sourceGroup.includes('@g.us') || !targetGroup.includes('@g.us')) {
            return { error: 'Group IDs must end with @g.us' }
        }
        
        return {
            success: true,
            sourceGroup: { id: sourceGroup, name: 'Source Group' },
            targetGroup: { id: targetGroup, name: 'Target Group' }
        }
    } catch (error) {
        return { error: error.message }
    }
}

// Detect current group function
async function detectCurrentGroup(type) {
    try {
        // This would need access to the sock instance and recent messages
        // For now, return a placeholder
        return {
            error: 'Group detection requires bot to be running and receiving messages'
        }
    } catch (error) {
        return { error: error.message }
    }
}

// Hot reload configuration function
async function hotReloadConfig() {
    try {
        logMessage("info", "🔄 Hot reloading configuration...")
        
        // Reload configuration from file
        const newConfig = loadConfig()
        
        // Update global config
        config = newConfig
        
        // Log the changes
        logMessage("info", `✅ Configuration reloaded - Source: ${config.groups.sourceGroup}, Target: ${config.groups.targetGroup}`)
        
        // Validate new group memberships if bot is connected
        if (globalSock) {
            setTimeout(async () => {
                logMessage("info", "🔍 Validating updated group memberships...")
                await validateGroupMembership(globalSock, config.groups.sourceGroup)
                await validateGroupMembership(globalSock, config.groups.targetGroup)
            }, 2000)
        }
        
        return { success: true, message: 'Configuration reloaded successfully' }
    } catch (error) {
        logMessage("error", `❌ Hot reload failed: ${error.message}`)
        return { error: error.message }
    }
}

// Export functions for web interface
export { currentQRCode, testGroupConnection, detectCurrentGroup, hotReloadConfig }

// Hot reload monitoring
function watchForHotReload() {
    setInterval(() => {
        try {
            if (fs.existsSync('hotreload.txt')) {
                logMessage("info", "🔄 Hot reload signal detected...")
                fs.unlinkSync('hotreload.txt')
                hotReloadConfig()
            }
        } catch (error) {
            // Ignore errors
        }
    }, 1000) // Check every 1 second for faster response
}

// Restart monitoring
function watchForRestart() {
    setInterval(() => {
        try {
            if (fs.existsSync('restart.txt')) {
                logMessage("info", "🔄 Restart signal detected, restarting bot...")
                fs.unlinkSync('restart.txt')
                setTimeout(() => {
                    process.exit(0) // This will cause the process to restart
                }, 1000)
            }
        } catch (error) {
            // Ignore errors
        }
    }, 2000) // Check every 2 seconds
}

// Start both WhatsApp bot and web interface
startBot()

// Start monitoring
watchForHotReload()
watchForRestart()

// Start web interface
import('./web-interface.js').catch(err => {
    console.error('Failed to start web interface:', err)
})
