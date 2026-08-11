require('dotenv').config();
const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Analyze food image with GPT-4o
app.post('/api/analyze-food', upload.single('image'), async (req, res) => {
  try {
    let imageData;
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageData = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
    } else if (req.body.image) {
      // Handle base64 from client
      imageData = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      const match = req.body.image.match(/^data:(image\/\w+);base64,/);
      if (match) mimeType = match[1];
    } else if (req.body.imageBase64) {
      imageData = req.body.imageBase64;
      mimeType = req.body.mimeType || 'image/jpeg';
    } else {
      return res.status(400).json({ error: 'No image provided' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a food nutrition analyst specializing in Indian cuisine. Analyze the food image and return a JSON array of food items detected. For each item provide:
- name: food name (use common Indian names where applicable)
- quantity: estimated quantity with unit (e.g., "2 pieces", "1 bowl", "150g")
- calories: estimated calories (number)
- protein: grams of protein (number)
- carbs: grams of carbs (number)
- fat: grams of fat (number)
- fiber: grams of fiber (number)

Be as accurate as possible with portion sizes visible in the image. Return ONLY valid JSON array, no other text.`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this food image and return nutritional information as JSON array.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    let content = response.choices[0].message.content.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const items = JSON.parse(content);
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
          content: `You are a nutrition and fitness analyst. Analyze the user's calorie and weight tracking data. Provide actionable insights about their progress, patterns, and recommendations. Be encouraging but honest. Use simple language. Structure your response with clear sections. Consider Indian dietary patterns.`
        },
        {
          role: 'user',
          content: `Here's my tracking data:

Profile: ${JSON.stringify(profile)}
TDEE: ${tdee} cal/day
Daily Budget: ${dailyBudget} cal/day
Target: Lose ${profile.targetLossPerWeek} kg/week

Weight History (last entries): ${JSON.stringify(weightData.slice(-30))}

Recent Meals: ${JSON.stringify(mealData.slice(-21))}

Please analyze:
1. Am I on track for my weight loss goal?
2. Any patterns in my eating (overeating days, good days)?
3. Nutritional balance assessment
4. Specific recommendations for improvement
5. Predicted timeline to reach goal weight if I continue this way`
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
