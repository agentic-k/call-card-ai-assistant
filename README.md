# CallCard

An intelligent desktop application for managing and optimizing sales calls with real-time transcription, automated note-taking, and calendar integration.

## Problem Statement

Sales professionals and business development teams often struggle to balance active listening during calls while simultaneously taking comprehensive notes and following structured conversation frameworks. CallCard solves this by providing real-time transcription, automated call structure tracking, and intelligent insights—allowing users to focus entirely on the conversation while the app handles documentation and framework adherence.

## Key Features

- **Real-Time Transcription**: Captures both system audio and microphone input with live speech-to-text conversion
- **Sales Framework Templates**: Built-in support for BANT, MEDDIC, SPIN, and custom call frameworks with automatic progress tracking
- **Google Calendar Integration**: Seamlessly sync meetings, start calls directly from calendar events, and auto-link notes to scheduled meetings
- **Intelligent Text Classification**: AI-powered analysis of conversation content to detect topics, questions, and key discussion points using ML transformers
- **Audio Recording & Storage**: Automatic recording with secure local storage and playback capabilities
- **Cross-Platform Desktop App**: Native macOS/Windows/Linux support with system-level permissions for audio capture

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Radix UI** for accessible component primitives
- **Tailwind CSS** + **Framer Motion** for styling and animations
- **React Router** for navigation
- **Zustand** for state management
- **React Query** for server state

### Desktop Framework
- **Electron 35** for cross-platform desktop runtime
- **Electron Forge** for packaging and distribution
- **electron-audio-loopback** for system audio capture

### Backend & Services
- **Supabase** for authentication, database, and real-time features
- **Google Calendar API** via googleapis
- **Google OAuth 2.0** for calendar permissions
- **@xenova/transformers** for on-device ML text classification

### Audio & Transcription
- **Web Speech API** for speech recognition
- **MediaRecorder API** for audio capture
- Custom audio processing pipeline for dual-stream recording (mic + system)

## Prerequisites

Before installing, ensure you have:

- **Node.js** 18+ and npm (or use the specified Node version in `.nvmrc`)
- **macOS**, Windows, or Linux
- **Google Cloud Project** with Calendar API enabled (for calendar features)
- **Supabase Account** and project (for authentication and data storage)

### Environment Variables Required

Create a `.env.local` file in the project root with:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Configuration
APP_BASE_URL=callcard://  # For production, use your custom protocol
VITE_APP_BASE_URL=http://127.0.0.1:8080  # For development

# Optional: Apple Developer (for macOS distribution)
APPLE_SIGNING_IDENTITY=your_developer_id
APPLE_ID=your_apple_id
APPLE_APP_PASSWORD=your_app_specific_password
APPLE_TEAM_ID=your_team_id
```

**⚠️ SETUP REQUIRED**: You'll need to:
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Enable Google OAuth in your Supabase Auth settings
3. Configure Google Cloud Console with Calendar API and OAuth consent screen
4. Add `callcard://auth/callback` as an authorized redirect URI

## Installation

```bash
# Clone the repository
git clone https://github.com/call-card/call-card.git
cd call-card

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev:electron
```

The app will launch in Electron with hot-reload enabled at `http://127.0.0.1:8080`.

### Building for Production

```bash
# Build for current platform
npm run make

# Build specifically for macOS (Apple Silicon)
npm run electron:build:mac

# Package without distribution
npm run package
```

Built applications will be in the `out/` directory.

## Usage

### Starting a Meeting

1. **Authenticate**: Sign in with Google to enable calendar integration
2. **Grant Permissions**: Allow microphone and screen recording access when prompted (required for transcription)
3. **Select from Calendar**: Navigate to the Calendar view, choose an upcoming meeting, and click "Start Meeting"
4. **Choose Framework**: Select a call framework template (BANT, MEDDIC, etc.) or start with a blank template
5. **Begin Recording**: Click "Start" to begin transcription and audio recording

### During a Call

```
Actions Available:
- Pause/Resume: Temporarily pause transcription
- Navigate Sections: Use arrow keys or click to move through framework sections
- Manual Notes: Type additional context or notes at any time
- Topic Detection: AI automatically highlights key topics and questions
```

### After a Call

- **Review Transcript**: Full searchable transcript with timestamps
- **Export Notes**: Download formatted notes with framework completion status
- **Access Recordings**: Find audio files in `~/Downloads/call-card-recordings/`
- **Sync to Calendar**: Notes automatically linked to calendar event

