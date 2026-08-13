require('dotenv').config();
const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load food database once at startup
let foodDB = [];
try {
  foodDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'indian-foods.json'), 'utf8'));
  console.log(`Loaded ${foodDB.length} foods from database`);
} catch (e) {
  console.error('Failed to load food database:', e.message);
}

// Fuzzy match food name against database
function matchFood(name) {
  const q = name.toLowerCase().trim();
  // Exact match first
  let match = foodDB.find(f => f.name.toLowerCase() === q);
  if (match) return match;
  // Contains match
  match = foodDB.find(f => q.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(q));
  if (match) return match;
  // Word overlap scoring
  const qWords = q.split(/[\s,\-\/()]+/).filter(w => w.length > 2);
  let best = null, bestScore = 0;
  for (const food of foodDB) {
    const fWords = food.name.toLowerCase().split(/[\s,\-\/()]+/).filter(w => w.length > 2);
    let score = 0;
    for (const qw of qWords) {
      for (const fw of fWords) {
        if (qw === fw) score += 3;
        else if (fw.includes(qw) || qw.includes(fw)) score += 1;
      }
    }
    if (score > bestScore) { bestScore = score; best = food; }
  }
  return bestScore >= 2 ? best : null;
}

// Build food name list for GPT context (so it uses exact DB names)
const foodNameList = foodDB.map(f => f.name).join(', ');

// Analyze food image with GPT-4o
app.post('/api/analyze-food', upload.single('image'), async (req, res) => {
  try {
    let imageData;
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageData = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
    } else if (req.body.image) {
      imageData = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      const match = req.body.image.match(/^data:(image\/\w+);base64,/);
      if (match) mimeType = match[1];
    } else if (req.body.imageBase64) {
      imageData = req.body.imageBase64;
      mimeType = req.body.mimeType || 'image/jpeg';
    } else {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Step 1: GPT identifies food names + quantities only
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a food identification expert. Your ONLY job is to identify what food items are in the image and estimate the quantity/portions visible.

You MUST try to match food names from this database: ${foodNameList}

Return a JSON array where each item has:
- name: the food name (use the EXACT name from the database above if possible, otherwise use a common Indian/English name)
- quantity: number of servings visible (e.g. 2 for 2 slices of pizza, 1 for 1 bowl of dal)
- servingDesc: brief description of what you see (e.g. "2 slices", "1 bowl", "1 plate")

Do NOT estimate calories or macros — just identify the food and count portions.
Return ONLY valid JSON array, no other text.`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What food items are in this image? Identify each item and count the portions.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    });

    let content = response.choices[0].message.content.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const detected = JSON.parse(content);

    // Step 2: Match each detected item against the food database
    const items = detected.map(d => {
      const dbMatch = matchFood(d.name);
      const qty = parseFloat(d.quantity) || 1;
      if (dbMatch) {
        return {
          name: dbMatch.name,
          quantity: d.servingDesc || dbMatch.serving,
          calories: Math.round(dbMatch.calories * qty),
          protein: Math.round(dbMatch.protein * qty * 10) / 10,
          carbs: Math.round(dbMatch.carbs * qty * 10) / 10,
          fat: Math.round(dbMatch.fat * qty * 10) / 10,
          fiber: Math.round(dbMatch.fiber * qty * 10) / 10,
          dbMatch: true
        };
      } else {
        // No DB match — fall back to a second GPT call for this item
        return {
          name: d.name,
          quantity: d.servingDesc || '1 serving',
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          dbMatch: false,
          needsEstimate: true
        };
      }
    });

    // Step 3: For items not in DB, do a quick GPT estimate
    const unmatched = items.filter(i => i.needsEstimate);
    if (unmatched.length > 0) {
      const estResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Estimate calories and macros for these food items. Return a JSON array with: name, calories (number), protein (number), carbs (number), fat (number), fiber (number). Return ONLY valid JSON array.' },
          { role: 'user', content: `Estimate nutrition for: ${unmatched.map(u => `${u.quantity} of ${u.name}`).join(', ')}` }
        ],
        max_tokens: 500,
        temperature: 0.2
      });
      let estContent = estResponse.choices[0].message.content.trim();
      estContent = estContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        const estimates = JSON.parse(estContent);
        unmatched.forEach((item, i) => {
          const est = estimates[i] || estimates.find(e => e.name.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]));
          if (est) {
            item.calories = est.calories || 0;
            item.protein = est.protein || 0;
            item.carbs = est.carbs || 0;
            item.fat = est.fat || 0;
            item.fiber = est.fiber || 0;
          }
        });
      } catch (e) { console.error('Estimate parse error:', e.message); }
    }

    // Clean up internal flags
    items.forEach(i => { delete i.needsEstimate; });

    res.json({ items });
  } catch (err) {
    console.error('Food analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze food image. ' + err.message });
  }
});

// AI Analysis of user's progress data
app.post('/api/ai-analysis', async (req, res) => {
  try {
    const { weightData, mealData, profile, tdee, dailyBudget } = req.body;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a concise nutrition coach. Give a SHORT, actionable analysis. Use markdown formatting: ## for sections, **bold** for key numbers, bullet points for lists. Keep it punchy — no filler. Consider Indian dietary patterns. Max 5-6 short sections. End with 2-3 specific meal swap suggestions.`
        },
        {
          role: 'user',
          content: `My tracking data:

Profile: ${JSON.stringify(profile)}
TDEE: ${tdee} cal/day | Budget: ${dailyBudget} cal/day | Target: Lose ${profile.targetLossPerWeek} kg/week

Weight (recent): ${JSON.stringify(weightData.slice(-14))}

Meals (recent): ${JSON.stringify(mealData.slice(-21))}

Give me a brief report with these sections:
## Progress Verdict
One-line verdict: am I on track? Include current vs target weight.

## This Week's Pattern
2-3 bullet points on eating patterns. Which days were good, which were over budget?

## Nutrition Check
How's my protein/carbs/fat balance? Am I eating enough protein? Be specific with numbers.

## What To Change
2-3 concrete, specific changes. Not generic advice — reference MY actual meals.

## Meal Swaps
Suggest 2-3 specific Indian meal swaps to cut calories while keeping me full. Reference foods I actually eat and suggest better alternatives.

## Goal Timeline
One line — at this rate, when will I hit my target? Be honest.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    res.json({ analysis: response.choices[0].message.content });
  } catch (err) {
    console.error('AI analysis error:', err.message);
    res.status(500).json({ error: 'Failed to get AI analysis. ' + err.message });
  }
});

// Serve the app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🍽️  Calorie Tracker running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   Network: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log(`\n   Open the Network URL on your phone to use the app!`);
});
