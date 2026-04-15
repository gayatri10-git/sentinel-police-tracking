# SENTINEL 🛡️
### Smart Emergency Response & Tactical Dispatch Platform

SENTINEL is a real-time command and control system designed to streamline emergency reporting and law enforcement dispatch. By integrating advanced multimodal analysis with live data synchronization, the platform enables faster triage, optimized resource allocation, and enhanced situational awareness for first responders.

---

## 🚀 Key Features

### 1. Multimodal Incident Triage
*   **Visual Analysis:** Automatically processes incident photos to identify hazards, severity, and incident types.
*   **Voice Processing:** Converts and analyzes emergency voice reports into structured data for immediate action.

### 2. Smart Dispatch Engine
*   **Automated Recommendations:** Uses intelligent logic to suggest the best-suited units based on proximity, current status, and historical expertise.
*   **Resource Optimization:** Minimizes response times by analyzing fleet-wide availability in real-time.

### 3. Real-Time Command Center
*   **Live Tracking:** Interactive dashboard for administrators to monitor active incidents and officer locations.
*   **Tactical Briefings:** Generates concise, safety-focused summaries for officers en route to a scene.

### 4. Operational Intelligence
*   **Data-Driven Insights:** Natural language interface for querying operational data, incident trends, and resource efficiency.
*   **Incident Archives:** Comprehensive logging of all resolved cases for post-action review and reporting.

---

## 🛠️ Tech Stack

*   **Frontend:** React 18+, Tailwind CSS, Framer Motion (Animations), Recharts (Analytics)
*   **Backend:** Node.js, Express
*   **Real-time Database:** Firebase Firestore
*   **Authentication:** Firebase Auth (Google OAuth)
*   **Intelligence Layer:** Multimodal Large Language Models (LLMs) for automated triage and report generation.

---

## ⚙️ Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   Firebase Project

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/sentinel.git
   cd sentinel
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the root directory and add your credentials:
   ```env
   # Intelligence API Key
   API_KEY="your_api_key_here"
   
   # Maps Integration
   VITE_GOOGLE_MAPS_API_KEY="your_maps_key_here"
   ```

4. **Firebase Configuration:**
   Ensure your `firebase-applet-config.json` is present in the root directory with your project details.

5. **Run the application:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

---

## 🛡️ Security & Architecture
*   **Role-Based Access Control (RBAC):** Distinct interfaces and permissions for Citizens, Officers, and Administrators.
*   **Data Integrity:** Secure Firestore rules ensure that sensitive incident data is only accessible to authorized personnel.
*   **Scalable Design:** Built with a modular architecture to support rapid deployment and future feature expansion.

---
