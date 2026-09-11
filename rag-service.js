/**
 * RAG Service — Retrieval-Augmented Generation
 * 
 * Gère:
 * 1. Vectorisation des documents du SharePoint
 * 2. Stockage des vecteurs (Chroma pour local, Pinecone pour prod)
 * 3. Récupération des documents pertinents
 * 4. Augmentation du contexte LLM
 */

import { Chroma } from 'langchain/vectorstores/chroma';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitters';
import { Document } from 'langchain/document';
import fs from 'fs';
import path from 'path';

/* ============================================================
   Configuration
   ============================================================ */
const CHROMA_PATH = process.env.CHROMA_PATH || './chroma_db';
const EMBEDDING_MODEL = 'text-embedding-3-small'; // Pas cher et rapide
const CHUNK_SIZE = 1000; // Tokens par chunk
const CHUNK_OVERLAP = 200; // Chevauchement
const TOP_K = 3; // Docs à récupérer par query

/* ============================================================
   Initialisation du vectorstore
   ============================================================ */
let vectorStore = null;
let embeddings = null;

async function initializeVectorStore() {
  if (vectorStore) return vectorStore;

  try {
    embeddings = new OpenAIEmbeddings({
      modelName: EMBEDDING_MODEL,
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    // Essayer de charger depuis Chroma local
    vectorStore = await Chroma.fromExistingCollection(embeddings, {
      collectionName: 'ppv_documents',
      url: process.env.CHROMA_URL || 'http://localhost:8000'
    });

    console.log('✅ VectorStore chargé depuis Chroma');
    return vectorStore;
  } catch (error) {
    console.log('⚠️ Chroma non trouvé, mode offline');
    // Fallback: créer une collection vide
    // Elle sera remplie par vectorize-docs.js
    return null;
  }
}

/* ============================================================
   Retrieval — Chercher les docs pertinents
   ============================================================ */
export async function retrieveContext(query, k = TOP_K) {
  const vs = await initializeVectorStore();
  
  if (!vs) {
    console.warn('VectorStore non initialisé, retournant contexte vide');
    return [];
  }

  try {
    const results = await vs.similaritySearchWithScore(query, k);
    
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      source: doc.metadata?.source || 'Unknown',
      score: score,
      type: doc.metadata?.type || 'general'
    }));
  } catch (error) {
    console.error('Erreur retrieval:', error.message);
    return [];
  }
}

/* ============================================================
   Formatage du contexte pour le LLM
   ============================================================ */
export function formatContextForLLM(docs) {
  if (!docs || docs.length === 0) {
    return '';
  }

  const formatted = docs
    .map((doc, idx) => {
      return `[Ref ${idx + 1} - ${doc.type || 'doc'}]\n${doc.content}\n(Source: ${doc.source}, Score: ${(doc.score * 100).toFixed(0)}%)\n`;
    })
    .join('\n---\n\n');

  return formatted;
}

/* ============================================================
   Augmentation du prompt LLM
   ============================================================ */
export function buildAugmentedPrompt(userQuery, retrievedDocs, systemPrompt) {
  const context = formatContextForLLM(retrievedDocs);

  if (!context) {
    return `${systemPrompt}\n\nNote: Pas de contexte RAG trouvé.\n\nQuestion: ${userQuery}`;
  }

  return `${systemPrompt}

=== CONTEXTE PERTINENT (récupéré de la base de documents) ===
${context}
=== FIN CONTEXTE ===

Question de l'utilisateur: ${userQuery}

Réponds en te basant sur le contexte fourni ci-dessus. Si le contexte ne suffit pas, dis-le clairement.`;
}

/* ============================================================
   Récupération avec filtrage (optionnel)
   ============================================================ */
export async function retrieveContextFiltered(query, filters = {}) {
  const vs = await initializeVectorStore();
  
  if (!vs) return [];

  try {
    // Filter par type de doc (optional)
    // Ex: { type: 'pricing' } pour récupérer que les docs tarifaires
    let results = await vs.similaritySearchWithScore(query, TOP_K * 2); // Cherche plus, on va filtrer

    if (filters.type) {
      results = results.filter(([doc]) => doc.metadata?.type === filters.type);
    }

    if (filters.source) {
      results = results.filter(([doc]) => doc.metadata?.source?.includes(filters.source));
    }

    return results.slice(0, TOP_K).map(([doc, score]) => ({
      content: doc.pageContent,
      source: doc.metadata?.source || 'Unknown',
      score: score,
      type: doc.metadata?.type || 'general'
    }));
  } catch (error) {
    console.error('Erreur filtered retrieval:', error.message);
    return [];
  }
}

/* ============================================================
   Stats et monitoring
   ============================================================ */
export async function getRAGStats() {
  const vs = await initializeVectorStore();
  
  if (!vs) {
    return {
      status: 'offline',
      vectorStoreReady: false,
      documentsIndexed: 0
    };
  }

  try {
    // Tenter une requête de test
    const testResults = await vs.similaritySearchWithScore('test', 1);
    
    return {
      status: 'online',
      vectorStoreReady: true,
      documentsIndexed: testResults.length > 0 ? 'indexed' : 'empty',
      embedding_model: EMBEDDING_MODEL,
      chunk_size: CHUNK_SIZE,
      top_k: TOP_K
    };
  } catch (error) {
    return {
      status: 'error',
      vectorStoreReady: false,
      error: error.message
    };
  }
}

/* ============================================================
   Vectorstore Health Check
   ============================================================ */
export async function checkRAGHealth() {
  const stats = await getRAGStats();
  
  if (stats.status === 'online') {
    console.log('🟢 RAG Service: READY');
    return true;
  } else if (stats.status === 'offline') {
    console.log('🟡 RAG Service: OFFLINE (run vectorize-docs.js first)');
    return false;
  } else {
    console.log('🔴 RAG Service: ERROR', stats.error);
    return false;
  }
}

export default {
  retrieveContext,
  retrieveContextFiltered,
  formatContextForLLM,
  buildAugmentedPrompt,
  getRAGStats,
  checkRAGHealth,
  initializeVectorStore
};
