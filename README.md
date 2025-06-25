<p align="center">
<img src="https://github.com/ZAKARIA-ELOMARI/Qanouni-Ai/blob/6a7776fbec7fe94e7c4d53a86bf5d42a8ee570b4/logo.jpg" align="center" width="30%">
</p>
<p align="center">
<em><code>An AI-powered legal assistant for asking and retrieving law references.</code></em>
</p>
<p align="center">
<img src="https://img.shields.io/github/license/ZAKARIA-ELOMARI/Qanouni-Ai?style=default&logo=opensourceinitiative&logoColor=white&color=0080ff" alt="license">
<img src="https://img.shields.io/github/last-commit/ZAKARIA-ELOMARI/Qanouni-Ai?style=default&logo=git&logoColor=white&color=0080ff" alt="last-commit">
<img src="https://img.shields.io/github/languages/top/ZAKARIA-ELOMARI/Qanouni-Ai?style=default&color=0080ff" alt="repo-top-language">
<img src="https://img.shields.io/github/languages/count/ZAKARIA-ELOMARI/Qanouni-Ai?style=default&color=0080ff" alt="repo-language-count">
<img src="https://img.shields.io/github/contributors/ZAKARIA-ELOMARI/Qanouni-Ai?style=flat-square" alt="contributors">
</p>
<p align="center">
<img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
<img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" />
<img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" />
</p>

