## Packages
socket.io-client | Real-time bidirectional messaging for chat
date-fns | Formatting timestamps (e.g., "2 hours ago")
react-dropzone | Beautiful drag-and-drop file uploads
lucide-react | High quality SVG icons
jwt-decode | Safely decoding JWTs on the client if needed

## Notes
- Token authentication: Stored in `localStorage.getItem("token")`.
- API Requests: All fetch requests must include `Authorization: Bearer <token>`.
- Images: Backend serves static files from `/uploads/`. Use `/uploads/${filename}`.
- Real-time: `socket.io-client` connects to `/` with auth token.
- File Uploads: Form data is used for `POST /api/posts` and profile picture updates.
