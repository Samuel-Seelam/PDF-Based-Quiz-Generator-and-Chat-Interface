const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const OPENAI_API_KEY = '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'; // Put your OpenAI API key here

// Upload PDF and extract text
app.post('/upload-pdf', upload.single('pdf'), function(req, res) {
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    pdfParse(dataBuffer).then(function(pdfData) {
      fs.unlinkSync(req.file.path);
      res.json({ text: pdfData.text });
    }).catch(function(err) {
      res.status(500).json({ error: 'Failed to parse PDF' });
    });
  } catch(e) {
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

// Generate quiz from text using OpenAI API through REST call
app.post('/generate-quiz', function(req, res) {
  var text = req.body.text;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  var prompt = "Generate three questions from the following text with answers and explanations in JSON format:\n" +
    text +
    "\nFormat output as array of objects [ {question, type, choices, answer, explanation} ]";

  axios({
    method: 'post',
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      'Authorization': 'Bearer ' + OPENAI_API_KEY,
      'Content-Type': 'application/json'
    },
    data: {
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant that creates quiz questions." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }
  }).then(function(response) {
    try {
      var quiz = JSON.parse(response.data.choices[0].message.content);
      res.json(quiz);
    } catch(e) {
      res.status(500).json({ error: 'Failed to parse quiz output' });
    }
  }).catch(function(error) {
    res.status(500).json({ error: 'OpenAI API request failed', details: error.message });
  });
});

app.listen(3000, function() {
  console.log('Server running on http://localhost:3000');
});
