require('dotenv').config();
const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const routes   = require('./routes/index');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS config ───────────────────────────────────────────
const corsOptions = {
  origin: [
    'https://tester-rioinvestment.vercel.app',
    'http://localhost:5173',
    process.env.APP_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ── Security ──────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ✅ Handle preflight FIRST before rate limiter or any other middleware
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ── Rate limiting ─────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  message: { success: false, message: 'Too many requests. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
}));

app.use('/api/auth/login',    rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
app.use('/api/auth/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

// ── Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static uploads ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    app: 'InvestNaija API (Mongoose)',
  });
});

// ── Routes ────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` }));

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Boot ──────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 InvestNaija API  →  http://localhost:${PORT}`);
    console.log(`   Health check    →  http://localhost:${PORT}/health`);
    console.log(`   DB driver       →  Mongoose + MongoDB Atlas\n`);
  });
});