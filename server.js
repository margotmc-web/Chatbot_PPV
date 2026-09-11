import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';

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
// Option 1: Azure OpenAI
const USE_AZURE = process.env.AZURE_OPENAI_KEY && process.env.AZURE_OPENAI_ENDPOINT;

let azureClient = null;
if (USE_AZURE) {
  azureClient = new OpenAIClient(
    process.env.AZURE_OPENAI_ENDPOINT,
    new AzureKeyCredential(process.env.AZURE_OPENAI_KEY)
  );
}

// Option 2: OpenAI direct (fallback)
import OpenAI from 'openai';
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ============================================================
   System Prompt pour PPV Assistant
   ============================================================ */
const SYSTEM_PROMPT = `Tu es l'Assistant PPV, un chatbot IA spécialisé dans le support N1 des Postes Virtuels (PPV) SNCF.

Contexte utilisateur:
- Cet assistant aide les utilisateurs SNCF à diagnostiquer les problèmes de leurs machines virtuelles.
- Les utilisateurs ont accès à des outils : diagnostic guidé, création de tickets ServiceNow, suivi d'incidents, FAQ.

Ton rôle:
1. Identifier les problèmes de l'utilisateur avec empathie (connexion, performance, erreurs).
2. Proposer un diagnostic guidé si pertinent.
3. Aider à la création de tickets ServiceNow pour escalade au support.
4. Répondre aux questions sur la tarification, les types de VM (Standard vs Clone), etc.
5. Être pragmatique et français.

Sois concis, estruturé, et guide l'utilisateur vers une résolution.

Ne pas:
- Inventer des procédures techniques inexistantes.
- Promettre des délais fixes pour des réparations.
- Quitter le contexte PPV/IT support.
`;

/* ============================================================
   API: POST /api/chat
   ============================================================ */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid "messages" field' });
    }

    let response;

    if (USE_AZURE && azureClient) {
      // Azure OpenAI
      const azureMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const completion = await azureClient.getChatCompletions(
        process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
        azureMessages,
        {
          systemPrompt: SYSTEM_PROMPT,
          maxTokens: 1000,
          temperature: 0.7,
        }
      );

      response = completion.choices[0]?.message?.content || 'Erreur de réponse';
    } else {
      // OpenAI direct (ou Claude via OpenAI-compatible)
      const completion = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      response = completion.choices[0]?.message?.content || 'Erreur de réponse';
    }

    res.json({ response });
  } catch (error) {
    console.error('Chat API error:', error.message);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: error.message 
    });
  }
});

/* ============================================================
   API: POST /api/diagnostic (intent-guided)
   ============================================================ */
app.post('/api/diagnostic', async (req, res) => {
  try {
    const { userInput, context } = req.body;

    const diagnosticPrompt = `
Tu es un diagnostic assistant pour PPV.
Contexte: ${JSON.stringify(context || {})}

L'utilisateur dit: "${userInput}"

Génère une réponse structurée avec:
1. Analyse du problème (1 phrase)
2. Actions recommandées (liste max 3)
3. Si urgent: marquer [ESCALADE] pour ticket ServiceNow immédiat

Réponds en JSON:
{
  "analysis": "...",
  "actions": ["action1", "action2"],
  "escalate": false
}
`;

    const completion = await (USE_AZURE ? azureClient : openaiClient).chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT || process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'system', content: 'Tu es un assistant diagnostic pour VMs. Réponds UNIQUEMENT en JSON valide.' },
        { role: 'user', content: diagnosticPrompt }
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    const text = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Parsing failed' };

    res.json(data);
  } catch (error) {
    console.error('Diagnostic API error:', error.message);
    res.status(500).json({ error: 'Erreur diagnostic' });
  }
});

/* ============================================================
   Health check
   ============================================================ */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    llm: USE_AZURE ? 'Azure OpenAI' : 'OpenAI',
    timestamp: new Date().toISOString()
  });
});

/* ============================================================
   Start server
   ============================================================ */
app.listen(PORT, () => {
  console.log(`\n🚀 Assistant PPV server running on port ${PORT}`);
  console.log(`📡 LLM: ${USE_AZURE ? 'Azure OpenAI' : 'OpenAI'}`);
  console.log(`💬 POST http://localhost:${PORT}/api/chat`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health\n`);
});
