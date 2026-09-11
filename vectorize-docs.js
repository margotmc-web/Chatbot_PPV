#!/usr/bin/env node

/**
 * Vectorization Script — Préparer les documents pour le RAG
 * 
 * Usage:
 *   node vectorize-docs.js --source sharepoint    # Chercher dans SharePoint (nécessite l'authentification)
 *   node vectorize-docs.js --source local         # Chercher dans ./docs/
 *   node vectorize-docs.js --source sample        # Utiliser des docs de test
 * 
 * Résultat: Tous les docs sont vectorisés et stockés dans Chroma
 */

import dotenv from 'dotenv';
import { Chroma } from 'langchain/vectorstores/chroma';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitters';
import { Document } from 'langchain/document';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ============================================================
   Configuration
   ============================================================ */
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  separators: ['\n\n', '\n', '. ', ' ', '']
});

const embeddings = new OpenAIEmbeddings({
  modelName: EMBEDDING_MODEL,
  openAIApiKey: process.env.OPENAI_API_KEY
});

/* ============================================================
   Sample Documents (pour démo)
   ============================================================ */
const SAMPLE_DOCS = [
  {
    content: `
# Tarification VM — PPV SNCF

## VM Standard
- **Coût**: 125 € / mois
- **Spécifications**: 4 vCPU, 16 Go RAM, 128 Go SSD
- **Utilisation**: Pour la plupart des postes de travail
- **Temps de réponse**: < 200ms
- **Support**: N1/N2

## VM Clone Premium
- **Coût**: 280 € / mois
- **Spécifications**: 8 vCPU, 32 Go RAM, 256 Go SSD
- **Utilisation**: Pour les travaux gourmands en ressources
- **Accélération GPU**: Disponible (+50€/mois)
- **Support**: N1/N2/N3

## Facturation
- Facturation mensuelle, engagement minimum 3 mois
- Réduction 20% pour 12 mois
- Migration gratuite entre tailles
- Support prioritaire inclus

## Foire aux questions tarifaire
Q: Puis-je passer d'une VM Standard à Premium?
R: Oui, sans frais ni interruption. Votre facturation s'ajustera au prorata.

Q: Les données sont-elles sauvegardées?
R: Oui, snapshots quotidiens inclus, rétention 7 jours.

Q: Puis-je résilier avant 3 mois?
R: Oui, avec frais de rupture de 50€.
    `,
    metadata: {
      source: 'SharePoint/PPV/Pricing',
      type: 'pricing',
      category: 'commercial',
      updated: '2026-09-01'
    }
  },
  {
    content: `
# Diagnostic VM — Guide Utilisateur

## Étape 1: Vérifier la connexion
1. Ouvrir un terminal (Win+R → cmd)
2. Taper: ping 8.8.8.8
3. Si "Destination host unreachable": problème de connexion

### Solutions connexion
- Vérifier que le VPN SNCF est actif
- Redémarrer la connexion VPN
- Vérifier les pare-feu de votre organisation

## Étape 2: Vérifier les ressources
- Appuyer sur Ctrl+Shift+Esc (Task Manager)
- Vérifier l'utilisation CPU et RAM
- Si > 90%, votre VM est surchargée

### Actions si surchargée
1. Fermer les applications inutiles
2. Redémarrer la VM (graceful shutdown)
3. Contacter le support pour augmenter les ressources

## Étape 3: Vérifier le stockage
- Explorer → Clic droit propriétés du disque
- Vérifier l'espace disponible
- Minimum recommandé: 20% libre

### Nettoyage disque
- Vider la corbeille
- C:\Temp → supprimer les fichiers temporaires
- Exécuter cleanmgr (nettoyage disque Windows)

## Messages d'erreur courants

### "DRIVER_IRQL_NOT_LESS_OR_EQUAL"
Cause: Driver incompatible
Solution: Redémarrer → Mode sans échec → Désinstaller le dernier driver

### "Windows ne peut pas se connecter à ce réseau"
Cause: Profil réseau corrompu
Solution: Oublier le réseau → Reconnecter avec nouveau profil

### "Pas d'accès à \\\\SERVER"
Cause: Authentification SharePoint
Solution: Vérifier les credentials SNCF → Redémarrer la session
    `,
    metadata: {
      source: 'SharePoint/PPV/Diagnostic',
      type: 'diagnostic',
      category: 'technical',
      updated: '2026-08-15'
    }
  },
  {
    content: `
# ServiceNow — Création de Tickets

## Types de tickets PPV

### Incident (INC)
- Pour les problèmes urgents bloquant le travail
- Temps de réponse: < 2 heures (N1), < 30 min (N2)
- Exemple: "Impossible de se connecter à AVD"

### Request (REQ)
- Pour les demandes de ressources
- Exemple: "Augmentation RAM de 16 à 32 Go"
- Délai: 24-48 heures

### Change (CHG)
- Pour les modifications planifiées
- Exemple: "Changement du système d'exploitation"
- Validation requise

## Remplir un ticket efficace

### Champs obligatoires
1. **Title**: Description concise en 1 ligne
   - ✅ "Impossible de se connecter à Azure VD depuis ce matin"
   - ❌ "Problème VM"

2. **Description**: Contexte détaillé
   - Quand le problème a-t-il commencé?
   - Actions effectuées avant le problème?
   - Messages d'erreur exacts?
   - Impact sur votre travail?

3. **VM affectée**: PPV-AVD-XXXX-YY

4. **Priorité**:
   - P1 (Critique): Travail impossible
   - P2 (Haute): Travail ralenti
   - P3 (Normale): Inconvénient mineur
   - P4 (Basse): Demande d'information

### Pièces jointes recommandées
- Capture d'écran du message d'erreur
- Journal des événements Windows (eventvwr.msc)
- Rapport de diagnostic de la VM

## SLA (Service Level Agreement)

| Priorité | Impact | Temps réponse | Résolution cible |
|----------|--------|-------------|-----------------|
| P1 | Bloquant | 30 min | 4 heures |
| P2 | Dégradé | 2 heures | 1 jour |
| P3 | Mineur | 4 heures | 3 jours |
| P4 | Demande | 8 heures | 5 jours |

## Escalade

Si pas de réponse après 50% du SLA → escalade N2 automatique
Si pas de résolution après SLA → escalade N3 + dédommagement
    `,
    metadata: {
      source: 'SharePoint/PPV/ServiceNow',
      type: 'process',
      category: 'procedures',
      updated: '2026-09-05'
    }
  },
  {
    content: `
# FAQ — Premiers pas PPV

## Accès initial

Q: Comment me connecter pour la première fois?
R: 
1. Accéder au portail: https://ppv-portal.sncf.fr
2. Utiliser vos identifiants SNCF
3. Cliquer "Démarrer ma VM"
4. Le premier démarrage prend 5 minutes

Q: Quel navigateur utiliser?
R: Chrome, Firefox, ou Edge recommandés. IE11 non supporté.

## Performance

Q: Pourquoi ma VM est-elle lente?
R: Les causes les plus courantes:
- Antivirus en cours de scan (attendez 15 min)
- Trop d'onglets ouverts (> 50)
- Stockage saturé (< 10% libre)
- Connexion internet faible (< 10 Mbps)

Solution rapide: Redémarrer la VM

Q: Quelles applications sont pré-installées?
R: 
- Microsoft Office 365
- Google Chrome / Firefox
- 7-Zip, VLC, Notepad++
- Logiciels métier SNCF (pré-configurés)

Demande d'installation: Créer un ticket REQ

## Sécurité

Q: Mes données sont-elles sécurisées?
R: Oui:
- Chiffrement AES-256 au repos
- TLS 1.3 en transit
- Authentification MFA obligatoire
- Logs de toutes les connexions
- Audit de conformité CNIL/RGPD

Q: Puis-je installer mes propres logiciels?
R: Applications libres: Oui
Logiciels commerciaux: Créer ticket pour validation

## Troubleshooting rapide

Q: "Impossible de démarrer ma VM"
R: 
1. Vérifier que votre compte est actif (contacter RH)
2. Vérifier la limite d'accès simultanés (max 3 sessions)
3. Attendre 5 minutes puis réessayer
4. Créer ticket d'incident si persiste

Q: Perte de connexion RDP
R:
1. Vérifier la connexion internet (ping 8.8.8.8)
2. Redémarrer le VPN SNCF
3. Fermer tous les autres onglets RDP
4. Redémarrer votre poste de travail physique
    `,
    metadata: {
      source: 'SharePoint/PPV/FAQ',
      type: 'faq',
      category: 'knowledge',
      updated: '2026-09-03'
    }
  }
];

