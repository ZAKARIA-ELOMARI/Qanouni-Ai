# ChatBot Juridique Marocain 🤖⚖️

Une application de chat interactive pour répondre aux questions juridiques au Maroc, avec une interface moderne inspirée de ChatGPT.

## 🌟 Fonctionnalités

- **Interface Moderne**
  - Design inspiré de ChatGPT
  - Thème sombre élégant
  - Navigation fluide et intuitive
  - Barre latérale rétractable

- **Gestion des Conversations**
  - Création de nouvelles conversations
  - Historique des conversations
  - Suppression des conversations
  - Affichage des dates et heures des messages

- **Authentification**
  - Système de connexion sécurisé
  - Inscription des nouveaux utilisateurs
  - Gestion des sessions utilisateur

- **Chat Interactif**
  - Réponses en temps réel
  - Support des questions juridiques
  - Interface de chat intuitive
  - Indicateur de chargement

## 🚀 Installation

1. **Cloner le projet**
```bash
git clone [url-du-projet]
cd chatbot-juridique
```

2. **Installation des dépendances**
```bash
# Installation des dépendances du frontend
cd chatbot-frontend
npm install

# Installation des dépendances du backend (dans un autre terminal)
cd chatbot-backend
npm install
```

3. **Configuration**
- Créer un fichier `.env` dans le dossier backend avec les variables suivantes :
```env
PORT=3001
JWT_SECRET=votre_secret_jwt
DB_CONNECTION_STRING=votre_chaine_de_connexion_db
```

4. **Lancer l'application**
```bash
# Démarrer le frontend (depuis le dossier chatbot-frontend)
npm run dev

# Démarrer le backend (depuis le dossier chatbot-backend)
npm start
```

## 🛠️ Technologies Utilisées

### Frontend
- React (Vite)
- Material-UI (MUI)
- Axios pour les requêtes HTTP
- React Router pour la navigation

### Backend
- Node.js
- Express.js
- JWT pour l'authentification
- Base de données (MongoDB/PostgreSQL)

## 📱 Captures d'écran

[Insérer des captures d'écran de l'application ici]

## 🔒 Sécurité

- Authentification JWT
- Protection des routes sensibles
- Validation des entrées utilisateur
- Gestion sécurisée des mots de passe

## 🌐 API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion utilisateur
- `POST /api/auth/register` - Inscription utilisateur

### Conversations
- `GET /api/conversations` - Récupérer toutes les conversations
- `POST /api/conversations` - Créer une nouvelle conversation
- `DELETE /api/conversations/:id` - Supprimer une conversation
- `GET /api/conversations/:id` - Récupérer les messages d'une conversation

### Messages
- `POST /api/conversations/:id/messages` - Envoyer un message
- `GET /api/conversations/:id/messages` - Récupérer les messages




---
