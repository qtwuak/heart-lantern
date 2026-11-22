# Heart Lantern 心燈

A calm, interactive mental wellness web application designed for university students. Built with an OLED-dark scrollytelling experience, daily mood and sleep tracking, an anonymous community lantern wall, exam focus tools, and an AI companion.

## Features

* **Scrollytelling Landing Experience:** Smooth-scroll narrative chapters paired with an interactive 3D wireframe background (`Three.js` & `Lenis`).
* **Today & Inner Weather:** Daily check-ins to log mood, stress levels, sleep hours, and personal notes, paired with dynamic lunar phases and streak tracking.
* **Sky Journal & Insights:** Interactive constellation charts, a 5-week mood calendar, and automated sleep-to-mood pattern insights.
* **Anonymous Lantern Wall:** Write and release anonymous thoughts into a shared sky, or send support by lighting others' lanterns.
* **Exam Quest & Focus Tools:** Exam countdowns with study pacing plans, a 25/5 Pomodoro focus timer, daily wellness quests, and guided 4-7-8 / Box breathing exercises.
* **Ze AI Companion:** A supportive conversational companion with built-in crisis safety detection, demo mode, and optional OpenAI / xAI API integration.
* **Cross-Device Sync:** Lightweight Node.js + Express backend that persists sleep logs, check-ins, and chat history across devices using a personal sync code.

## Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript, Three.js, Lenis
* **Backend:** Node.js, Express
* **Storage:** Atomic JSON file persistence & `localStorage` caching

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
