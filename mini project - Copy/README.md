# PEERLINK - Anonymous College Chat App

A progressive web-based chat application designed exclusively for college students, providing a safe, private, and completely anonymous space for communication.

## Features

### Core Features
- **Absolute Anonymity**: No sign-up, login, or registration required
- **Real-Time Chat**: Instant messaging with Socket.IO
- **Channel-Based Conversations**: Multiple public channels for different topics
- **Typing Indicators**: Dynamic typing indicators for better user experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### Channels
- `#general-chat` - General discussions and casual conversations
- `#exam-prep` - Study groups, exam tips, and academic support
- `#campus-events` - Campus activities, events, and announcements
- `#mental-health-support` - A safe space for mental health discussions
- `#buy-and-sell` - Buy, sell, and trade items with fellow students

### UI/UX Theme: "Neon Noir"
- Dark charcoal/deep navy background with vibrant glowing accents
- Electric purple, cyan, and magenta color scheme
- Clean, modern typography with Poppins font
- Minimalist and intuitive layout
- Glowing effects on interactive elements

## Installation & Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Local Development

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd peerlink-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

4. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

### Production Deployment

#### Option 1: Heroku
1. Create a Heroku app
2. Set up environment variables if needed
3. Deploy using Git:
   ```bash
   git push heroku main
   ```

#### Option 2: Railway
1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Node.js app and deploy it

#### Option 3: Render
1. Create a new Web Service on Render
2. Connect your repository
3. Set build command: `npm install`
4. Set start command: `npm start`

#### Option 4: Vercel (with serverless functions)
Note: Socket.IO requires a persistent connection, so Vercel might not be ideal for this app.

## Project Structure

```
peerlink-chat/
├── index.html          # Main HTML file
├── styles.css          # CSS styles with Neon Noir theme
├── script.js           # Frontend JavaScript
├── server.js           # Node.js backend server
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## Technical Details

### Frontend
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Custom Neon Noir theme with animations and responsive design
- **Vanilla JavaScript**: No external frameworks, pure ES6+
- **Socket.IO Client**: Real-time communication

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **Socket.IO**: Real-time bidirectional communication
- **CORS**: Cross-origin resource sharing

### Privacy & Security
- **No Data Storage**: No personal information is stored
- **Anonymous Users**: Random user IDs and colors
- **XSS Protection**: Basic HTML sanitization
- **Stateless Design**: No persistent user sessions

## Usage

1. **Open the app** in your web browser
2. **Choose a channel** from the sidebar
3. **Start chatting** - you'll be assigned a random anonymous identity
4. **Switch channels** anytime to join different conversations
5. **Use settings** to customize your experience

## Admin Features

Basic admin endpoints are available for monitoring:
- `GET /admin/channels` - List all channels and user counts
- `GET /admin/users/:channel` - List users in a specific channel

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please open an issue in the GitHub repository.

---

**PEERLINK** - Study • Chat • Have Fun 🎉

