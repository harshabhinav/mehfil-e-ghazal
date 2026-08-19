# 🎶 Mehfil-e-Ghazal

> **A digital Mehfil for every Ghazal lover.** ❤️
 [Live Website: https://mehfil-e-ghazal.vercel.app/]
---

## 🌙 What is Mehfil-e-Ghazal?

Ever wanted to attend a beautiful Ghazal concert but couldn't find one happening near you?

**Mehfil-e-Ghazal** brings that feeling into a digital space.

It is an **ad-free, interactive Ghazal listening experience** where listeners can enjoy popular Ghazals, explore different moods, and share their reactions with everyone in the Mehfil.

The goal is simple:

> **If you're looking for a Ghazal Mehfil, this place is for you.** 🎶

---

## ✨ Features

### 🎵 Ghazal Music Player

* Curated collection of popular Ghazals
* Play, pause, next and previous controls
* Seek through songs with the progress bar
* Volume control
* Persistent playback state across refreshes
* Album artwork and song information

### 👏 Live "Wah!"

Enjoying a Ghazal?

Hit **Wah!** 👏

Your reaction is synchronized live so everyone in the Mehfil can see the appreciation.

### 🟢 Live Audience

See how many listeners are currently enjoying the Mehfil.

The audience count updates in real time using WebSockets.

### 🌙 Three Different Moods

Choose the atmosphere that matches your mood:

* ☀️ **Day**
* 🌆 **Evening**
* 🌙 **Night**

Each mode creates a different visual ambience while keeping the same Mehfil experience.

### 🔎 Spotify & YouTube Integration

Looking for a specific Ghazal?

Search through **Spotify and YouTube** to discover:

* Different versions
* Different artists
* Live performances
* Alternative renditions

### 🚫 Ad-Free Experience

No advertisements interrupting the music.

Just you, the Mehfil, and the Ghazal. ❤️

---

## 🛠️ Tech Stack

### Frontend

* **HTML**
* **CSS**
* **JavaScript**
* **Vite**
* **Tailwind CSS**

### Real-Time Features

* **WebSockets**
* Live audience synchronization
* Live "Wah!" reactions

### Deployment

* **Vercel** — Frontend
* **Render** — WebSocket server

### Development

* Git
* GitHub
* VS Code

---

## 🏗️ How It Works

```text
                    ┌─────────────────────┐
                    │   Mehfil-e-Ghazal   │
                    │      Frontend       │
                    │       Vercel        │
                    └──────────┬──────────┘
                               │
                         WebSocket
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Live WebSocket    │
                    │       Server        │
                    │       Render        │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
          🟢 Online Count              👏 Wah! Count
          Live listeners             Live reactions
```

---

## 🎧 User Experience

```text
Open Mehfil
     ↓
Choose your mood
     ↓
Pick a Ghazal
     ↓
Listen 🎶
     ↓
Enjoy it?
     ↓
Press "Wah!" 👏
     ↓
Everyone sees your appreciation
```

---

## 📱 Responsive Design

Mehfil-e-Ghazal is designed to work across:

* 💻 Desktop
* 📱 Mobile
* 📲 Tablet

The experience adapts to different screen sizes while maintaining the visual atmosphere of the Mehfil.

---

## ⚡ Real-Time Architecture

The live features are powered by a WebSocket connection.

When a listener joins:

```text
Listener joins
     ↓
WebSocket connection
     ↓
Server registers listener
     ↓
Online count updates
     ↓
All connected listeners receive update
```

When a listener leaves:

```text
Listener disconnects
     ↓
WebSocket closes
     ↓
Server removes listener
     ↓
Online count updates
     ↓
All connected listeners receive update
```

The same real-time architecture powers the **Wah! reaction system**.

---

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/harshabhinav/mehfil-e-ghazal.git
cd mehfil-e-ghazal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start development server

```bash
npm run dev
```

Open the local URL shown by Vite.

---

## 🔐 Environment Variables

For the production WebSocket connection, configure:

```env
VITE_MEHFIL_WS_URL=your_websocket_server_url
```

For local development, use your local WebSocket server URL if required.

---

## 📦 Build for Production

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

---

## 🌐 Live Project

🎧 **Experience the Mehfil:**

https://lnkd.in/gBcuec25

💻 **Source Code:**

https://lnkd.in/gJKg2vKS

---

## 💡 Why I Built This

Ghazals have a unique way of creating an intimate atmosphere.

But finding a Ghazal concert or Mehfil at the right time isn't always easy.

So I wanted to create a small digital space where people can simply open a website, choose a mood, listen to a Ghazal, and feel like they're part of a shared Mehfil.

**No ads. No complicated setup. Just music and people appreciating it together.** ❤️

---

## 🔮 Future Ideas

* 🎤 Live virtual Mehfil sessions
* 🎶 More curated Ghazal collections
* 👥 Listener profiles
* ❤️ Favorite Ghazals
* 📜 Ghazal lyrics
* 🎙️ Artist information
* 🔔 Live Mehfil events
* 📊 Listener statistics

---

## 🤝 Contributing

Contributions, ideas, and feedback are welcome.

If you have an idea that could make the Mehfil better, feel free to open an issue or submit a pull request.

---

## ⭐ Support the Project

If you enjoy the project:

⭐ **Star the repository**

🎶 **Try the live website**

👏 **Share it with another Ghazal lover**

---

## ❤️ Made for Ghazal Lovers

**Mehfil-e-Ghazal**

> *Listen. Feel. Appreciate. Repeat.* 🎶

---