/* ============================================================
   Charger les documents
   ============================================================ */
async function loadDocuments(source = 'sample') {
  console.log(`📂 Chargement des documents (source: ${source})...\n`);

  let docs = [];

  if (source === 'sample') {
    // Utiliser les docs de test
    docs = SAMPLE_DOCS.map(
      doc =>
        new Document({
          pageContent: doc.content,
          metadata: doc.metadata
        })
    );
    console.log(`✅ ${docs.length} documents de test chargés\n`);
  } else if (source === 'local') {
    // Charger depuis ./docs/
    const docsDir = path.join(__dirname, 'docs');
    if (!fs.existsSync(docsDir)) {
      console.error('❌ Dossier ./docs/ introuvable');
      process.exit(1);
    }

    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
      docs.push(
        new Document({
          pageContent: content,
          metadata: {
            source: `local/${file}`,
            type: 'document',
            updated: new Date().toISOString()
          }
        })
      );
    }
    console.log(`✅ ${docs.length} documents locaux chargés\n`);
  } else if (source === 'sharepoint') {
    // TODO: Intégration SharePoint avec Azure AD
    console.error('❌ Intégration SharePoint pas encore implémentée');
    console.log('   Voir: microsoft-graph.js (à créer)\n');
    process.exit(1);
  }

  return docs;
}

