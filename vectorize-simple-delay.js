const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const CHROMA_URL = 'http://localhost:8000';
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Docs de démonstration
const SAMPLE_DOCS = [
  {
    id: 'pricing-1',
    title: 'Tarification VM Standard',
    type: 'pricing',
    content: `Les VM Standard SNCF coûtent 0.50€/heure avec 2 vCPU et 4GB RAM. Les VM Premium coûtent 1.20€/heure avec 4 vCPU et 8GB RAM. Le stockage coûte 0.10€/GB/mois. Volume minimum: 100GB.`
  },
  {
    id: 'diagnostic-1',
    title: 'Guide Diagnostic PPV',
    type: 'diagnostic',
    content: `Pour diagnostiquer une VM lente: 1. Vérifier la CPU: > 80% = problème. 2. Vérifier la mémoire: > 85% = alerte. 3. Vérifier le disque: vérifier l'espace disponible. Erreur courante: Connection timeout = vérifier firewall.`
  },
  {
    id: 'servicenow-1',
    title: 'Processus Ticket ServiceNow',
    type: 'process',
    content: `Pour créer un ticket support: 1. Accéder à ServiceNow portal. 2. Remplir: Description, Urgence, Impact. 3. Assigner à: Team PPV Support. SLA: P1 = 1h, P2 = 4h, P3 = 24h.`
  },
  {
    id: 'faq-1',
    title: 'FAQ Support PPV',
    type: 'faq',
    content: `Q: Comment redémarrer une VM? R: Via console reboot -h now ou via dashboard restart button. Q: Sauvegarde automatique? R: Snapshots quotidiens à 2h du matin.`
  }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.statusText} - ${error}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

async function vectorizeAndIndex() {
  console.log('🔄 Vectorizing documents with rate limiting...\n');
  
  let totalChunks = 0;
  
  for (const doc of SAMPLE_DOCS) {
    console.log(`📄 Processing: ${doc.title}`);
    
    // Split into chunks (limit to 3 chunks per doc to avoid rate limit)
    const sentences = doc.content.split('.').filter(s => s.trim());
    const chunks = sentences.slice(0, 3); // Only first 3 sentences
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim();
      if (!chunk) continue;
      
      try {
        // Wait 2 seconds before each API call to avoid rate limit
        await sleep(2000);
        
        console.log(`  ⏳ Getting embedding for chunk ${i + 1}/${chunks.length}...`);
        
        // Get embedding from OpenAI
        const embedding = await getEmbedding(chunk);
        
        // Add to Chroma
        const chromaResponse = await fetch(`${CHROMA_URL}/api/v1/collections/ppv/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: [`${doc.id}-chunk-${i}`],
            embeddings: [embedding],
            documents: [chunk],
            metadatas: [{
              doc_type: doc.type,
              doc_title: doc.title,
              doc_id: doc.id,
            }],
          }),
        });
        
        if (!chromaResponse.ok) {
          console.error(`  ❌ Chroma error: ${chromaResponse.statusText}`);
          continue;
        }
        
        totalChunks++;
        console.log(`  ✅ Chunk ${i + 1} indexed (total: ${totalChunks})`);
        
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log(`\n✅ Vectorization complete!`);
  console.log(`📊 Total chunks indexed: ${totalChunks}`);
  console.log(`🔗 Chroma is ready at: ${CHROMA_URL}\n`);
}

// Run
vectorizeAndIndex().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
