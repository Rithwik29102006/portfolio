// ============================================
// Portfolio Contact Form - Backend Server
// Stack: Node.js + Express + MongoDB
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const validator = require('validator');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ========================
// Configuration
// ========================
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio_contact';

// Email Configuration (optional - set these env vars to enable email notifications)
const EMAIL_ENABLED = process.env.EMAIL_USER && process.env.EMAIL_PASS;
const EMAIL_CONFIG = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    to: process.env.EMAIL_TO || 'rithwikreddy1029@gmail.com'
};

// Fallback: JSON file storage if MongoDB is unavailable
const FALLBACK_DB_PATH = path.join(__dirname, 'data', 'messages.json');

// ========================
// MongoDB Schema & Model
// ========================
const contactMessageSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, maxlength: 150 },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    subject: { type: String, trim: true, maxlength: 200, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    ip: { type: String, default: '' },
    created_at: { type: Date, default: Date.now }
});

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

// ========================
// Express App Setup
// ========================
const app = express();

// Middleware
app.use(cors({
    origin: '*',  // In production, restrict this to your domain
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ========================
// Spam Protection
// ========================
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5;            // max 5 requests per minute per IP

function checkRateLimit(ip) {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record) {
        rateLimitMap.set(ip, { count: 1, start: now });
        return true;
    }

    if (now - record.start > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { count: 1, start: now });
        return true;
    }

    if (record.count >= RATE_LIMIT_MAX) {
        return false;
    }

    record.count++;
    return true;
}

// Clean up rate limit map every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
        if (now - record.start > RATE_LIMIT_WINDOW * 2) {
            rateLimitMap.delete(ip);
        }
    }
}, 5 * 60 * 1000);

// ========================
// Fallback File Storage
// ========================
let useMongoDb = false;

function ensureFallbackDir() {
    const dir = path.dirname(FALLBACK_DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(FALLBACK_DB_PATH)) {
        fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify([], null, 2));
    }
}

function saveToFile(messageData) {
    ensureFallbackDir();
    const messages = JSON.parse(fs.readFileSync(FALLBACK_DB_PATH, 'utf8'));
    messages.push({
        id: messages.length + 1,
        ...messageData,
        created_at: new Date().toISOString()
    });
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(messages, null, 2));
    return messages[messages.length - 1];
}

function getAllFromFile() {
    ensureFallbackDir();
    return JSON.parse(fs.readFileSync(FALLBACK_DB_PATH, 'utf8'));
}

// ========================
// Email Notification
// ========================
async function sendEmailNotification(messageData) {
    if (!EMAIL_ENABLED) {
        console.log('[Email] Notifications disabled (no EMAIL_USER/EMAIL_PASS set)');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: EMAIL_CONFIG.service,
            auth: {
                user: EMAIL_CONFIG.user,
                pass: EMAIL_CONFIG.pass
            }
        });

        const mailOptions = {
            from: `"Portfolio Contact" <${EMAIL_CONFIG.user}>`,
            to: EMAIL_CONFIG.to,
            subject: `New Contact: ${messageData.subject || 'No Subject'} — from ${messageData.name}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #38bdf8; border-bottom: 2px solid #38bdf8; padding-bottom: 10px;">
            📩 New Portfolio Contact Message
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px; font-weight: bold; color: #666;">Name</td><td style="padding: 8px;">${messageData.name}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #666;">Email</td><td style="padding: 8px;">${messageData.email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #666;">Phone</td><td style="padding: 8px;">${messageData.phone || 'N/A'}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #666;">Subject</td><td style="padding: 8px;">${messageData.subject || 'N/A'}</td></tr>
          </table>
          <div style="margin-top: 20px; padding: 16px; background: #f0f7ff; border-left: 4px solid #38bdf8; border-radius: 4px;">
            <strong>Message:</strong><br/><br/>
            ${messageData.message.replace(/\n/g, '<br/>')}
          </div>
          <p style="margin-top: 20px; color: #999; font-size: 12px;">
            Sent from your portfolio contact form at ${new Date().toLocaleString()}
          </p>
        </div>
      `
        };

        await transporter.sendMail(mailOptions);
        console.log('[Email] Notification sent successfully');
    } catch (err) {
        console.error('[Email] Failed to send notification:', err.message);
    }
}

// ========================
// API Routes
// ========================