/* ============================================================
   Vectoriser et indexer
   ============================================================ */
async function vectorizeAndIndex(documents) {
  console.log('🧠 Vectorisation en cours...\n');

  // Splitter les documents en chunks
  const allChunks = [];
  for (const doc of documents) {
    const chunks = await splitter.splitDocuments([doc]);
    allChunks.push(...chunks);
  }

  console.log(`📦 ${allChunks.length} chunks créés (${CHUNK_SIZE} tokens chacun)\n`);

  try {
    // Créer le vectorstore Chroma
    console.log(`⏳ Création du vectorstore Chroma (${EMBEDDING_MODEL})...\n`);

    const vectorStore = await Chroma.fromDocuments(allChunks, embeddings, {
      collectionName: 'ppv_documents',
      url: CHROMA_URL
    });

    console.log('✅ Vectorstore créé avec succès!\n');
    return vectorStore;
  } catch (error) {
    console.error('❌ Erreur vectorisation:', error.message);
    console.log('\n💡 Astuce: Assurez-vous que Chroma est lancé:');
    console.log('   docker run -p 8000:8000 chromadb/chroma\n');
    process.exit(1);
  }
}

/* ============================================================
   Tests du RAG
   ============================================================ */
async function testRAG(vectorStore) {
  console.log('🧪 Tests du RAG:\n');

  const testQueries = [
    'Quel est le coût d\'une VM Standard?',
    'Comment diagnostiquer une VM lente?',
    'Comment créer un ticket ServiceNow?',
    'Ma VM ne démarre pas, que faire?'
  ];

  for (const query of testQueries) {
    console.log(`📝 Query: "${query}"`);
    try {
      const results = await vectorStore.similaritySearchWithScore(query, 2);

      if (results.length === 0) {
        console.log('   ❌ Pas de résultats\n');
        continue;
      }

      results.forEach(([doc, score], idx) => {
        console.log(`   ✅ Résultat ${idx + 1} (score: ${(score * 100).toFixed(0)}%)`);
        console.log(`      Source: ${doc.metadata.source}`);
        console.log(`      Type: ${doc.metadata.type}`);
        console.log(`      Extrait: ${doc.pageContent.substring(0, 80)}...\n`);
      });
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}\n`);
    }
  }
}

/* ============================================================
   Main
   ============================================================ */
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 PPV Document Vectorization');
  console.log('═'.repeat(60) + '\n');

  const source = process.argv[2]?.split('=')[1] || 'sample';

  try {
    // 1. Charger les docs
    const documents = await loadDocuments(source);

    // 2. Vectoriser et indexer
    const vectorStore = await vectorizeAndIndex(documents);

    // 3. Tester le RAG
    await testRAG(vectorStore);

    console.log('═'.repeat(60));
    console.log('✅ Vectorisation terminée avec succès!');
    console.log('═'.repeat(60) + '\n');

    console.log('📌 Prochaines étapes:');
    console.log('   1. Lancer le serveur: npm start');
    console.log('   2. Tester l\'API: curl http://localhost:3001/api/rag/health');
    console.log('   3. Envoyer un message au chatbot\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

main();
