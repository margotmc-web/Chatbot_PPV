#!/usr/bin/env python3
import os
import time
from dotenv import load_dotenv
import chromadb
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
client = OpenAI(api_key=OPENAI_API_KEY)

# Chroma client (local)
chroma_client = chromadb.HttpClient(host="localhost", port=8000)

# Docs de démonstration
SAMPLE_DOCS = [
    {
        'id': 'pricing-1',
        'title': 'Tarification VM Standard',
        'type': 'pricing',
        'content': 'Les VM Standard SNCF coûtent 0.50€/heure avec 2 vCPU et 4GB RAM. Les VM Premium coûtent 1.20€/heure avec 4 vCPU et 8GB RAM. Le stockage coûte 0.10€/GB/mois. Volume minimum: 100GB.'
    },
    {
        'id': 'diagnostic-1',
        'title': 'Guide Diagnostic PPV',
        'type': 'diagnostic',
        'content': 'Pour diagnostiquer une VM lente: 1. Vérifier la CPU: > 80% = problème. 2. Vérifier la mémoire: > 85% = alerte. 3. Vérifier le disque: vérifier l\'espace disponible. Erreur courante: Connection timeout = vérifier firewall.'
    },
    {
        'id': 'servicenow-1',
        'title': 'Processus Ticket ServiceNow',
        'type': 'process',
        'content': 'Pour créer un ticket support: 1. Accéder à ServiceNow portal. 2. Remplir: Description, Urgence, Impact. 3. Assigner à: Team PPV Support. SLA: P1 = 1h, P2 = 4h, P3 = 24h.'
    },
    {
        'id': 'faq-1',
        'title': 'FAQ Support PPV',
        'type': 'faq',
        'content': 'Q: Comment redémarrer une VM? R: Via console reboot -h now ou via dashboard restart button. Q: Sauvegarde automatique? R: Snapshots quotidiens à 2h du matin.'
    }
]

def get_embedding(text):
    """Get embedding from OpenAI"""
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def main():
    print("🔄 Vectorizing documents with OpenAI + Chroma...\n")
    
    # Get or create collection
    try:
        collection = chroma_client.get_collection(name="ppv")
        print("✅ Collection 'ppv' found")
    except:
        print("📦 Creating collection 'ppv'...")
        collection = chroma_client.create_collection(name="ppv", metadata={"hnsw:space": "cosine"})
        print("✅ Collection created")
    
    print()
    
    total_chunks = 0
    
    for doc in SAMPLE_DOCS:
        print(f"📄 Processing: {doc['title']}")
        
        # Split into chunks
        sentences = doc['content'].split('.')
        chunks = [s.strip() for s in sentences if s.strip()][:3]  # First 3 sentences
        
        for i, chunk in enumerate(chunks):
            try:
                print(f"  ⏳ Getting embedding for chunk {i+1}/{len(chunks)}...")
                
                # Get embedding
                embedding = get_embedding(chunk)
                
                # Add to Chroma
                collection.add(
                    ids=[f"{doc['id']}-chunk-{i}"],
                    embeddings=[embedding],
                    documents=[chunk],
                    metadatas=[{
                        "doc_type": doc['type'],
                        "doc_title": doc['title'],
                        "doc_id": doc['id']
                    }]
                )
                
                total_chunks += 1
                print(f"  ✅ Chunk {i+1} indexed (total: {total_chunks})")
                
                # Wait 2 seconds to avoid rate limit
                time.sleep(2)
                
            except Exception as e:
                print(f"  ❌ Error: {str(e)}")
        
        print()
    
    print(f"\n✅ Vectorization complete!")
    print(f"📊 Total chunks indexed: {total_chunks}")
    print(f"🔗 Chroma is ready at: http://localhost:8000\n")

if __name__ == "__main__":
    main()
