const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3001;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const CHROMA_URL = 'http://localhost:8000';

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chatbot RAG running' });
});

// Query Chroma
async function queryChroma(query, topK = 3) {
  try {
    const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-3-small',
      }),
    });

    if (!embeddingRes.ok) throw new Error('Failed to get embedding');
    
    const embeddingData = await embeddingRes.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const chromaRes = await fetch(`${CHROMA_URL}/api/v1/collections/ppv/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_embeddings: [queryEmbedding],
        n_results: topK,
      }),
    });

    if (!chromaRes.ok) throw new Error('Chroma query failed');
    
    const results = await chromaRes.json();
    
    if (!results.documents || !results.documents[0]) return [];
    
    return results.documents[0].map((doc, idx) => ({
      content: doc,
      distance: results.distances[0][idx],
      metadata: results.metadatas[0][idx],
    }));
  } catch (err) {
    console.error('Chroma error:', err.message);
    return [];
  }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, useRAG } = req.body;
    
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'No messages' });
    }

    const userQuestion = messages[messages.length - 1].content;
    
    let contextDocs = [];
    if (useRAG) {
      contextDocs = await queryChroma(userQuestion, 3);
    }

    let systemPrompt = `Tu es un assistant support SNCF PPV.
Tu aides avec:
- Diagnostic VM
- Tarification
- Tickets ServiceNow
- Questions fréquentes

Sois concis et professionnel.`;

    if (contextDocs.length > 0) {
      systemPrompt += `\n\nDocuments pertinents:\n`;
      contextDocs.forEach((doc, idx) => {
        systemPrompt += `\n[Document ${idx + 1}] ${doc.metadata?.doc_title || 'KB'}\n${doc.content}`;
      });
      systemPrompt += `\n\nCite les numéros [Ref 1], [Ref 2], etc.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(500).json({ error: 'OpenAI error' });
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    res.json({
      response: assistantResponse,
      ragDocuments: contextDocs.length > 0 ? contextDocs : null,
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 RAG enabled: Chroma at ${CHROMA_URL}`);
  console.log(`🔑 OpenAI API: Connected\n`);
});
