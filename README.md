# 🤖 Assistant PPV — prototype de faisabilité

Assistant de support de niveau 1 pour l'offre Postes Virtuels (PPV) de la SNCF. Ce dépôt contient le **prototype de faisabilité** : il démontre qu'une IA peut répondre aux questions des utilisateurs **à partir de la documentation du service**, en citant ses sources, pour un coût par question très faible.

> Ce dépôt s'adresse aux **développeurs**. La documentation de pilotage (choix, benchmark, architecture cible, planning, revue de code, diagrammes) est dans un dépôt séparé : [github.com/margotmc-web/Chatbot_PPV_BC07](https://github.com/margotmc-web/Chatbot_PPV_BC07).

---

## Ce que fait le prototype

1. L'utilisateur pose sa question en langage courant dans la fenêtre de conversation.
2. Le serveur traduit la question en nombres (vectorisation) et cherche les **3 passages les plus proches** dans la base de recherche Chroma.
3. Il envoie ces seuls passages à l'IA, qui **rédige la réponse**.
4. La réponse s'affiche avec ses **sources** et leur **taux de correspondance**.

C'est le principe RAG (génération augmentée par la recherche), expliqué dans [RAG-GUIDE.md](RAG-GUIDE.md).

```
 Navigateur ── question ──▶  Serveur Node.js / Express (server-fixed.js, port 3001)
 (React, public/)                 │ 1. vectorisation de la question  ──▶ OpenAI (text-embedding-3-small)
     ▲                            │ 2. recherche des 3 passages       ──▶ Chroma (Docker, port 8000)
     │                            │ 3. rédaction de la réponse        ──▶ OpenAI (gpt-3.5-turbo)
     └── réponse + sources ───────┘
```

## Démarrage rapide

Prérequis : Node.js 18 ou plus, Python 3.10 ou plus, Docker, une clé d'API OpenAI. Le détail est dans [SETUP.md](SETUP.md).

```bash
# 1. Base de recherche
docker run -d -p 8000:8000 chromadb/chroma

# 2. Configuration : copier le modèle puis renseigner OPENAI_API_KEY
cp .env.example .env        # Windows : copy .env.example .env

# 3. Indexation des documents
pip install chromadb openai python-dotenv
python vectorize.py

# 4. Serveur et interface
npm install --legacy-peer-deps
node server-fixed.js
```

Ouvrir ensuite **http://localhost:3001** et poser une question, par exemple « Ma VM est lente, que faire ? ».

> ⚠️ Ne pas utiliser `npm start` : la commande lance encore `server-rag.js`, une version abandonnée (constat n° 8 de la revue de code, à corriger avant la bêta).

## Contenu du dépôt

**Fichiers en service**

| Fichier | Rôle |
|---|---|
| `server-fixed.js` | Serveur : routes `/api/chat` et `/api/health`, recherche dans Chroma, appel à l'IA, envoi de l'interface |
| `vectorize.py` | Indexation : découpe les documents, les vectorise et les range dans Chroma (collection `ppv`) |
| `public/` | Interface React (chargée dans le navigateur, sans étape de compilation) |
| `public/app.jsx` | Application principale ; `onSend` envoie la question au serveur, `RagSources` affiche les sources |
| `count-chroma.py` | Vérifie le nombre de passages indexés dans Chroma |
| `test-api.js` | Teste les routes du serveur |
| `.env.example` | Modèle de configuration, sans clé réelle |

**Fichiers conservés pour l'historique des itérations** (non utilisés, voir [RAG-IMPLEMENTATION.md](RAG-IMPLEMENTATION.md#historique-des-fichiers))

`server.js`, `server-simple.js`, `server-rag.js`, `rag-service.js`, `vectorize-docs.js`, `vectorize-simple-delay.js`, `vectorize-fixed.js`, `vectorize-free.js`, `apache-config.conf`, `public/app-adapter.jsx`, `public/rag-adapter.jsx`.

## Documentation

| Document | Contenu |
|---|---|
| [SETUP.md](SETUP.md) | Installation pas à pas et résolution des problèmes courants |
| [RAG-GUIDE.md](RAG-GUIDE.md) | Le principe de la recherche documentaire, expliqué simplement |
| [RAG-IMPLEMENTATION.md](RAG-IMPLEMENTATION.md) | Le fonctionnement du code, fichier par fichier, et ses limites connues |
| [INTEGRATION.md](INTEGRATION.md) | Les intégrations prévues : SharePoint, compte SNCF, Azure, ticket pré-rédigé |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Le passage du prototype à la bêta, puis à la production |

## État du prototype

| Fonctionnalité | État |
|---|---|
| Question en langage naturel et réponse rédigée par l'IA | 🟢 Fonctionne |
| Recherche préalable dans la documentation (3 passages) | 🟢 Fonctionne |
| Affichage des sources et du taux de correspondance | 🟢 Fonctionne |
| Réponse « je ne sais pas » quand aucun passage ne correspond | 🔴 À construire (constat n° 3) |
| Pré-rédaction du ticket à reporter dans ServiceNow | 🔴 À construire |
| Documentation réelle du SharePoint, connexion avec le compte SNCF | 🔴 À construire |

Le prototype fonctionne sur **4 documents de démonstration**, pour **un utilisateur**, sur un poste local. La revue de code (12 constats) liste les corrections à faire avant toute ouverture à des utilisateurs : voir la [section 7 de la documentation de pilotage](https://github.com/margotmc-web/Chatbot_PPV_BC07).
