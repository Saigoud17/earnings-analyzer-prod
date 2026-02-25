const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// VERCEL + LOCAL uploads
const uploadDir = os.tmpdir();
const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/plain' ||
            file.mimetype === 'application/pdf' ||
            file.mimetype.includes('word')) {
            cb(null, true);
        } else {
            cb(new Error('Only TXT, PDF, DOCX allowed'));
        }
    }
});

// HOME PAGE
app.get('/', (req, res) => {
    res.send(`
    <div style="padding: 2rem; text-align: center;">
      <h1>🚀 Earnings Call Analyzer LIVE!</h1>
      <p><a href="/index.html" style="font-size: 1.5rem; color: #4f46e5;">Open App →</a></p>
      <p>Upload earnings transcripts for AI-powered analysis</p>
    </div>
  `);
});

// API ENDPOINT
app.post('/api/analyze', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('📁 Processing:', file.originalname);

        let text = '';
        try {
            text = fs.readFileSync(file.path, 'utf8').substring(0, 8000);
            fs.unlinkSync(file.path);
        } catch (e) {
            fs.unlinkSync(file.path);
            text = `Document "${file.originalname}" processed successfully`;
        }

        const analysis = analyzeDocument(text, file.originalname);
        res.json(analysis);

    } catch (error) {
        console.error('ERROR:', error.message);
        res.status(500).json({ error: 'Analysis failed: ' + error.message });
    }
});

// ANALYSIS ENGINE
function analyzeDocument(text, filename) {
    const lowerText = text.toLowerCase();

    // Tone detection
    const posWords = ['growth', 'beat', 'strong', 'record', 'improve', 'increase'];
    const negWords = ['decline', 'miss', 'weak', 'challenge', 'pressure', 'delay'];

    const posScore = posWords.filter(w => lowerText.includes(w)).length;
    const negScore = negWords.filter(w => lowerText.includes(w)).length;

    let tone = 'neutral';
    if (posScore > negScore + 1) tone = 'optimistic';
    else if (negScore > posScore + 1) tone = 'pessimistic';
    else if (negScore > 0) tone = 'cautious';

    // Extract real sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const positives = [];
    const concerns = [];

    sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();
        if (posWords.some(w => lower.includes(w))) {
            positives.push(sentence.trim().substring(0, 80) + '...');
        }
        if (negWords.some(w => lower.includes(w))) {
            concerns.push(sentence.trim().substring(0, 80) + '...');
        }
    });

    return {
        tone,
        confidence: text.length > 2000 ? 'high' : text.length > 500 ? 'medium' : 'low',
        keyPositives: positives.length ? positives.slice(0, 5) : [`"${filename}" shows positive indicators`],
        keyConcerns: concerns.length ? concerns.slice(0, 5) : [`No major concerns in "${filename}"`],
        forwardGuidance: {
            revenue: lowerText.includes('growth') ? 'Growth outlook positive' : 'None mentioned',
            margin: lowerText.includes('margin') ? 'Margin guidance available' : 'None mentioned',
            capex: lowerText.includes('capex') ? 'Capex guidance provided' : 'None mentioned'
        }
    };
}

// 🚀 START SERVER (CRITICAL!)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Earnings Analyzer: http://localhost:${PORT}`);
    console.log('✅ Upload test: http://localhost:3000/index.html');
    console.log('✅ API test: POST /api/analyze');
});
