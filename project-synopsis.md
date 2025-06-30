Here's your fully updated and polished **Project Synopsis for Callivate**, now including **Tailwind CSS** (likely for web styling or future PWA/electron UI, if used). This version is comprehensive and production-ready.

---

# 📱 Project Synopsis: **Callivate**

---

## 🔷 Overview

**App Name:** Callivate
**Platform:** Mobile App (React Native with Expo)
**Core Idea:**
Callivate is a voice-first productivity app that uses AI-generated voice calls to remind users about their tasks, track task completion, and help build daily consistency through intelligent follow-ups and habit streaks.

---

## 🎯 Objective

To help users **stay accountable and build daily habits** using real-time, AI-powered voice calls — supported by reminders, personalized voices, streak tracking, and smart notifications.

---

## 🔑 Key Features

### 🔔 AI Reminder Calls

* Scheduled voice calls at exact time
* Gemini AI asks if the task is completed
* Processes response and updates task status
* Every call starts with: “This is an AI-generated call from Callivate”

### 🔁 Follow-Up Logic

* One follow-up call is triggered if the task isn’t marked complete
* If still incomplete → sends notification + breaks streak
* Missed or cut calls → fallback notification: “Did you complete your task?”

### 🛎️ Notifications System

* Push/local notification sent if:

  * Follow-up fails
  * User misses call
  * Task is scheduled within 5 minutes of current time (calls skipped)

### 🔁 Recurring Tasks

* Users can create recurring tasks: Daily, Weekly, or Custom

### 🔥 Streak System

* Tracks daily consistency streak
* Breaks if task is not completed even after follow-up
* Streaks are visualized in a color-coded calendar

### 📅 Streak Calendar

* Monthly calendar shows:

  * ✅ Completed (Green)
  * ❌ Missed (Red)
  * ⏳ Pending (Yellow)
* Streak and high score tracker

### 📊 Analytics (Post-Month)

* Becomes visible at month-end
* Includes:

  * Tasks completed
  * Missed tasks
  * Most-used voice
  * Longest streak
  * Completion rate

### 📝 Notes Section

* Minimal notes editor
* Formatting options:

  * Change font
  * Font size
  * Text color
* No export or sync needed

### 🔉 Voice Options

* Choose from preloaded AI voice templates
* Silent mode available (replaces call with notification)

### 🔐 Privacy Features

* Clear call history
* Reset streaks
* Delete all notes
* Adult/inappropriate input filtering via AI + keyword rules

### 📴 Offline Behavior

* If user is offline during scheduled time → local notification fallback
* All reminders use device’s local time

---

## 🛠️ Tech Stack

### Frontend

* **React Native (Expo CLI)** – mobile development
* **React Navigation** – screen management
* **React Native Calendars** – calendar streaks
* **Tailwind CSS (via NativeWind)** – styling
* **Expo Notifications** – local & push notifications

### Backend

* **FastAPI** – REST API for task logic, AI routing, follow-ups
* **Python** – core logic, processing, and streak management

### AI & Voice

* **Gemini 1.5 Pro** – conversational AI for task check-ins
* **Google STT** – voice response recognition
* **Google TTS** – AI voice synthesis
* **Twilio / Exotel** – voice call integration

### Auth & Database

* **Supabase**

  * Google-only login
  * Tables: Tasks, Notes, Users, Voices, Streaks, Analytics

---

## 🧭 App Flow & Screens

| Screen                             | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| **Splash**                         | Logo and brand load screen                           |
| **Onboarding Carousel**            | App introduction in 3–4 slides                       |
| **Login**                          | Google Auth (Supabase)                               |
| **Dashboard**                      | Greeting, streak, today’s tasks, Create Task button  |
| **Create Task**                    | Task title, time, recurrence, voice/silent mode      |
| **Edit/Delete Task**               | Modify or remove any task                            |
| **Task Execution (Backend)**       | Call logic handled by Gemini AI                      |
| **Follow-Up Notifications**        | Triggered after missed/cut/failed calls              |
| **Streak Calendar**                | View monthly performance                             |
| **Stats (End of Month)**           | View streak data and insights                        |
| **Notes**                          | Rich text editor with font, size, and color settings |
| **Settings**                       | Voice preferences, silent mode, privacy tools        |
| **Notification Permission Prompt** | Shown post-onboarding/login                          |

---

## 🔄 Task Flow Summary

1. User creates task with title, time, voice preference
2. At scheduled time:

   * Call placed if >5 minutes away
   * Notification sent if offline or task is <5 min away
3. Gemini AI checks task status
4. Based on response:

   * ✅ Mark complete
   * ❌ Schedule follow-up
   * Missed → fallback notification
5. If not completed → break streak + notify
6. Update calendar + analytics

---

## 📛 Branding

**Name:** Callivate
**Meaning:** “Call” + “Motivate”
**Slogan:** *Stay consistent with your goals — one AI-powered call at a time.*

---

## ✅ MVP Scope Completed

| Feature                             | Status |
| ----------------------------------- | ------ |
| Google Login (Supabase)             | ✅      |
| Task Creation & Reminders           | ✅      |
| Gemini AI call handling             | ✅      |
| Follow-up & fallback logic          | ✅      |
| Notification permissions & handling | ✅      |
| Streaks + visual calendar           | ✅      |
| Stats screen (monthly)              | ✅      |
| AI voice selection                  | ✅      |
| Notes editor with styling           | ✅      |
| Privacy controls                    | ✅      |
| Tailwind CSS for styling            | ✅      |

---

Would you like:

* A downloadable PDF version of this?
* Project roadmap (Notion or GitHub)?
* Figma UI wireframes for each screen?

You’ve now got a fully specced AI-powered productivity app with clear scope, features, tech, and flow — ready to build.
