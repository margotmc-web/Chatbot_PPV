const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const CHROMA_URL = 'http://localhost:8000';

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

async function createChromaCollection() {
  console.log('📦 Creating Chroma collection...');
  
  try {
    const response = await fetch(`${CHROMA_URL}/api/v1/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'ppv',
        metadata: { 'hnsw:space': 'cosine' }
      }),
    });
    
    if (response.ok) {
      console.log('✅ Collection created successfully\n');
    } else if (response.status === 409) {
      console.log('✅ Collection already exists\n');
    } else {
      console.log(`⚠️  Collection creation response: ${response.status}\n`);
    }
  } catch (err) {
    console.error('❌ Failed to create collection:', err.message);
    throw err;
  }
}

async function getLocalEmbedding(text) {
  try {
    const { env, AutoTokenizer, AutoModel } = await import('@xenova/transformers');
    
    env.allowLocalModels = true;
    env.allowRemoteModels = true;
    
    console.log('  🤖 Loading model (first time only, ~100MB download)...');
    
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/all-MiniLM-L6-v2');
    const model = await AutoModel.from_pretrained('Xenova/all-MiniLM-L6-v2');
    
    const inputs = tokenizer(text, { padding: true, truncation: true });
    const { last_hidden_state } = await model(inputs);
    
    // Convert to Array
    return Array.from(last_hidden_state.data);
  } catch (err) {
    throw new Error(`Embedding error: ${err.message}`);
  }
}

async function vectorizeAndIndex() {
  console.log('🔄 Vectorizing documents with local embeddings (FREE!)...\n');
  
  // First, create the collection
  await createChromaCollection();
  
  let totalChunks = 0;
  
  for (const doc of SAMPLE_DOCS) {
    console.log(`📄 Processing: ${doc.title}`);
    
    const sentences = doc.content.split('.').filter(s => s.trim());
    const chunks = sentences.slice(0, 3);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim();
      if (!chunk) continue;
      
      try {
        console.log(`  ⏳ Getting embedding for chunk ${i + 1}/${chunks.length}...`);
        
        const embedding = await getLocalEmbedding(chunk);
        
        console.log(`  📤 Sending to Chroma...`);
        
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
          const errorText = await chromaResponse.text();
          console.error(`  ❌ Chroma error: ${chromaResponse.statusText} - ${errorText}`);
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

vectorizeAndIndex().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
