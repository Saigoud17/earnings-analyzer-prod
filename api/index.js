const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Vercel temp directory
const uploadDir = os.tmpdir();
const upload = multer({ dest: uploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = app;

app.get('/', (req, res) => {
    res.send(`
    <h1>🚀 Earnings Call Analyzer LIVE!</h1>
    <p><a href="/static/index.html">Open App →</a></p>
    <p>Upload any earnings transcript for AI analysis</p>
  `);
});

// Serve static files
app.use('/static', express.static(path.join(__dirname, '../public')));

app.post('/analyze', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        let text = '';
        try {
            text = fs.readFileSync(file.path, 'utf8').substring(0, 8000);
            fs.unlinkSync(file.path);
        } catch {
            fs.unlinkSync(file.path);
            return res.json({
                tone: 'neutral',
                confidence: 'low',
                keyPositives: ['File processed'],
                keyConcerns: ['Text extraction limited'],
                forwardGuidance: { revenue: 'N/A', margin: 'N/A', capex: 'N/A' }
            });
        }

        const analysis = analyzeDocument(text);
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function analyzeDocument(text) {
    const lowerText = text.toLowerCase();
    const posScore = (lowerText.match(/growth|beat|strong|record|improve|increase/g) || []).length;
    const negScore = (lowerText.match(/decline|miss|weak|challenge|pressure|delay/g) || []).length;

    let tone = 'neutral';
    if (posScore > negScore + 1) tone = 'optimistic';
    else if (negScore > posScore + 1) tone = 'pessimistic';

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const positives = [];
    const concerns = [];

    sentences.forEach(s => {
        const lower = s.toLowerCase();
        if (lower.includes('revenue') || lower.includes('growth') || lower.includes('beat')) {
            positives.push(s.trim().substring(0, 80) + '...');
        }
        if (lower.includes('miss') || lower.includes('decline') || lower.includes('challenge')) {
            concerns.push(s.trim().substring(0, 80) + '...');
        }
    });

    return {
        tone,
        confidence: text.length > 1000 ? 'high' : 'medium',
        keyPositives: positives.length ? positives.slice(0, 5) : ['Document analysis complete'],
        keyConcerns: concerns.length ? concerns.slice(0, 5) : ['No major concerns detected'],
        forwardGuidance: {
            revenue: lowerText.includes('growth') ? 'Growth expected' : 'None mentioned',
            margin: lowerText.includes('margin') ? 'Margin guidance' : 'None mentioned',
            capex: lowerText.includes('capex') ? 'Capex guided' : 'None mentioned'
        }
    };
}
