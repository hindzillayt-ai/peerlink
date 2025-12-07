const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 10e6
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
];

const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|mp4|webm|pdf|doc|docx|txt)$/i;

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const extValid = allowedExtensions.test(file.originalname);
        const mimeValid = allowedMimeTypes.includes(file.mimetype);
        
        if (extValid && mimeValid) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only images, videos, PDFs, and documents are allowed.'));
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 
                    req.file.mimetype.startsWith('video/') ? 'video' : 'file';
    
    res.json({
        success: true,
        fileUrl: fileUrl,
        fileName: req.file.originalname,
        fileType: fileType,
        fileSize: req.file.size
    });
});

const activeUsers = new Map();
const channelUsers = new Map();
const typingUsers = new Map();
const messageReactions = new Map();
const userRizz = new Map();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('joinChannel', (data) => {
        const { channel, visibleId, userColor, anonymousId } = data;
        
        if (activeUsers.has(socket.id)) {
            const prevChannel = activeUsers.get(socket.id).channel;
            leaveChannel(socket, prevChannel);
        }

        socket.join(channel);
        activeUsers.set(socket.id, { visibleId, anonymousId, userColor, channel });
        
        if (!channelUsers.has(channel)) {
            channelUsers.set(channel, new Set());
        }
        channelUsers.get(channel).add(socket.id);

        socket.to(channel).emit('userJoined', { visibleId: anonymousId, userColor });
        
        const userCount = channelUsers.get(channel).size;
        const onlineList = getOnlineUsersList(channel);
        io.to(channel).emit('userCount', userCount);
        io.to(channel).emit('onlineUsersList', onlineList);

        console.log(`${anonymousId} joined channel ${channel}`);
    });

    socket.on('leaveChannel', (data) => {
        const { channel } = data;
        leaveChannel(socket, channel);
    });

    socket.on('message', (data) => {
        const { text, visibleId, anonymousId, userColor, channel, timestamp, media, replyTo, sticker } = data;
        
        if ((!text && !media && !sticker) || !channel) {
            return;
        }

        let sanitizedText = '';
        if (text) {
            sanitizedText = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
        
        const messageId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const messageData = {
            id: messageId,
            text: sanitizedText,
            visibleId,
            anonymousId,
            userColor,
            channel,
            timestamp: timestamp || new Date(),
            media: media || null,
            replyTo: replyTo || null,
            sticker: sticker || null
        };

        io.to(channel).emit('message', messageData);
        
        if (sticker) {
            console.log(`Sticker in ${channel} from ${anonymousId}: ${sticker.isEmoji ? sticker.emoji : '[custom sticker]'}`);
        } else {
            console.log(`Message in ${channel} from ${anonymousId}: ${sanitizedText.substring(0, 50)}...`);
        }
    });

    socket.on('addReaction', (data) => {
        const { messageId, emoji, visibleId, channel } = data;
        
        const key = `${channel}-${messageId}`;
        if (!messageReactions.has(key)) {
            messageReactions.set(key, new Map());
        }
        
        const reactions = messageReactions.get(key);
        if (!reactions.has(emoji)) {
            reactions.set(emoji, new Set());
        }
        
        const emojiReactions = reactions.get(emoji);
        if (emojiReactions.has(visibleId)) {
            emojiReactions.delete(visibleId);
        } else {
            emojiReactions.add(visibleId);
        }
        
        const reactionData = {};
        reactions.forEach((users, emoji) => {
            if (users.size > 0) {
                reactionData[emoji] = users.size;
            }
        });
        
        io.to(channel).emit('reactionUpdate', { messageId, reactions: reactionData });
    });

    socket.on('typing', (data) => {
        const { visibleId, channel } = data;
        
        if (!typingUsers.has(channel)) {
            typingUsers.set(channel, new Set());
        }
        
        typingUsers.get(channel).add(visibleId);
        socket.to(channel).emit('typing', { visibleId });
        
        setTimeout(() => {
            if (typingUsers.has(channel)) {
                typingUsers.get(channel).delete(visibleId);
                socket.to(channel).emit('stopTyping');
            }
        }, 3000);
    });

    socket.on('stopTyping', (data) => {
        const { channel } = data;
        const userData = activeUsers.get(socket.id);
        
        if (userData && typingUsers.has(channel)) {
            typingUsers.get(channel).delete(userData.visibleId);
            socket.to(channel).emit('stopTyping');
        }
    });

    socket.on('giveRizz', (data) => {
        const { targetVisibleId, channel } = data;
        const currentRizz = userRizz.get(targetVisibleId) || 0;
        userRizz.set(targetVisibleId, currentRizz + 1);
        io.to(channel).emit('rizzUpdate', { visibleId: targetVisibleId, rizzCount: currentRizz + 1 });
        
        const onlineList = getOnlineUsersList(channel);
        io.to(channel).emit('onlineUsersList', onlineList);
        
        console.log(`${targetVisibleId} received rizz! Total: ${currentRizz + 1}`);
    });

    socket.on('requestRizz', (data) => {
        const { visibleId } = data;
        const rizzCount = userRizz.get(visibleId) || 0;
        socket.emit('rizzUpdate', { visibleId, rizzCount });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        if (activeUsers.has(socket.id)) {
            const { channel } = activeUsers.get(socket.id);
            leaveChannel(socket, channel);
            activeUsers.delete(socket.id);
        }
    });
});

function getOnlineUsersList(channel) {
    const users = [];
    if (channelUsers.has(channel)) {
        channelUsers.get(channel).forEach(socketId => {
            const userData = activeUsers.get(socketId);
            if (userData) {
                users.push({
                    visibleId: userData.anonymousId,
                    userColor: userData.userColor,
                    rizzCount: userRizz.get(userData.anonymousId) || 0
                });
            }
        });
    }
    return users;
}

function leaveChannel(socket, channel) {
    if (!channel || !channelUsers.has(channel)) {
        return;
    }

    const userData = activeUsers.get(socket.id);
    if (userData) {
        socket.to(channel).emit('userLeft', { visibleId: userData.anonymousId });
        
        if (typingUsers.has(channel)) {
            typingUsers.get(channel).delete(userData.visibleId);
        }
    }

    channelUsers.get(channel).delete(socket.id);
    
    const userCount = channelUsers.get(channel).size;
    const onlineList = getOnlineUsersList(channel);
    io.to(channel).emit('userCount', userCount);
    io.to(channel).emit('onlineUsersList', onlineList);
    
    socket.leave(channel);
}

app.get('/admin/channels', (req, res) => {
    const channels = Array.from(channelUsers.keys()).map(channel => ({
        name: channel,
        userCount: channelUsers.get(channel).size
    }));
    res.json(channels);
});

app.get('/admin/users/:channel', (req, res) => {
    const { channel } = req.params;
    res.json(getOnlineUsersList(channel));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`PEERLINK server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the app`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
