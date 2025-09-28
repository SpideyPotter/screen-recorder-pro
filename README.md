# Screen Recorder Pro

A professional MERN stack web application for## File Storage

The application uses MongoDB GridFS for efficient video file storage:

- **Chunked Storage**: Large video files are split into chunks
- **Streaming Support**: Range requests for smooth video playback
- **Metadata**: File information stored separately for quick queries

## API Endpoints

### Recordings API

- `GET /api/recordings` - List all recordings with metadata
- `POST /api/recordings` - Upload new recording (multipart/form-data)
- `GET /api/recordings/[id]` - Stream individual recording with range support
- `DELETE /api/recordings/[id]` - Delete recording and associated file

## Browser Support

### Required APIs

- **MediaRecorder API**: For recording functionality
- **Screen Capture API**: For screen sharing
- **getUserMedia API**: For microphone access

### Tested Browsers

- ✅ Chrome 88+
- ✅ Firefox 78+
- ✅ Edge 88+
- ❌ Safari (limited support)

## Development

### Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/recordings/    # API endpoints
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Main page
├── components/            # React components
│   ├── screen-recorder.tsx
│   ├── recordings-list.tsx
│   ├── file-upload.tsx
│   └── ui/               # UI components
├── lib/                  # Utilities and models
│   ├── mongodb.ts        # Database connection
│   └── models/          # Data models
└── scripts/             # Database setup scripts
```

### Key Features Implementation

1. **Screen Recording**: Uses MediaRecorder API with WebM format
2. **Audio Mixing**: Combines system and microphone audio using Web Audio API
3. **File Upload**: Supports drag-and-drop with progress tracking
4. **Video Streaming**: GridFS with range request support for efficient playback
5. **Responsive UI**: Built with Tailwind CSS and shadcn/ui components

## Deployment

### Using Docker

```bash
# Build and start with Docker Compose
docker-compose up --build

# Access the application
open http://localhost:3000
```

### Using Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### Traditional Hosting

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/screen-recorder

# Authentication (optional)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Common Issues

1. **Recording not working**: Check browser permissions for screen sharing
2. **Preview not showing**: Ensure video codecs are supported (WebM/VP9)
3. **Upload failed**: Check MongoDB connection and GridFS configuration
4. **Audio issues**: Verify microphone permissions and audio track availability

### Debug Mode

Enable detailed logging by checking the browser console during recording.

---

**Built with ❤️ using Next.js, MongoDB, and modern web APIs** recording with microphone audio capture, built with Next.js, MongoDB, and modern web APIs.

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

   ```bash
   git clone <repository-url>
   cd screen-recorder-pro
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration:

   ```env
   MONGODB_URI=mongodb://localhost:27017/screen-recorder
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Set up the database**

   ```bash
   npm run setup-db
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## File Storage

The application uses MongoDB GridFS for efficient video file storage:

- **Chunked Storage**: Large video files are split into chunks
- **Streaming Support**: Range requests for smooth video playback
- **Metadata**: File information stored separately for quick queries
