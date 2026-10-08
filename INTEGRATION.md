# Intégrations prévues

Le prototype fonctionne seul, sur un poste. Ce document décrit comment l'assistant s'intégrera aux outils de la SNCF. **Aucune de ces intégrations n'est encore réalisée** 🔴. L'architecture complète est décrite dans la [documentation de pilotage](https://github.com/margotmc-web/Chatbot_PPV_BC07) (architecture, diagramme de déploiement).

## Vue d'ensemble

| Intégration | Phase 1 — MVP | Phase 2 |
|---|---|---|
| Point d'accès | SharePoint de l'offre PPV et catalogue des services numériques | Identique |
| Interface | Composant React intégré aux pages SharePoint | Agent Copilot Studio intégré aux pages |
| Source documentaire | Bibliothèque documentaire SharePoint | Bibliothèque SharePoint, indexée automatiquement dans Azure AI Search |
| Modèles d'IA | Azure OpenAI | Azure OpenAI |
| Connexion des utilisateurs | Microsoft Entra ID (compte SNCF) | Microsoft Entra ID |
| Escalade | Ticket pré-rédigé, reporté par l'utilisateur dans ServiceNow | Identique |

## 1. SharePoint — point d'accès et documentation

- **Point d'accès** : l'assistant est proposé depuis le SharePoint de l'offre PPV et depuis le catalogue des services numériques, là où les utilisateurs cherchent déjà l'information.
- **Documentation** : la source n'est plus les 4 documents de démonstration de `vectorize.py`, mais la bibliothèque documentaire SharePoint du service (procédures, FAQ, tarification).
- **Maintenance** : l'équipe PPV met à jour les fiches dans SharePoint ; en phase 2, l'index de recherche est mis à jour automatiquement.

Point à préciser : la façon d'interroger la bibliothèque SharePoint en phase 1, sans index vectoriel.

## 2. Microsoft Entra ID — connexion avec le compte SNCF

L'utilisateur est reconnu par son compte SNCF (connexion unique), sans nouveau mot de passe. L'assistant ne stocke ni mot de passe ni jeton. Le prototype, lui, n'a aucune authentification.

## 3. Azure OpenAI — modèles d'IA

Les appels directs à OpenAI du prototype sont remplacés par Azure OpenAI, hébergé dans l'environnement Microsoft de la SNCF, en région UE : la documentation et les questions ne sortent plus du périmètre de l'entreprise.

| Usage | Prototype | Cible |
|---|---|---|
| Vectorisation | `text-embedding-3-small` via OpenAI | Même modèle via Azure OpenAI |
| Rédaction | `gpt-3.5-turbo` via OpenAI | gpt-4o-mini via Azure OpenAI |

Dans le code, seules les fonctions d'appel de `server-fixed.js` changent : point d'accès (URL), nom du déploiement Azure et mode d'authentification.

## 4. ServiceNow — ticket pré-rédigé

**L'assistant n'écrit jamais dans ServiceNow.** Lorsqu'il ne sait pas répondre, ou que le problème persiste, il **pré-rédige le texte du ticket** à partir de l'échange : objet, description, vérifications déjà faites. L'utilisateur le copie lui-même dans ServiceNow.

Ce choix évite de gérer des droits d'écriture sur un outil tiers, et laisse à l'utilisateur la décision d'escalader. Le technicien de niveau 2 reçoit une demande déjà documentée.

Une route `POST /api/ticket` est prévue pour la pré-rédaction. Dans le prototype, le parcours « Préparer un ticket » de l'interface est une maquette, sans appel au serveur.

## 5. Journalisation

En phase 2, les échanges sont journalisés dans un service interne SNCF et conservés 6 mois (traçabilité, conformité RGPD). Le service exact reste à préciser. Le prototype ne conserve aucune conversation.
