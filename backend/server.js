require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const Imap = require("imap");
const { simpleParser } = require("mailparser");

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Set up EJS for Server-Side Rendering
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static frontend with caching disabled for instant updates
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath, {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// Also disable caching for EJS rendered views by adding a global middleware
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// ═══════════════════════════════════════════════════════════════
// EMAIL CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const EMAIL_USER = "contact@urbox.ai";
const EMAIL_PASS = process.env.EMAIL_PASSWORD;
const EMAIL_HOST = "mail.urbox.ai";

// Nodemailer (SMTP - Sending)
const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: 465,
    secure: true, // Use TLS
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

// Helper to fetch IMAP emails
function fetchEmails() {
    return new Promise((resolve, reject) => {
        if (!EMAIL_PASS) return reject(new Error("EMAIL_PASSWORD not set in .env"));

        const imap = new Imap({
            user: EMAIL_USER,
            password: EMAIL_PASS,
            host: EMAIL_HOST,
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false } // Only if needed for self-signed certificates
        });

        imap.once("ready", () => {
            imap.openBox("INBOX", true, (err, box) => {
                if (err) {
                    imap.end();
                    return reject(err);
                }

                // Handle empty inbox
                if (box.messages.total === 0) {
                    imap.end();
                    return resolve([]);
                }

                // Fetch last 50 emails
                const start = Math.max(1, box.messages.total - 49);
                const fetch = imap.seq.fetch(`${start}:*`, {
                    bodies: [""],
                    struct: true,
                });

                const messages = [];
                let parsedCount = 0;
                let fetchComplete = false;

                fetch.on("message", (msg) => {
                    msg.on("body", (stream) => {
                        simpleParser(stream, async (err, parsed) => {
                            if (!err) {
                                messages.push({
                                    id: parsed.messageId,
                                    subject: parsed.subject,
                                    from: parsed.from?.value,
                                    to: parsed.to?.value,
                                    date: parsed.date,
                                    text: parsed.text,
                                    html: parsed.html,
                                });
                            }
                            parsedCount++;
                            checkDone();
                        });
                    });
                });

                fetch.once("error", (err) => {
                    imap.end();
                    reject(err);
                });

                fetch.once("end", () => {
                    fetchComplete = true;
                    checkDone();
                });

                function checkDone() {
                    // Start relative calculation if fetch has completed streaming
                    if (fetchComplete) {
                        // All emitted messages have been processed by simpleParser
                        // We sort them descending by date
                        messages.sort((a, b) => new Date(b.date) - new Date(a.date));
                        imap.end();
                        resolve(messages);
                    }
                }
            });
        });

        imap.once("error", (err) => {
            reject(err);
        });

        imap.connect();
    });
}

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// Get Inbox
app.get("/api/mail", async (req, res) => {
    try {
        const emails = await fetchEmails();
        res.json({ success: true, emails });
    } catch (error) {
        console.error("IMAP Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send Email
app.post("/api/mail/send", async (req, res) => {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    try {
        const info = await transporter.sendMail({
            from: `"urbox.ai Support" <${EMAIL_USER}>`,
            to,
            subject,
            text: body, // plain text body (add HTML support if needed)
            html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        });

        res.json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error("SMTP Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mount Blog Route Component for individual posts SSR
const blogRoutes = require('./routes/blogRoutes');
app.use('/blog', blogRoutes);

// General fallback for SPA routing (excluding API and /blog paths)
// Serve HTML pages using EJS views now instead of static index.html

app.get('/', (req, res) => {
    res.render('pages/index');
});

app.get('/contact', (req, res) => {
    res.render('pages/contact');
});

app.get('/blog', (req, res) => {
    // The main blog index (not an individual post /blog/:slug which is handled by blogRoutes)
    res.render('pages/blog');
});

const blogController = require('./controllers/blogController');
app.get('/sitemap.xml', blogController.getSitemap);

// Admin panel and any other non-migrated paths
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/blog/')) {
        return next();
    }
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Frontend served from: ${frontendPath}`);
});
