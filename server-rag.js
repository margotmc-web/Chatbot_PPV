import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import {
  retrieveContext,
  retrieveContextFiltered,
  formatContextForLLM,
  buildAugmentedPrompt,
  getRAGStats,
  checkRAGHealth
} from './rag-service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

/* ============================================================
   Config LLM
   ============================================================ */
const USE_AZURE = process.env.AZURE_OPENAI_KEY && process.env.AZURE_OPENAI_ENDPOINT;

let azureClient = null;
if (USE_AZURE) {
  azureClient = new OpenAIClient(
    process.env.AZURE_OPENAI_ENDPOINT,
    new AzureKeyCredential(process.env.AZURE_OPENAI_KEY)
  );
}

import OpenAI from 'openai';
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ============================================================
   System Prompt pour PPV Assistant
   ============================================================ */
const SYSTEM_PROMPT = `Tu es l'Assistant PPV, un chatbot IA spécialisé dans le support N1 des Postes Virtuels (PPV) SNCF.

Contexte utilisateur:
- Cet assistant aide les utilisateurs SNCF à diagnostiquer les problèmes de leurs machines virtuelles.
- Tu as accès à une base de connaissances vectorisée (RAG) avec les docs SharePoint pertinentes.
- Les utilisateurs ont accès à des outils : diagnostic guidé, création de tickets ServiceNow, suivi d'incidents, FAQ.

Ton rôle:
1. Identifier les problèmes de l'utilisateur avec empathie (connexion, performance, erreurs).
2. Proposer un diagnostic guidé si pertinent.
3. Aider à la création de tickets ServiceNow pour escalade au support.
4. Répondre aux questions sur la tarification, les types de VM (Standard vs Clone), etc.
5. Être pragmatique et français.

Important:
- Utilise le CONTEXTE FOURNI ci-dessous pour tes réponses.
- Si le contexte ne couvre pas la question, dis-le clairement.
- Ne fais JAMAIS d'hallucinations ou d'inventions de données.
- Les références [Ref X] pointent vers la base de connaissances.

Sois concis, structuré, et guide l'utilisateur vers une résolution.
`;

/* ============================================================
   API: POST /api/chat (avec RAG)
   ============================================================ */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, useRAG = true } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid "messages" field' });
    }

    // 1. RETRIEVAL — Chercher les docs pertinents dans le RAG
    let ragContext = [];
    let augmentedPrompt = SYSTEM_PROMPT;

    if (useRAG) {
      const userMessage = messages[messages.length - 1]?.content || '';
      
      try {
        ragContext = await retrieveContext(userMessage, 3); // Top-3 docs
        augmentedPrompt = buildAugmentedPrompt(userMessage, ragContext, SYSTEM_PROMPT);
      } catch (ragError) {
        console.warn('⚠️ RAG indisponible, continuant sans:', ragError.message);
        // Fallback: continuer sans RAG
      }
    }

    // 2. AUGMENTATION — Construire le prompt avec le contexte
    const augmentedMessages = [
      { role: 'system', content: augmentedPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    // 3. GENERATION — Appeler le LLM
    let response;

    if (USE_AZURE && azureClient) {
      const completion = await azureClient.getChatCompletions(
        process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
        augmentedMessages,
        {
          maxTokens: 1000,
          temperature: 0.7,
        }
      );
      response = completion.choices[0]?.message?.content || 'Erreur de réponse';
    } else {
      const completion = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: augmentedMessages,
        max_tokens: 1000,
        temperature: 0.7,
      });
      response = completion.choices[0]?.message?.content || 'Erreur de réponse';
    }

    // 4. Retourner la réponse avec métadata RAG
    res.json({
      response,
      ragContext: ragContext.map(doc => ({
        source: doc.source,
        type: doc.type,
        score: doc.score
      }))
    });

  } catch (error) {
    console.error('Chat API error:', error.message);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
});

/* ============================================================
   API: POST /api/diagnostic (avec RAG filtré)
   ============================================================ */
