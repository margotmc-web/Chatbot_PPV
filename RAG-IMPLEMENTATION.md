# Fonctionnement du code

Ce document suit le trajet d'une question, de l'indexation des documents jusqu'à l'affichage de la réponse. Le principe est expliqué dans [RAG-GUIDE.md](RAG-GUIDE.md).

## Vue d'ensemble

| Étape | Fichier | Quand |
|---|---|---|
| 1. Indexation des documents | `vectorize.py` | Une fois, puis à chaque mise à jour de la documentation |
| 2. Recherche et rédaction | `server-fixed.js` | À chaque question |
| 3. Affichage de la réponse et des sources | `public/app.jsx` | À chaque question |

## 1. Indexation — `vectorize.py`

1. **Documents** : 4 documents de démonstration, écrits dans le script (`SAMPLE_DOCS`) : tarification, guide de diagnostic, processus de ticket ServiceNow, FAQ.
2. **Découpage** : chaque document est découpé en phrases, au niveau des points.
3. **Vectorisation** : chaque passage est envoyé au modèle `text-embedding-3-small`, qui renvoie son empreinte (une suite de 1 536 nombres).
4. **Rangement** : le passage, son empreinte et ses métadonnées (`doc_title`, `doc_type`, `doc_id`) sont ajoutés à la collection Chroma `ppv`, créée avec la mesure de proximité « cosinus ».

> ⚠️ Deux limites connues faussent l'indexation (constats n° 1 et 2) : le découpage au point coupe les prix décimaux en deux (« 0.50 € » devient « 0 » et « 50 € »), et seules les 3 premières phrases de chaque document sont conservées. Correction prévue avant la bêta : découpage en morceaux de 1 000 caractères qui se chevauchent sur 200.

## 2. Recherche et rédaction — `server-fixed.js`

### Routes

| Route | Rôle |
|---|---|
| `GET /api/health` | Indique que le serveur fonctionne : `{"status":"ok","message":"Chatbot RAG running"}` |
| `POST /api/chat` | Reçoit la conversation, renvoie la réponse rédigée et les passages utilisés |
| `GET /` | Envoie l'interface (dossier `public/`) |

### Ce que reçoit `/api/chat`

```json
{
  "messages": [
    { "role": "user", "content": "Ma VM est lente, que faire ?" }
  ],
  "useRAG": true
}
```

La dernière entrée de `messages` est la question. Les précédentes forment l'historique de la conversation.

### Ce qui se passe

1. **Vectorisation de la question** avec `text-embedding-3-small` (fonction `queryChroma`).
2. **Recherche** : appel à Chroma (`/api/v1/collections/ppv/query`), qui renvoie les **3 passages les plus proches** avec leur distance.
3. **Construction de la consigne** : les 3 passages sont ajoutés à la consigne système, numérotés `[Document 1]` à `[Document 3]`.
4. **Rédaction** : appel à `gpt-3.5-turbo` avec la consigne, l'historique et la question (`temperature` 0,7, `max_tokens` 500).

Si Chroma ne répond pas, la recherche renvoie une liste vide : l'IA répond alors sans passage, et donc sans source.

### Ce que renvoie `/api/chat`

```json
{
  "response": "Pour une VM lente : 1. Vérifiez la CPU…",
  "ragDocuments": [
    { "content": "Pour diagnostiquer une VM lente: 1", "distance": 0.21,
      "metadata": { "doc_title": "Guide Diagnostic PPV", "doc_type": "diagnostic", "doc_id": "diagnostic-1" } }
  ]
}
```

`distance` est une **distance cosinus** : plus elle est petite, plus le passage est proche de la question.

En cas d'erreur d'OpenAI, la route renvoie le code 500.

## 3. Affichage — `public/app.jsx`

L'interface est écrite en React et chargée directement dans le navigateur : il n'y a pas d'étape de compilation.

- **`onSend`** : à l'envoi d'une question, transmet au serveur les 6 derniers messages texte de la conversation et la question, avec `useRAG: true`. Pendant l'attente, l'indicateur de saisie s'affiche.
- **`RagSources`** : affiche sous la réponse l'encadré **📚 Sources** : titre de chaque document et **taux de correspondance**, calculé comme `1 − distance`.
- **En cas d'échec** (serveur ou IA indisponible) : l'assistant l'indique et propose les parcours guidés de la maquette (diagnostic, préparation d'un ticket, FAQ).

Les boutons de suggestion de l'accueil (diagnostic, incident, suivi, coûts, première connexion) ouvrent les **parcours guidés de la maquette** (itération 0). Ils ne passent pas par l'IA.

## Limites connues

La revue de code a relevé 12 constats. Ceux qui concernent ce trajet :

| N° | Limite | Où |
|---|---|---|
| 1, 2 | Découpage au point et seulement 3 phrases par document | `vectorize.py` |
| 3 | Aucun seuil de pertinence : pas de réponse « je ne sais pas » | `server-fixed.js` |
| 4 | L'historique envoyé par le navigateur est transmis tel quel à l'IA | `server-fixed.js` |
| 5 | Le serveur accepte les requêtes de n'importe quel site | `server-fixed.js` |
| 6 | Pas de délai maximal ni de nouvelle tentative sur les appels à OpenAI | `server-fixed.js` |
| 7 | Température 0,7, trop créative pour du support | `server-fixed.js` |
| 11 | La consigne demande de citer « [Ref n] » alors que les passages sont étiquetés « [Document n] » | `server-fixed.js` |
| 12 | Messages d'erreur internes renvoyés au navigateur ; clé d'API non vérifiée au démarrage | `server-fixed.js` |

Le registre complet, avec les actions recommandées, est dans la [section 7 de la documentation de pilotage](https://github.com/margotmc-web/Chatbot_PPV_BC07).

## Tests

```bash
node test-api.js
```

Le script interroge `http://localhost:3001`. Les tests `/api/health` et `/api/chat` concernent le serveur en service. Le test `/api/diagnostic` porte sur une route d'une version antérieure et échoue avec `server-fixed.js`. La couverture reste partielle : ni la recherche ni les cas limites ne sont testés.

## Historique des fichiers

Le prototype s'est construit en quatre itérations (détail dans la documentation de pilotage). Les fichiers des étapes intermédiaires sont conservés pour attester de la démarche. Ils ne sont pas utilisés.

| Fichier | Origine |
|---|---|
| `server.js` | Première version du serveur, appel direct à l'IA avec option Azure OpenAI, sans recherche documentaire |
| `server-simple.js` | Version intermédiaire du serveur avec recherche dans Chroma (itération 2) |
| `server-rag.js`, `rag-service.js`, `vectorize-docs.js` | Variante fondée sur la bibliothèque LangChain (collection `ppv_documents`), abandonnée. `rag-service.js` montre la structure visée (découpage 1 000 / 200 caractères, recherche, contexte, rédaction) |
| `vectorize-simple-delay.js` | Indexation en JavaScript (itération 2), remplacée par `vectorize.py` |
| `vectorize-free.js`, `vectorize-fixed.js` | Vectorisation en local avec `@xenova/transformers` (itération 3, non aboutie) |
| `apache-config.conf` | Configuration d'un serveur web Apache, envisagée puis écartée |
| `public/app-adapter.jsx`, `public/rag-adapter.jsx` | Brouillons de branchement de l'interface, remplacés par `onSend` et `RagSources` dans `app.jsx` |
