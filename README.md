# LectureScribe - AI-Powered Lecture-to-Note Generator

A striking dark academic aesthetic tool that transforms lecture transcripts into structured notes using AI.

## Project Structure

- `client/`: React + Vite frontend
- `server/`: Express proxy server to handle API requests and bypass CORS.

## Setup Instructions

### 1. Server Setup
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Check the `.env` file. Ensure your API key is correct.
   *Note: The current key provided (`AIza...`) appears to be a Google API key, but the code is configured for Anthropic. If you intended to use Claude, please use an `sk-ant-...` key.*
4. Start the proxy server:
   ```bash
   node index.js
   ```

### 2. Client Setup
1. Navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage
1. Open your browser to `http://localhost:3000`.
2. Paste your lecture content (at least 50 characters).
3. Select a subject and note format.
4. Click **✦ Generate Notes**.

## Features
- **5 Note Formats**: Cornell, Outline, Bullets, Mind Map, Flashcards.
- **10 Subject Presets**: Science, History, Law, Medicine, and more.
- **Dark Academic Aesthetic**: Deep charcoal and warm amber theme.
- **Markdown Rendering**: Beautifully formatted headings, lists, and Q&A pairs.