app.post('/api/diagnostic', async (req, res) => {
  try {
    const { userInput, context = {} } = req.body;

    // Récupérer les docs diagnostic pertinents uniquement
    const diagDocs = await retrieveContextFiltered(userInput, {
      type: 'diagnostic'
    });

    const diagContext = formatContextForLLM(diagDocs);

    const diagnosticPrompt = `
Tu es un diagnostic assistant pour PPV.

CONTEXTE DE L'UTILISATEUR:
- VM: ${context.vmName || 'inconnue'}
- État: ${context.vmStatus || 'inconnue'}

CONTEXTE TECHNIQUE (de la base de connaissances):
${diagContext || '(aucun)'}

ANALYSE À FAIRE:
Utilisateur dit: "${userInput}"

Génère une réponse structurée EN JSON VALIDE UNIQUEMENT:
{
  "analysis": "Analyse du problème en 1-2 phrases",
  "actions": ["Action 1 à essayer", "Action 2 si action 1 échoue"],
  "escalate": false ou true si besoin d'un ticket
}
`;

    const completion = await (USE_AZURE ? azureClient : openaiClient).chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT || process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'Tu es un assistant diagnostic pour VMs. Réponds UNIQUEMENT en JSON valide, rien d\'autre.' 
        },
        { role: 'user', content: diagnosticPrompt }
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    const text = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Parsing failed' };

    res.json({
      ...data,
      ragDocsUsed: diagDocs.length
    });
  } catch (error) {
    console.error('Diagnostic API error:', error.message);
    res.status(500).json({ error: 'Erreur diagnostic' });
  }
});

/* ============================================================
   API: GET /api/rag/health — Santé du RAG
   ============================================================ */
app.get('/api/rag/health', async (req, res) => {
  try {
    const ragHealth = await checkRAGHealth();
    const ragStats = await getRAGStats();

    res.json({
      rag_status: ragHealth ? 'ready' : 'offline',
      ...ragStats
    });
  } catch (error) {
    res.json({
      rag_status: 'error',
      error: error.message
    });
  }
});

/* ============================================================
   API: GET /api/rag/search — Recherche manuelle dans le RAG
   ============================================================ */
app.get('/api/rag/search', async (req, res) => {
  try {
    const query = req.query.q;
    const k = parseInt(req.query.k) || 3;
    const type = req.query.type;

    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter "q"' });
    }

    let docs;
    if (type) {
      docs = await retrieveContextFiltered(query, { type });
    } else {
      docs = await retrieveContext(query, k);
    }

    res.json({
      query,
      results: docs,
      count: docs.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ============================================================
   API: Health check général
   ============================================================ */
app.get('/api/health', async (req, res) => {
  const ragStats = await getRAGStats();

  res.json({
    status: 'ok',
    llm: USE_AZURE ? 'Azure OpenAI' : 'OpenAI',
    rag_enabled: true,
    rag: ragStats,
    timestamp: new Date().toISOString()
  });
});

/* ============================================================
   Startup
   ============================================================ */
async function startup() {
  // Vérifier la santé du RAG au démarrage
  console.log('\n🚀 Assistant PPV (RAG Edition) Startup\n');

  console.log('📡 LLM:', USE_AZURE ? 'Azure OpenAI' : 'OpenAI');
  console.log('🧠 RAG: Initialisation...');

  const ragReady = await checkRAGHealth();

  if (ragReady) {
    console.log('✅ RAG prêt');
  } else {
    console.log('⚠️  RAG non prêt (run vectorize-docs.js)');
    console.log('   Continuant en mode dégradé (sans contexte)');
  }

  app.listen(PORT, () => {
    console.log(`\n✅ Serveur lancé sur port ${PORT}`);
    console.log(`   POST http://localhost:${PORT}/api/chat`);
    console.log(`   GET  http://localhost:${PORT}/api/rag/health`);
    console.log(`   GET  http://localhost:${PORT}/api/rag/search?q=...`);
    console.log('\n');
  });
}

startup();