### Example Commands

```bash
# Development mode with live reload
npm run dev:electron

# Run frontend only (for testing UI without Electron)
npm run dev

# Clean build artifacts
npm run clean

# Generate app icons
npm run create-icon

# Run linter
npm run lint
```

## Architecture

CallCard uses a **hybrid Electron architecture** with separate main and renderer processes. The **Electron main process** handles system-level operations including audio capture (via electron-audio-loopback), microphone/screen permissions, file I/O, and secure IPC communication. The **React renderer process** manages the UI, real-time transcription display, and user interactions, communicating with the main process via IPC channels. **Supabase** serves as the backend, handling user authentication (Google OAuth), persistent storage for meeting notes and templates, and real-time data synchronization. The **Google Calendar API** integration runs in the main process for security, fetching events and creating calendar entries through authenticated requests. On-device ML text classification using Xenova Transformers runs in a Node.js context to analyze transcripts without external API calls.

## System Permissions

### macOS Required Permissions

When first launching, the app will request:

- **Microphone Access**: Required for capturing user speech
- **Screen Recording**: Required for system audio loopback (to capture speaker audio)

Grant these in **System Settings → Privacy & Security**.

### Windows/Linux

Microphone permissions are handled through the OS. No additional screen recording permission needed.

## Project Structure

```
call-card/
├── electron/              # Electron main process
│   ├── main.mjs          # Application entry point
│   ├── ipc.mjs           # IPC handlers
│   ├── authIpc.mjs       # Google OAuth flow
│   ├── permissions.mjs   # System permission management
│   ├── supabaseClient.mjs # Backend client
│   └── utils/            # Audio, transcription, text classification
├── src/                  # React frontend
│   ├── components/       # Reusable UI components
│   ├── pages/           # Route pages (auth, calendar, meeting)
│   ├── hooks/           # Custom React hooks
│   ├── contexts/        # Auth and notification contexts
│   ├── services/        # API services (Google, Supabase, Deepgram)
│   ├── store/           # Zustand stores
│   └── integrations/    # Supabase integration
├── public/              # Static assets (icons, audio processor)
└── documentation/       # Setup and deployment guides
```

## API Integration

### Google Calendar API

**Authentication Flow:**
```javascript
// Handled automatically on "Connect Google Calendar" button
// Uses PKCE flow for desktop OAuth
```

**Fetch Upcoming Events:**
```javascript
import { fetchUpcomingEvents } from '@/services/google-calendar-api-function';

const events = await fetchUpcomingEvents();
// Returns: CalendarEvent[] with id, title, start_time, end_time
```

**Create Calendar Event:**
```javascript
import { createCalendarEvent } from '@/services/google-calendar-api-function';

await createCalendarEvent({
  summary: "Sales Call with Client",
  start: { dateTime: "2024-03-15T10:00:00-07:00" },
  end: { dateTime: "2024-03-15T11:00:00-07:00" },
});
```

### IPC Channels (Electron)

**Text Classification:**
```javascript
// Renderer → Main
window.electron.classifyText({
  text: "What's your budget for this quarter?",
  labels: ["question", "statement", "objection"]
})

// Response
{
  label: "question",
  score: 0.94
}
```

**Audio Recording:**
```javascript
// Start recording
window.electron.startRecording()

// Stop and save
const filePath = await window.electron.stopRecording()
// Returns: ~/Downloads/call-card-recordings/recording-2024-03-15.webm
```

### Supabase Functions

**Meeting Notes Storage:**
```javascript
import { supabase } from '@/integrations/supabase/client';

// Save meeting notes
const { data, error } = await supabase
  .from('meeting_notes')
  .insert({
    user_id: userId,
    calendar_event_id: eventId,
    transcript: fullTranscript,
    framework_data: frameworkProgress,
    created_at: new Date().toISOString()
  });
```

## Known Issues & Limitations

⚠️ **Audio Loopback on macOS**: Requires screen recording permission due to system limitations. This is a macOS security feature, not an app requirement.

⚠️ **Supabase Setup**: Manual database schema setup required. Run migrations in `supabase/migrations/` after creating your project.

⚠️ **Google Cloud Console**: OAuth consent screen must be configured. For development, add test users manually in Google Cloud Console.

## Contributing

This is currently a private project. For questions or collaboration inquiries, please open an issue.

## License

Proprietary - All rights reserved.

---

**Built with Electron + React + Supabase** | Version 0.0.11
