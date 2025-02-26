# Canvas On Top

A Chrome extension that enhances the Canvas Learning Management System (LMS) with AI-powered course management features to help students stay organized and reduce academic stress.

## Overview

"Canvas On Top" integrates with Canvas to provide:
- **AI-Driven Insights**: Personalized weekly focus messages and actionable tips powered by OpenAI's GPT-4o-mini.
- **Deadline Management**: Real-time tracking of assignments and discussions due within a fixed weekly window.
- **User-Friendly Interface**: A sleek side panel built with React and Tailwind CSS, featuring a draggable floating button.

Developed as part of ITC4850 Information Technology Project (Spring 2025) at Northeastern University CPS.

## Features

- **Canvas API Integration**: Fetches course data, assignments, and discussions securely via OAuth2.
- **Weekly Dashboard**: Displays undone tasks with intuitive navigation between weeks.
- **AI Suggestions**: Offers tailored recommendations for assignments and discussions.
- **Offline Support**: Local storage ensures functionality without constant server calls.
- **Configurable**: Settings for Canvas API URL, token, and OpenAI API key via an options page.

## Tech Stack

- **Frontend**: React, Tailwind CSS, Vite
- **APIs**: Canvas API, OpenAI API (GPT-4o-mini)
- **Build**: Chrome Manifest V3, Vite
- **Dependencies**: `react`, `react-dom`, `react-markdown`, `lucide-react`

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd canvas-on-top
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load into Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## Usage

- Configure the extension in the options page with your Canvas API URL, token, and OpenAI API key.
- On a Canvas page, click the floating "Canvas On-Top" button to open the side panel.
- View weekly tasks, mark items as done, and access AI tips by clicking on assignments or discussions.

## Team

- **Jackson Gray**: Project Manager
- **Jonas De Oliveira Neves**: Technical Lead
- **Shaun Donovan**: Documentation/Quality Lead
- **Sponsor**: Prof. Kurt Brandquist

## License

This project is for educational purposes and not licensed for commercial use.
