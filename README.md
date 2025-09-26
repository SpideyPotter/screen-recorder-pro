# Screen Recorder Pro

A professional MERN stack web application for screen recording with microphone audio capture, built with Next.js, MongoDB, and modern web APIs.

## Features

- **Screen Recording**: Capture browser tabs with system and microphone audio
- **File Management**: Upload, organize, and manage video recordings
- **Professional UI**: Dark theme with responsive design
- **Advanced Playback**: Video streaming with range request support
- **Search & Filter**: Find recordings quickly with advanced filtering
- **Bulk Operations**: Select and manage multiple recordings
- **Grid/List Views**: Flexible viewing options for your recordings

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with GridFS for file storage


## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- Modern browser with screen capture support (Chrome, Firefox, Edge)

### Local Development

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd screen-recorder-pro
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   
   Edit `.env.local` with your configuration:
   \`\`\`env
   MONGODB_URI=mongodb://localhost:27017/screen-recorder
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   \`\`\`

4. **Set up the database**
   \`\`\`bash
   npm run setup-db
   \`\`\`

5. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)


## File Storage

The application uses MongoDB GridFS for efficient video file storage:

- **Chunked Storage**: Large video files are split into chunks
- **Streaming Support**: Range requests for smooth video playback
- **Metadata**: File information stored separately for quick queries
