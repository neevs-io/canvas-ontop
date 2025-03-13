# Canvas OnTop

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/license/mit/)
[![Version](https://img.shields.io/badge/Version-1.0.0-green)](https://github.com/neevs-io/canvas-ontop/releases/tag/v1.0.0)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB?logo=react)](https://react.dev/)

**AI-powered Chrome extension for enhanced Canvas LMS course management**

<div align="center">
<img width="800" alt="Canvas OnTop Preview" src="https://github.com/user-attachments/assets/522ae2a2-6783-4175-96b2-e654f5f64727" />
</div>


## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd canvas-on-top

# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select the dist folder
```

## 🔍 The Problem

College students using Canvas LMS often struggle with:
- Managing assignment deadlines across multiple courses
- Prioritizing competing academic tasks
- Accessing insights that could help improve their learning experience

## 💡 Our Solution

Canvas OnTop seamlessly integrates with Canvas to provide AI-driven organization and insights:

```mermaid
flowchart TD
    Start([Student on Canvas]) --> Activate[Click Canvas OnTop button]
    Activate --> SidePanel[View organized assignments in sidepanel]
    SidePanel --> Focus[Focus on prioritized tasks]
    Focus --> Work[Complete coursework]
    SidePanel -.->|When needed| AIHelp[Get AI assistance]
    AIHelp -.-> Work
    
    classDef start fill:#9370DB,stroke:#333,stroke-width:2px,color:white
    classDef activate fill:#6495ED,stroke:#333,stroke-width:2px,color:white
    classDef sidePanel fill:#20B2AA,stroke:#333,stroke-width:2px,color:white
    classDef focus fill:#E07722,stroke:#333,stroke-width:2px,color:white
    classDef work fill:#4682B4,stroke:#333,stroke-width:2px,color:white
    classDef aiHelp fill:#CD5C5C,stroke:#333,stroke-width:2px,color:white
    
    class Start start
    class Activate activate
    class SidePanel sidePanel
    class Focus focus
    class Work work
    class AIHelp aiHelp
```

## ✨ Key Features

- **AI-Driven Insights**: Personalized weekly focus messages and actionable tips powered by OpenAI's GPT-4o-mini
- **Deadline Management**: Real-time tracking of assignments and discussions due within a fixed weekly window
- **User-Friendly Interface**: Sleek side panel with draggable floating button for seamless integration

## 🛠️ Technical Architecture

Canvas OnTop is built with a modern technical stack:

```mermaid
flowchart TD
    subgraph Extension[Chrome Extension]
        Manifest[Manifest V3]
        Background[Background Script]
        UI[User Interface]
    end
    
    subgraph Frontend[Frontend]
        React[React Components]
        Tailwind[Tailwind CSS]
    end
    
    subgraph Build[Build Tools]
        Vite[Vite]
    end
    
    subgraph Services[External Services]
        Canvas[Canvas API]
        OpenAI[OpenAI API]
    end
    
    Storage[Local Storage]
    
    Manifest --> Background
    Manifest --> UI
    UI --> React
    React --> Tailwind
    Background --> Canvas
    Background --> OpenAI
    React --> Canvas
    React --> OpenAI
    UI --> Storage
    Vite --> React
    
    click Manifest href "https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3" "Chrome Extension Manifest V3 Documentation"
    click Canvas href "https://canvas.instructure.com/doc/api/" "Canvas LMS REST API Documentation"
    click OpenAI href "https://platform.openai.com/docs/overview" "OpenAI API Documentation"
    
    classDef manifest fill:#9370DB,stroke:#333,stroke-width:2px,color:white
    classDef background fill:#6495ED,stroke:#333,stroke-width:2px,color:white
    classDef ui fill:#20B2AA,stroke:#333,stroke-width:2px,color:white
    classDef react fill:#4682B4,stroke:#333,stroke-width:2px,color:white
    classDef tailwind fill:#E07722,stroke:#333,stroke-width:2px,color:white
    classDef vite fill:#CD5C5C,stroke:#333,stroke-width:2px,color:white
    classDef canvas fill:#4169E1,stroke:#333,stroke-width:2px,color:white
    classDef openai fill:#FF6347,stroke:#333,stroke-width:2px,color:white
    classDef storage fill:#32CD32,stroke:#333,stroke-width:2px,color:white
    
    class Manifest manifest
    class Background background
    class UI ui
    class React react
    class Tailwind tailwind
    class Vite vite
    class Canvas canvas
    class OpenAI openai
    class Storage storage
```

### Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React, Tailwind CSS |
| **APIs** | Canvas API, OpenAI API (GPT-4o-mini) |
| **Build** | Chrome Manifest V3, Vite |
| **Storage** | Chrome Local Storage |
| **Dependencies** | `react`, `react-dom`, `react-markdown`, `lucide-react` |

## 📋 Detailed Features

### Canvas API Integration
- Secure OAuth2 authentication
- Fetches courses, assignments, and discussions
- Real-time data synchronization

### Weekly Dashboard
- Shows upcoming and overdue tasks
- Intuitive navigation between weeks
- Visual indicators for priority items

### AI Suggestions
- Personalized task recommendations
- Study tips based on course patterns
- Custom insights for discussions

### Offline Support
- Local storage caching
- Works without constant API calls
- Syncs when connection is restored

## 💻 Installation and Setup

### Prerequisites
- Chrome browser (v88+)
- Node.js (v16+)
- npm (v7+)

### Development Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd canvas-on-top
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

### Loading in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked" and select the `dist` folder

## 🔧 Configuration

After installation, you'll need to configure:

1. Open extension options (right-click extension icon → Options)
2. Enter your Canvas API URL (e.g., `https://yourschool.instructure.com`)
3. Add your Canvas API token ([How to generate a token](https://community.canvaslms.com/t5/Admin-Guide/How-do-I-manage-API-access-tokens-as-an-admin/ta-p/89))
4. Add your OpenAI API key (optional, for AI features)

## 👥 Team

This project was developed as part of ITC4850 Information Technology Project (Spring 2025) at Northeastern University CPS.

| Name | Role |
|------|------|
| **Jackson Gray** | Project Manager |
| **Jonas De Oliveira Neves** | Technical Lead |
| **Shaun Donovan** | Documentation/Quality Lead |
| **Prof. Kurt Brandquist** | Faculty Sponsor |

## 🤝 Contributing

We welcome contributions!

## 📄 License

This project is licensed under the MIT License - see the [MIT License](https://opensource.org/license/mit/) for details.

---

<div align="center">
© 2025 Canvas OnTop Team @ Northeastern University
</div>
