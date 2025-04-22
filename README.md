<p align="center">
    <img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/ec559a9f6bfd399b82bb44393651661b08aaf7ba/icons/folder-markdown-open.svg" align="center" width="30%">
</p>
<p align="center"><h1 align="center">QANOUNI‑AI</h1></p>
<p align="center">
    <em><code>An AI‑powered legal assistant for asking and retrieving law references.</code></em>
</p>
<p align="center">
    <img src="https://img.shields.io/github/last-commit/ZAKARIA-ELOMARI/Qanouni-Ai?style=default&logo=git&logoColor=white&color=0080ff" alt="last-commit">
    <img src="https://img.shields.io/github/languages/top/ZAKARIA-ELOMARI/Qanouni-Ai?style=default&color=0080ff" alt="repo-top-language">
    <img src="https://img.shields.io/github/languages/count/ZAKARIA-ELOMARI/Qanouni-Ai?style=default&color=0080ff" alt="repo-language-count">
        <img src="https://img.shields.io/github/license/ZAKARIA-ELOMARI/Qanouni-Ai?style=default&logo=opensourceinitiative&logoColor=white&color=0080ff" alt="license">

</p>

## 🔗 Table of Contents

- [📍 Overview](#-overview)  
- [👾 Features](#-features)  
- [📁 Project Structure](#-project-structure)  
  - [📂 Project Index](#-project-index)  
- [🚀 Getting Started](#-getting-started)  
  - [☑️ Prerequisites](#-prerequisites)  
  - [⚙️ Installation](#-installation)  
  - [🤖 Usage](#%F0%9F%A4%96-usage)  
  - [🧪 Testing](#%F0%9F%A7%AA-testing)  
- [🔰 Contributing](#-contributing)  
- [🎗 License](#-license)  
---

## 📍 Overview

Qanouni‑AI is a full‑stack web application that provides an AI‑driven legal assistant. Users can sign up, log in, and engage in real‑time chat conversations powered by OpenAI’s GPT model to retrieve statutes, code articles, or legal commentary. All chat history is stored securely for future reference. The system is split into:

- **Back‑end:** Node.js + Express REST API, PostgreSQL, and OpenAI integration.  
- **Front‑end:** React (Vite) single‑page application with client‑side routing and responsive design.

---

## 👾 Features

- **User Authentication:** Secure signup and login with password hashing and JWT sessions.  
- **AI‑Powered Chat:** Send legal questions and receive context‑aware answers from OpenAI’s GPT.  
- **Chat History:** Persist all messages in a database, allowing users to review previous conversations.  
- **Environment‑driven Configuration:** Easily configure API keys, database URLs, and ports via `.env`.  
- **Responsive UI:** Mobile‑first design with React, Vite, and modern CSS.  
- **Deployment‑Ready:** Netlify for front‑end and any Node‑hosting (Heroku, AWS, etc.) for back‑end with a simple `netlify.toml`.

---

## 📁 Project Structure

```bash
Qanouni‑Ai/
├── back‑end
│   ├── .env.example
│   ├── .gitignore
│   ├── chatRoutes.js
│   ├── db.js
│   ├── index.js
│   ├── package.json
│   └── setup‑db.js
└── front‑end
    ├── .gitignore
    ├── eslint.config.js
    ├── index.html
    ├── netlify.toml
    ├── package.json
    ├── vite.config.js
    └── src
        ├── index.css
        ├── App.css
        ├── main.jsx
        ├── App.jsx
        ├── config
        │   └── api.js
        └── pages
            ├── Signup.jsx
            ├── Login.jsx
            ├── Chat.jsx
            └── NotFound.jsx
```

### 📂 Project Index
<details open>
  <summary><b>Qanouni‑Ai/</b></summary>

  <details open>
    <summary><b>back‑end/</b></summary>
    <table>
      <tr>
        <td><b><code>.env.example</code></b></td>
        <td>Template for environment variables:</td>
      </tr>
      <tr>
        <td><b><code>chatRoutes.js</code></b></td>
        <td>Defines `/api/chat` route: validates requests, calls OpenAI, persists messages.</td>
      </tr>
      <tr>
        <td><b><code>db.js</code></b></td>
        <td>Database connection logic (e.g. MongoDB URI or PostgreSQL via knex/pg).</td>
      </tr>
      <tr>
        <td><b><code>index.js</code></b></td>
        <td>Main Express server: middleware, CORS, routing, error handling.</td>
      </tr>
      <tr>
        <td><b><code>package.json</code></b></td>
        <td>Back‑end dependencies (`express`, `dotenv`, `openai`, `mongoose`/`pg`).</td>
      </tr>
      <tr>
        <td><b><code>setup‑db.js</code></b></td>
        <td>Initializes database schema/collections and sample data.</td>
      </tr>
    </table>
  </details>

  <details open>
    <summary><b>front‑end/</b></summary>
    <table>
      <tr>
        <td><b><code>netlify.toml</code></b></td>
        <td>Netlify config: redirects all paths to `index.html` for SPA routing.</td>
      </tr>
      <tr>
        <td><b><code>eslint.config.js</code></b></td>
        <td>ESLint rules for consistent code style.</td>
      </tr>
      <tr>
        <td><b><code>index.html</code></b></td>
        <td>HTML template with root `<div id="root">` and environment variable injection.</td>
      </tr>
      <tr>
        <td><b><code>package.json</code></b></td>
        <td>Front‑end dependencies (`react`, `react-router-dom`, `axios`, `vite`).</td>
      </tr>
      <tr>
        <td><b><code>vite.config.js</code></b></td>
        <td>Vite setup: React plugin, environment mode, base URL.</td>
      </tr>
    </table>
    <details>
      <summary><b>src/</b></summary>
      <table>
        <tr>
          <td><b><code>index.css</code></b></td>
          <td>Global CSS resets and utilities.</td>
        </tr>
        <tr>
          <td><b><code>App.css</code></b></td>
          <td>Component‑level styling for main layout.</td>
        </tr>
        <tr>
          <td><b><code>main.jsx</code></b></td>
          <td>Bootstraps ReactDOM with `<BrowserRouter>`.</td>
        </tr>
        <tr>
          <td><b><code>App.jsx</code></b></td>
          <td>Defines routes for Signup, Login, Chat, NotFound pages.</td>
        </tr>
      </table>
      <details>
        <summary><b>config/</b></summary>
        <table>
          <tr>
            <td><b><code>api.js</code></b></td>
            <td>Axios instance configured with back‑end base URL and interceptors.</td>
          </tr>
        </table>
      </details>
      <details>
        <summary><b>pages/</b></summary>
        <table>
          <tr>
            <td><b><code>Signup.jsx</code></b></td>
            <td>Form UI for new user registration; calls `/api/auth/signup`.</td>
          </tr>
          <tr>
            <td><b><code>Login.jsx</code></b></td>
            <td>Form UI for existing users; calls `/api/auth/login`, stores JWT.</td>
          </tr>
          <tr>
            <td><b><code>Chat.jsx</code></b></td>
            <td>Main chat interface: message list, input box, sends to `/api/chat`.</td>
          </tr>
          <tr>
            <td><b><code>NotFound.jsx</code></b></td>
            <td>404 page for unmatched routes.</td>
          </tr>
        </table>
      </details>
    </details>
  </details>
</details>

---

## 🚀 Getting Started

### ☑️ Prerequisites

- **Node.js** v16+ and **npm** v8+ installed  
- **OpenAI API Key** (for chat)  
- **Database** PostgreSQL credentials

### ⚙️ Installation

1. **Clone repository**
   ```bash
   git clone https://github.com/ZAKARIA-ELOMARI/Qanouni-Ai.git
   cd Qanouni-Ai
   ```

2. **Back‑end setup**
   ```bash
   cd back‑end
   cp .env.example .env
   # Edit .env: set PORT, DB_URI, OPENAI_API_KEY
   npm install
   npm run setup-db     # create collections/tables
   npm start            # or `npm run dev` if using nodemon
   ```

3. **Front‑end setup**
   ```bash
   cd ../front‑end
   npm install
   npm run dev          # starts Vite dev server on http://localhost:5173
   ```

### 🤖 Usage

- Visit **http://localhost:5173** in your browser.  
- **Sign up** for a new account, then **log in**.  
- Navigate to the **Chat** page, type your legal questions, and press **Send**.  
- All interactions are saved; revisit previous sessions any time you log back in.

### 🧪 Testing

No automated tests are configured yet. You can manually test APIs with [Postman] or [Insomnia]:

- **Auth**: `POST /api/auth/signup` & `POST /api/auth/login`.  
- **Chat**: `POST /api/chat` with JSON `{ "message": "Your question here" }` & header `Authorization: Bearer <token>`.

---

## 🔰 Contributing

1. **Fork** the repo  
2. **Clone** your fork  
3. Create a **feature branch**: `git checkout -b feature‑xyz`  
4. **Commit** your changes with clear messages  
5. **Push** and open a **PR** against `main`  
6. **Discuss & review** until merged

[![Contributors](https://img.shields.io/github/contributors/ZAKARIA-ELOMARI/Qanouni-Ai?style=flat-square)](https://github.com/ZAKARIA-ELOMARI/Qanouni-Ai/graphs/contributors)


---

## 🎗 License

This project is licensed under the **MIT License**. See the [LICENSE](https://choosealicense.com/licenses/mit/) file for details.

---
