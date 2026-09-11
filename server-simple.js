const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3001;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const CHROMA_URL = 'http://localhost:8000';

app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static('public'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chatbot RAG running' });
});

// Query Chroma for similar docs
async function queryChroma(query, topK = 3) {
  try {
    // Get embedding for the query
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

    // Query Chroma
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
    console.error('Chroma query error:', err.message);
    return [];
  }
}

// Chat endpoint with RAG
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, useRAG } = req.body;
    
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const userQuestion = messages[messages.length - 1].content;
    
    // Retrieve docs from Chroma if RAG enabled
    let contextDocs = [];
    if (useRAG) {
      contextDocs = await queryChroma(userQuestion, 3);
    }

    // Build augmented prompt
    let systemPrompt = `Tu es un assistant support SNCF pour les Postes Virtuels (PPV).
Tu aides les utilisateurs avec:
- Diagnostic de problèmes VM
- Informations de tarification
- Processus de création de tickets
- Questions fréquentes

Sois concis, technique, et professionnel.`;

    if (contextDocs.length > 0) {
      systemPrompt += `\n\nInformations pertinentes de la base de connaissances:\n`;
      contextDocs.forEach((doc, idx) => {
        systemPrompt += `\n[Document ${idx + 1}] ${doc.metadata?.doc_title || 'Knowledge Base'}\n${doc.content}`;
      });
      systemPrompt += `\n\nRéponds en te basant sur ces informations, et cite les numéros de document [Ref 1], [Ref 2], etc.`;
    }

    // Call OpenAI
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
      console.error('OpenAI error:', error);
      return res.status(500).json({ error: 'OpenAI API error' });
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    res.json({
      response: assistantResponse,
      ragDocuments: contextDocs.length > 0 ? contextDocs : null,
    });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Diagnostic endpoint
app.post('/api/diagnostic', async (req, res) => {
  try {
    const { description } = req.body;
    
    const diagnosticPrompt = `Voici une description d'un problème PPV:\n${description}\n\nFais un diagnostic technique et propose 3 solutions possibles.`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Tu es un expert diagnostic SNCF PPV.' },
          { role: 'user', content: diagnosticPrompt },
        ],
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    res.json({ diagnostic: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 RAG enabled: Chroma at ${CHROMA_URL}`);
  console.log(`🔑 OpenAI API: Connected\n`);
});
