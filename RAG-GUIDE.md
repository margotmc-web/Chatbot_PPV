# Le principe RAG, expliqué simplement

RAG signifie *Retrieval-Augmented Generation*, en français **génération augmentée par la recherche**. C'est le principe sur lequel repose tout l'assistant.

## Le problème à résoudre

Une IA comme gpt-3.5-turbo sait rédiger, mais elle ne connaît pas la documentation du service PPV. Deux solutions simples existent, et aucune ne convient :

| Solution | Pourquoi elle ne convient pas |
|---|---|
| Envoyer **toute la documentation** à l'IA à chaque question | Très cher et lent (≈ 0,05 € et ≈ 10 secondes par question avec 4 documents seulement), et impossible avec la documentation réelle |
| **Réentraîner** un modèle sur la documentation | Coûteux, à refaire à chaque mise à jour, et le modèle ne peut pas citer ses sources |

## La solution : chercher d'abord, rédiger ensuite

1. **Une fois pour toutes**, la documentation est découpée en passages. Chaque passage est traduit en une suite de nombres qui représente son sens (son « empreinte », ou vecteur). Ces empreintes sont rangées dans une base de recherche, ici **Chroma**.
2. **À chaque question**, la question est elle aussi traduite en empreinte. La base retrouve les **3 passages dont le sens est le plus proche**.
3. Seuls ces 3 passages sont envoyés à l'IA, avec la consigne de rédiger la réponse à partir d'eux.
4. La réponse est affichée avec les passages utilisés : l'utilisateur peut vérifier d'où vient l'information.

Comme la recherche se fait par le sens et non par mots-clés, l'assistant comprend « ma VM ne démarre pas » même si la procédure est intitulée « échec de lancement ».

## Ce que cela change

| | Sans recherche préalable | Avec RAG |
|---|---|---|
| Texte envoyé à l'IA | Toute la documentation | 3 passages |
| Coût par question | ≈ 0,05 € | ≈ 0,0003 € 🟡 |
| Temps de réponse | ≈ 10 s | Moins d'1 s |
| Sources citées | Non | Oui |
| Mise à jour de la documentation | — | Il suffit de réindexer |

🟡 Estimation calculée à partir des volumes du prototype, sans mesure à grande échelle.

## Les deux modèles utilisés

Le prototype appelle OpenAI pour deux usages distincts :

| Usage | Modèle | Rôle |
|---|---|---|
| Vectorisation | `text-embedding-3-small` | Traduire un texte en empreinte, pour **trouver** |
| Rédaction | `gpt-3.5-turbo` | Écrire la réponse, pour **répondre** |

En production, les mêmes usages passeront par **Azure OpenAI**, dans l'environnement Microsoft de la SNCF, avec un modèle de rédaction plus récent (gpt-4o-mini). La base Chroma sera remplacée par **Azure AI Search**. Le principe ne change pas : seule la provenance des briques évolue (voir [DEPLOYMENT.md](DEPLOYMENT.md)).

## La limite principale

Si aucun passage ne traite la question, la base renvoie quand même les 3 passages « les moins éloignés », et l'IA rédige une réponse plausible à partir de documents sans rapport. C'est le risque le plus grave en support. La correction prévue : **un seuil de correspondance** en dessous duquel l'assistant répond « je ne sais pas » et propose de pré-rédiger un ticket (constat n° 3 de la revue de code, condition de passage en bêta).

Pour le détail du code, voir [RAG-IMPLEMENTATION.md](RAG-IMPLEMENTATION.md).