## 🔗 Table of Contents

  - [📍 Overview](#-overview)
  - [👾 Features](#-features)
  - [📁 Project Structure](#-project-structure)
      - [📂 Project Index](#-project-index)
  - [🚀 Getting Started](#-getting-started)
      - [☑️ Prerequisites](#-prerequisites)
      - [⚙️ Installation](#-installation)
      - [🤖 Usage](#-usage)
  - [🔰 Contributing](#-contributing)
  - [🎗 License](#-license)

-----

## 📍 Overview

Qanouni-AI is a full-stack web application that provides an AI-driven legal assistant for Moroccan law. Users can sign up, log in, and engage in real-time chat conversations powered by OpenAI's GPT model to retrieve statutes, code articles, or legal commentary. The application also supports file uploads (PDFs) to provide context for the AI assistant's responses. All chat history is stored securely for future reference. The system is split into:

  - **Back-end:** Node.js + Express REST API, PostgreSQL for the database, and OpenAI for AI-powered chat and file-based assistance.
  - **Front-end:** A responsive single-page application built with React (using Vite) and Material-UI, featuring client-side routing.

-----

## 👾 Features

  - **User Authentication:** Secure user registration and login with password hashing (bcryptjs) and JWT-based session management.
  - **AI-Powered Chat:** Real-time chat interface to ask legal questions and receive context-aware answers from OpenAI's GPT-4 model.
  - **File-Assisted Chat:** Upload PDF documents to provide additional context to the AI for more accurate and relevant responses.
  - **Chat History:** All conversations and messages are stored in the database, allowing users to review their past interactions.
  - **User Profile Management:** Users can view and update their profile information, including their username, email, and password.
  - **Admin Dashboard:** A dedicated admin panel to manage users, view system statistics, and monitor conversations.
  - **Law Data Pre-processing:** Includes a Python script (`law_cleaning.py`) to process legal documents from PDF to structured JSON, which can be used to build the AI's knowledge base.
  - **Responsive UI:** A modern and intuitive user interface built with Material-UI, ensuring a seamless experience on both desktop and mobile devices.
  - **Environment-driven Configuration:** Easily configure the application using a `.env` file for database credentials, API keys, and other settings.
  - **Deployment-Ready:** The front-end is configured for deployment on Netlify, and the back-end can be hosted on any platform that supports Node.js (e.g., Heroku, AWS, Railway).

-----

## 📁 Project Structure

```bash
Qanouni-Ai/
├── back-end
│   ├── .env.example
│   ├── .gitignore
│   ├── chatRoutes.js
│   ├── db.js
│   ├── index.js
│   ├── package.json
│   └── setup-db.js
├── front-end
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── netlify.toml
│   ├── package.json
│   ├── vite.config.js
│   └── src
│       ├── App.css
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── config
│       │   └── api.js
│       └── pages
│           ├── Admin.jsx
│           ├── Chat.jsx
│           ├── Files.jsx
│           ├── Login.jsx
│           ├── NotFound.jsx
│           ├── Profile.jsx
│           └── Signup.jsx
└── law_cleaning.py
```

### 📂 Project Index

<details open>
<summary><b>Qanouni-Ai/</b></summary>

<details>
<summary><b>back-end/</b></summary>
<table>
<tr>
<td><b><code>index.js</code></b></td>
<td>The main entry point for the Express server. It handles user authentication (registration and login) and sets up the core middleware.</td>
</tr>
<tr>
<td><b><code>chatRoutes.js</code></b></td>
<td>Defines all API routes for chat, conversations, file uploads, user profiles, and admin functionalities. It integrates with the OpenAI API.</td>
</tr>
<tr>
<td><b><code>db.js</code></b></td>
<td>Configures the PostgreSQL database connection using the `pg` library.</td>
</tr>
<tr>
<td><b><code>setup-db.js</code></b></td>
<td>A script to initialize the database schema, creating tables for users, conversations, messages, and user files.</td>
</tr>
<tr>
<td><b><code>package.json</code></b></td>
<td>Lists all back-end dependencies, including `express`, `pg`, `jsonwebtoken`, `bcryptjs`, `openai`, and `multer`.</td>
</tr>
<tr>
<td><b><code>.env.example</code></b></td>
<td>A template for the required environment variables.</td>
</tr>
</table>
</details>

<details>
<summary><b>front-end/</b></summary>
<table>
<tr>
<td><b><code>App.jsx</code></b></td>
<td>The main React component that sets up the application's routing using `react-router-dom`.</td>
</tr>
<tr>
<td><b><code>src/pages/</code></b></td>
<td>Contains all the pages of the application, including `Chat`, `Login`, `Signup`, `Profile`, `Files`, and `Admin`.</td>
</tr>
<tr>
<td><b><code>src/config/api.js</code></b></td>
<td>Configures an Axios instance for making API requests to the back-end.</td>
</tr>
<tr>
<td><b><code>package.json</code></b></td>
<td>Lists all front-end dependencies, such as `react`, `axios`, `@mui/material`, and `react-router-dom`.</td>
</tr>
<tr>
<td><b><code>vite.config.js</code></b></td>
<td>The configuration file for Vite.</td>
</tr>
<tr>
<td><b><code>netlify.toml</code></b></td>
<td>Configuration file for deploying the front-end to Netlify.</td>
</tr>
</table>
</details>

<details>
<summary><b>Root Directory</b></summary>
<table>
<tr>
<td><b><code>law_cleaning.py</code></b></td>
<td>A Python script for pre-processing legal documents from PDF to structured JSON.</td>
</tr>
</table>
</details>
</details>

-----

## 🚀 Getting Started

### ☑️ Prerequisites

  - **Node.js** v16+ and **npm** v8+ installed
  - **PostgreSQL** database
  - **OpenAI API Key**

### ⚙️ Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/ZAKARIA-ELOMARI/Qanouni-Ai.git
    cd Qanouni-Ai
    ```

2.  **Back-end setup**

    ```bash
    cd back-end
    cp .env.example .env
    # Edit the .env file with your database credentials and OpenAI API key
    npm install
    npm run setup-db
    npm start
    ```

3.  **Front-end setup**

    ```bash
    cd ../front-end
    npm install
    npm run dev
    ```

### 🤖 Usage

  - Open your browser and navigate to **http://localhost:5173**.
  - **Sign up** for a new account or **log in** with existing credentials.
  - From the **Chat** page, you can start a new conversation and ask legal questions.
  - To use the file-assisted chat, go to the **Files** page to upload your PDF documents.
  - As an admin, you can access the **Admin** panel to manage users and view statistics.

-----

## 🔰 Contributing

1.  **Fork** the repository
2.  **Clone** your fork (`git clone https://github.com/YourUsername/Qanouni-Ai.git`)
3.  Create a **feature branch** (`git checkout -b feature/AmazingFeature`)
4.  **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
5.  **Push** to the branch (`git push origin feature/AmazingFeature`)
6.  Open a **Pull Request**

<a href="https://github.com/ZAKARIA-ELOMARI/Qanouni-Ai/graphs/contributors">
<img src="https://contrib.rocks/image?repo=ZAKARIA-ELOMARI/Qanouni-Ai" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

-----

## 🎗 License

This project is licensed under the **MIT License**.
