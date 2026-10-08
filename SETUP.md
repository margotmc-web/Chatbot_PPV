# Installation du prototype

Ce guide permet de faire fonctionner le prototype sur un poste de travail. Comptez environ 15 minutes. Les commandes fonctionnent sous Windows (PowerShell), macOS et Linux, sauf mention contraire.

## 1. Prérequis

| Outil | Version | Pour quoi faire |
|---|---|---|
| Node.js | 18 ou plus | Faire tourner le serveur |
| Python | 3.10 ou plus | Lancer le script d'indexation |
| Docker | Version récente | Faire tourner la base de recherche Chroma |
| Clé d'API OpenAI | — | Vectoriser les textes et rédiger les réponses |

## 2. Récupérer le code

```bash
git clone https://github.com/margotmc-web/Chatbot_PPV.git
cd Chatbot_PPV
```

## 3. Configurer

```bash
cp .env.example .env        # Windows : copy .env.example .env
```

Ouvrir `.env` et renseigner la clé :

```
OPENAI_API_KEY=sk-...
```

Le fichier `.env` est exclu du dépôt (`.gitignore`) : la clé ne doit jamais être publiée.

## 4. Démarrer la base de recherche

```bash
docker run -d -p 8000:8000 chromadb/chroma
```

Chroma est alors accessible sur `http://localhost:8000`. Le serveur interroge l'API v1 de Chroma par le nom de la collection (`ppv`) : en cas d'erreur, utiliser la même image Chroma que lors du prototypage.

## 5. Indexer les documents

```bash
pip install chromadb openai python-dotenv
python vectorize.py
```

Le script crée la collection `ppv` (mesure de proximité « cosinus ») et y range les passages des 4 documents de démonstration. Il attend 2 secondes entre deux appels à OpenAI pour ne pas dépasser le quota.

Vérifier le résultat :

```bash
python count-chroma.py
```

> Relancer `vectorize.py` sur une collection déjà remplie produit des doublons d'identifiants. Pour repartir de zéro, supprimer le conteneur Chroma et le relancer.

## 6. Démarrer le serveur

```bash
npm install --legacy-peer-deps
node server-fixed.js
```

Le message `✅ Server running on http://localhost:3001` confirme le démarrage.

> `--legacy-peer-deps` est nécessaire à cause de deux dépendances LangChain héritées d'une version abandonnée (constat n° 10 de la revue de code). `npm start` lance encore cette version abandonnée (constat n° 8) : utiliser `node server-fixed.js`.

## 7. Vérifier

1. **Le serveur répond** : ouvrir `http://localhost:3001/api/health`, qui doit afficher `{"status":"ok",...}`.
2. **L'interface fonctionne** : ouvrir `http://localhost:3001`, poser une question (« Ma VM est lente, que faire ? »). La réponse doit être un texte rédigé, suivi d'un encadré **📚 Sources** avec des pourcentages.
3. **Les routes répondent** : `node test-api.js`.

## Problèmes courants

| Symptôme | Cause probable | Solution |
|---|---|---|
| `npm install` échoue avec `ERESOLVE` | Conflit de versions LangChain | `npm install --legacy-peer-deps` |
| La réponse s'affiche sans encadré « Sources » | Chroma n'est pas démarré, ou la collection est vide | Vérifier `docker ps`, relancer `vectorize.py`, contrôler avec `count-chroma.py` |
| « Le service de réponse automatique est momentanément indisponible » | Le serveur n'arrive pas à joindre OpenAI : clé absente ou invalide, crédit épuisé | Vérifier `OPENAI_API_KEY` dans `.env` et le crédit du compte OpenAI |
| `EADDRINUSE` au démarrage | Le port 3001 est déjà utilisé | Arrêter l'autre programme, ou changer `PORT` dans `.env` |
| La page affiche les réponses toutes faites de la maquette | Ancienne version de `public/app.jsx` en cache | Recharger la page sans cache (Ctrl + F5) |
