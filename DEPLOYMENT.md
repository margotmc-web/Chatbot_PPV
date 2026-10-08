# Du prototype à la production

Le prototype n'est **pas déployé** : il fonctionne uniquement sur un poste local, pour un utilisateur. Ce document décrit les étapes pour le rendre accessible aux utilisateurs. Le calendrier détaillé est dans le [plan de release](https://github.com/margotmc-web/Chatbot_PPV_BC07) de la documentation de pilotage.

## Les étapes

| Version | Période | Ce qui change | Condition de passage |
|---|---|---|---|
| **v0.1 — Prototype** 🟢 | Août – octobre 2026 | Chaîne RAG complète sur 4 documents, exécution locale | Faisabilité démontrée |
| **Bêta** | S1 – S8 | Hébergement dans l'environnement de l'entreprise, documentation réelle, réponse « je ne sais pas », pré-rédaction du ticket ; 10 à 15 utilisateurs pilotes | 80 % des scénarios de test réussis, aucune réponse inventée sur le jeu d'évaluation |
| **v1 — MVP** | S9 – S10 | Ouverture via le SharePoint de l'offre et le catalogue, connexion avec le compte SNCF | Conformité RGPD et sécurité validées, accord du commanditaire |
| **v2** | S11 – S20 | Agent Copilot Studio, Azure AI Search, indexation automatique, journalisation 6 mois, recherche d'information sur l'offre | Tests de charge réussis |

## Avant la bêta : prérequis

1. **Accès Azure** : c'est la dépendance critique. Sans lui, le prototype ne peut pas quitter le poste de travail. La demande doit être lancée dès la semaine 1.
2. **Corrections de la revue de code** : les constats n° 1 à 5 conditionnent le critère « aucune réponse inventée » :
   - découpage des documents par taille avec chevauchement (1 et 2) ;
   - seuil de pertinence et réponse « je ne sais pas » (3) ;
   - filtrage de l'historique envoyé à l'IA (4) ;
   - accès au serveur limité aux adresses du SharePoint, via la variable `CORS_ORIGIN` (5).
3. **Nettoyage du dépôt** : une seule chaîne, commande `npm start` corrigée, dépendances inutiles retirées (constats n° 8 et 10).
4. **Jeu d'évaluation** : les 30 questions de la documentation de pilotage, pour mesurer la pertinence avant d'ouvrir l'outil.

## Configuration à prévoir

Le prototype n'utilise que `OPENAI_API_KEY` et `PORT`. Le passage à Azure ajoutera :

| Réglage | Rôle |
|---|---|
| Point d'accès Azure OpenAI | Adresse du service Azure OpenAI de la SNCF |
| Noms des déploiements | Modèle de vectorisation et modèle de rédaction |
| Adresse de la base de recherche | Chroma hébergé (bêta), puis Azure AI Search (v2) |
| `CORS_ORIGIN` | Adresses du SharePoint autorisées à appeler le serveur |

Les clés restent dans des variables d'environnement, jamais dans le dépôt.

## Hébergement cible

En phase 2, le serveur Node.js / Express est hébergé sur **Azure App Service** : service supervisé, sauvegardé, intégré à l'authentification de l'entreprise. Le choix de l'hébergement dès la phase 1 reste à trancher.

Le fichier `apache-config.conf` correspond à une piste d'hébergement sur serveur Apache, écartée au profit de l'écosystème Azure. Il est conservé pour l'historique.
