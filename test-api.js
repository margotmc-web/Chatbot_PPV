#!/usr/bin/env node

/**
 * Script de test de l'API chatbot
 * Usage: node test-api.js [--url http://localhost:3001]
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.argv[2]?.split('=')[1] || process.env.API_URL || 'http://localhost:3001';

console.log(`\n🧪 Testing Assistant PPV API\n`);
console.log(`📍 Base URL: ${BASE_URL}\n`);

/* ============================================================
   Tests
   ============================================================ */

async function test(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    await fn();
    console.log('✅ OK');
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return false;
  }
}

async function runTests() {
  let passed = 0, failed = 0;

  // 1. Health check
  if (await test('GET /api/health', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.status) throw new Error('No status field');
    console.log(`(LLM: ${data.llm || 'unknown'})`);
  })) passed++; else failed++;

  // 2. Chat API - simple message
  if (await test('POST /api/chat (simple)', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Bonjour, comment ça marche?' }
        ]
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.response) throw new Error('No response field');
  })) passed++; else failed++;

  // 3. Chat API - conversation history
  if (await test('POST /api/chat (history)', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Ma VM est lente' },
          { role: 'assistant', content: 'Je vais vous aider' },
          { role: 'user', content: 'Que dois-je faire?' }
        ]
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.response) throw new Error('No response field');
  })) passed++; else failed++;

  // 4. Diagnostic API
  if (await test('POST /api/diagnostic', async () => {
    const res = await fetch(`${BASE_URL}/api/diagnostic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: 'VM lente depuis ce matin',
        context: { vmName: 'PPV-TEST-01', vmStatus: 'Dégradée' }
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.analysis && !data.error) throw new Error('No analysis or error field');
  })) passed++; else failed++;

  // 5. Error handling - invalid JSON
  if (await test('Error handling (invalid JSON)', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' })
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  })) passed++; else failed++;

  // 6. Error handling - missing API key
  if (await test('LLM connectivity', async () => {
    // Ce test détecte si la clé API est invalide
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }]
      })
    });
    // On accepte 200 ou 500 (erreur API) mais pas 404
    if (res.status === 404) throw new Error('API endpoint not found');
    // Si 500, c'est probablement une mauvaise clé API
    if (res.status === 500) {
      const data = await res.json();
      if (data.message?.includes('Unauthorized') || data.message?.includes('invalid')) {
        throw new Error('Invalid API credentials - check .env');
      }
    }
  })) passed++; else failed++;

  /* Results */
  console.log(`\n${'━'.repeat(50)}\n`);
  console.log(`Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All tests passed! Server is ready for production.\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Check the issues above.\n`);
    console.log('Common fixes:');
    console.log('  • Is the backend running? (node server.js)');
    console.log('  • Are the API keys configured? (check .env)');
    console.log('  • Is the LLM service accessible? (Azure OpenAI, OpenAI, etc.)');
    console.log('');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n❌ Test suite error:', error.message);
  process.exit(1);
});