// Health check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Portfolio Contact API is running',
        database: useMongoDb ? 'MongoDB' : 'JSON File (fallback)',
        timestamp: new Date().toISOString()
    });
});

// POST /api/contact - Submit a contact message
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        console.log(`[Contact] New submission from ${name} <${email}>`);

        // --- Rate Limiting ---
        if (!checkRateLimit(clientIp)) {
            console.log(`[Spam] Rate limit exceeded for IP: ${clientIp}`);
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please wait a moment before trying again.'
            });
        }

        // --- Input Validation ---
        const errors = [];

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            errors.push('Name is required');
        } else if (name.trim().length > 100) {
            errors.push('Name must be less than 100 characters');
        }

        if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
            errors.push('A valid email address is required');
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            errors.push('Message is required');
        } else if (message.trim().length > 5000) {
            errors.push('Message must be less than 5000 characters');
        }

        if (phone && typeof phone === 'string' && phone.trim().length > 0) {
            // Allow digits, spaces, +, -, () only
            const phoneClean = phone.replace(/[\s\-\(\)\+]/g, '');
            if (!/^\d{0,15}$/.test(phoneClean)) {
                errors.push('Please enter a valid phone number');
            }
        }

        if (subject && typeof subject === 'string' && subject.trim().length > 200) {
            errors.push('Subject must be less than 200 characters');
        }

        // Spam keyword detection
        const spamKeywords = ['buy now', 'click here', 'free money', 'lottery', 'viagra', 'casino'];
        const combinedText = `${name} ${subject} ${message}`.toLowerCase();
        if (spamKeywords.some(keyword => combinedText.includes(keyword))) {
            console.log(`[Spam] Spam keywords detected from ${clientIp}`);
            return res.status(400).json({
                success: false,
                message: 'Your message was flagged as spam. Please revise and try again.'
            });
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: errors.join('. ')
            });
        }

        // --- Save Message ---
        const messageData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: (phone || '').trim(),
            subject: (subject || '').trim(),
            message: message.trim(),
            ip: clientIp
        };

        let savedMessage;

        if (useMongoDb) {
            const doc = new ContactMessage(messageData);
            savedMessage = await doc.save();
            console.log(`[DB] Message saved to MongoDB with id: ${savedMessage._id}`);
        } else {
            savedMessage = saveToFile(messageData);
            console.log(`[DB] Message saved to JSON file with id: ${savedMessage.id}`);
        }

        // --- Send Email Notification (async, don't block response) ---
        sendEmailNotification(messageData).catch(err => {
            console.error('[Email] Background send failed:', err.message);
        });

        // --- Success Response ---
        res.status(201).json({
            success: true,
            message: 'Message sent successfully! I\'ll get back to you soon.'
        });

    } catch (err) {
        console.error('[Error] Failed to process contact submission:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
});

// GET /api/messages - View all messages (for admin purposes)
app.get('/api/messages', async (req, res) => {
    try {
        let messages;
        if (useMongoDb) {
            messages = await ContactMessage.find().sort({ created_at: -1 });
        } else {
            messages = getAllFromFile().reverse();
        }

        res.json({
            success: true,
            count: messages.length,
            messages
        });
    } catch (err) {
        console.error('[Error] Failed to fetch messages:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve messages'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// ========================
// Start Server
// ========================
async function startServer() {
    // Try connecting to MongoDB
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        useMongoDb = true;
        console.log('✅ Connected to MongoDB');
        console.log(`   Database: ${MONGODB_URI}`);
    } catch (err) {
        useMongoDb = false;
        console.log('⚠️  MongoDB not available, using JSON file storage as fallback');
        console.log(`   Fallback file: ${FALLBACK_DB_PATH}`);
        ensureFallbackDir();
    }

    app.listen(PORT, () => {
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log(`  🚀 Contact API Server running on port ${PORT}`);
        console.log(`  📡 API Endpoint: http://localhost:${PORT}/api/contact`);
        console.log(`  💾 Database: ${useMongoDb ? 'MongoDB' : 'JSON File (fallback)'}`);
        console.log(`  📧 Email: ${EMAIL_ENABLED ? 'Enabled' : 'Disabled (set EMAIL_USER & EMAIL_PASS)'}`);
        console.log('═══════════════════════════════════════════');
        console.log('');
    });
}

startServer();
