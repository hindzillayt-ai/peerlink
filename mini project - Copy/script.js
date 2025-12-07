class PeerLinkApp {
    constructor() {
        this.socket = null;
        this.currentChannel = 'general-chat';
        
        const loginData = this.loadLoginData();
        this.realName = loginData ? loginData.studentName : null;
        this.visibleId = this.generateAnonymousId();
        
        this.userColor = this.generateUserColor();
        this.isTyping = false;
        this.typingTimeout = null;
        this.onlineUsers = new Set();
        this.chatHistory = this.loadChatHistory();
        this.currentEmojiCategory = 'smileys';
        this.replyingTo = null;
        this.pendingMedia = null;
        this.soundEnabled = true;
        
        this.currentStickerCategory = 'favorites';
        this.customStickers = this.loadCustomStickers();
        this.favoriteStickers = this.loadFavoriteStickers();
        
        this.userRizzCounts = new Map();
        this.myRizzCount = parseInt(localStorage.getItem('peerlink_rizz_count')) || 0;
        this.defaultStickers = [
            { id: 'default-1', emoji: '😀', isEmoji: true },
            { id: 'default-2', emoji: '😂', isEmoji: true },
            { id: 'default-3', emoji: '🤣', isEmoji: true },
            { id: 'default-4', emoji: '😍', isEmoji: true },
            { id: 'default-5', emoji: '🥰', isEmoji: true },
            { id: 'default-6', emoji: '😎', isEmoji: true },
            { id: 'default-7', emoji: '🤯', isEmoji: true },
            { id: 'default-8', emoji: '🥳', isEmoji: true },
            { id: 'default-9', emoji: '😭', isEmoji: true },
            { id: 'default-10', emoji: '🔥', isEmoji: true },
            { id: 'default-11', emoji: '💯', isEmoji: true },
            { id: 'default-12', emoji: '👍', isEmoji: true },
            { id: 'default-13', emoji: '👎', isEmoji: true },
            { id: 'default-14', emoji: '❤️', isEmoji: true },
            { id: 'default-15', emoji: '💀', isEmoji: true },
            { id: 'default-16', emoji: '🙌', isEmoji: true }
        ];
        
        this.init();
    }
    
    loadLoginData() {
        try {
            const loginData = sessionStorage.getItem('peerlink_login');
            return loginData ? JSON.parse(loginData) : null;
        } catch (error) {
            console.error('Error loading login data:', error);
            return null;
        }
    }

    init() {
        this.setupEventListeners();
        this.connectToServer();
        this.updateChannelInfo();
        this.updateOnlineCount();
        this.updateUserDisplay();
        this.initializeEmojiPicker();
        this.initializeStickerPicker();
        this.loadSettings();
        
        setTimeout(() => {
            this.loadChannelHistory();
        }, 1000);
    }

    generateAnonymousId() {
        const adjectives = ['Sussy', 'Lowkey', 'Highkey', 'NoCappin', 'Ongod', 'Bussin', 'Goated', 'Based', 'Cracked', 'Valid', 'Dripped', 'Savage', 'Menace', 'Unhinged', 'Chaotic', 'Sneaky', 'Slay', 'Sigma', 'Alpha', 'Rizzy'];
        const nouns = ['Suspect', 'Goblin', 'Demon', 'Legend', 'Imposter', 'Menace', 'Villain', 'Boss', 'King', 'Queen', 'Joker', 'Gremlin', 'Chaos', 'Vibe', 'Energy', 'Phantom', 'Ghost', 'Shadow', 'Flex', 'Drip'];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 999) + 1;
        return `${adjective}${noun}${number}`;
    }

    generateUserColor() {
        const colors = [
            '#8A2BE2', '#00BFFF', '#FF6B6B', '#4ECDC4', '#45B7D1',
            '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
            '#FF69B4', '#20B2AA', '#FF7F50', '#9370DB', '#3CB371'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    connectToServer() {
        try {
            this.socket = io(window.location.origin, {
                transports: ['websocket', 'polling'],
                path: '/socket.io/'
            });
            
            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.joinChannel(this.currentChannel);
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.showNotification('Connection error. Please refresh the page.');
            });

            this.socket.on('message', (data) => {
                this.displayMessage(data);
                if (data.visibleId !== this.visibleId) {
                    this.playNotificationSound();
                }
            });

            this.socket.on('userJoined', (data) => {
                this.onlineUsers.add(data.visibleId);
                this.updateOnlineCount();
                this.showNotification(`${data.visibleId} joined the channel`);
            });

            this.socket.on('userLeft', (data) => {
                this.onlineUsers.delete(data.visibleId);
                this.updateOnlineCount();
                this.showNotification(`${data.visibleId} left the channel`);
            });

            this.socket.on('typing', (data) => {
                this.showTypingIndicator(data.visibleId);
            });

            this.socket.on('stopTyping', () => {
                this.hideTypingIndicator();
            });

            this.socket.on('userCount', (count) => {
                this.updateOnlineCount(count);
            });

            this.socket.on('onlineUsersList', (users) => {
                this.updateOnlineUsersList(users);
            });

            this.socket.on('reactionUpdate', (data) => {
                this.updateMessageReactions(data.messageId, data.reactions);
            });

            this.socket.on('rizzUpdate', (data) => {
                this.userRizzCounts.set(data.visibleId, data.rizzCount);
                if (data.visibleId === this.visibleId) {
                    this.myRizzCount = data.rizzCount;
                    localStorage.setItem('peerlink_rizz_count', data.rizzCount.toString());
                    this.updateUserDisplay();
                    const rizzElement = document.getElementById('user-rizz');
                    if (rizzElement) {
                        rizzElement.classList.add('rizz-received-animation');
                        setTimeout(() => rizzElement.classList.remove('rizz-received-animation'), 600);
                    }
                }
                this.updateAllRizzBadges();
            });
        } catch (error) {
            console.error('Failed to initialize socket:', error);
            this.showNotification('Failed to connect to server. Please check your connection.');
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.channel').forEach(channel => {
            channel.addEventListener('click', (e) => {
                const channelName = e.currentTarget.dataset.channel;
                this.switchChannel(channelName);
            });
        });

        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        messageInput.addEventListener('input', () => {
            this.handleTyping();
            this.autoResizeTextarea();
        });

        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        const settingsBtn = document.querySelector('.settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettings = document.getElementById('close-settings');

        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('show');
        });

        closeSettings.addEventListener('click', () => {
            settingsModal.classList.remove('show');
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('show');
            }
        });

        const attachBtn = document.getElementById('attach-btn');
        const fileInput = document.getElementById('file-input');
        
        attachBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });

        const cancelMedia = document.getElementById('cancel-media');
        cancelMedia.addEventListener('click', () => {
            this.cancelMediaUpload();
        });

        const cancelReply = document.getElementById('cancel-reply');
        cancelReply.addEventListener('click', () => {
            this.cancelReply();
        });

        document.getElementById('emoji-btn').addEventListener('click', () => {
            this.openEmojiPicker();
        });

        document.getElementById('close-emoji').addEventListener('click', () => {
            document.getElementById('emoji-modal').classList.remove('show');
        });

        document.querySelectorAll('.emoji-category').forEach(category => {
            category.addEventListener('click', (e) => {
                document.querySelectorAll('.emoji-category').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                this.currentEmojiCategory = e.target.dataset.category;
                this.populateEmojiGrid();
            });
        });

        document.getElementById('emoji-modal').addEventListener('click', (e) => {
            if (e.target.id === 'emoji-modal') {
                document.getElementById('emoji-modal').classList.remove('show');
            }
        });

        const imageModal = document.getElementById('image-modal');
        const closeImage = document.getElementById('close-image');
        
        closeImage.addEventListener('click', () => {
            imageModal.classList.remove('show');
        });

        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                imageModal.classList.remove('show');
            }
        });

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        const soundEffectsCheckbox = document.getElementById('sound-effects');
        if (soundEffectsCheckbox) {
            soundEffectsCheckbox.addEventListener('change', (e) => {
                this.soundEnabled = e.target.checked;
                localStorage.setItem('peerlink_sound', this.soundEnabled);
            });
        }

        const stickerBtn = document.getElementById('sticker-btn');
        if (stickerBtn) {
            stickerBtn.addEventListener('click', () => {
                this.openStickerPicker();
            });
        }

        const closeSticker = document.getElementById('close-sticker');
        if (closeSticker) {
            closeSticker.addEventListener('click', () => {
                document.getElementById('sticker-modal').classList.remove('show');
            });
        }

        document.querySelectorAll('.sticker-category').forEach(category => {
            category.addEventListener('click', (e) => {
                document.querySelectorAll('.sticker-category').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentStickerCategory = e.currentTarget.dataset.category;
                this.populateStickerGrid();
            });
        });

        const addStickerBtn = document.getElementById('add-sticker-btn');
        if (addStickerBtn) {
            addStickerBtn.addEventListener('click', () => {
                document.getElementById('sticker-upload-input').click();
            });
        }

        const stickerUploadInput = document.getElementById('sticker-upload-input');
        if (stickerUploadInput) {
            stickerUploadInput.addEventListener('change', (e) => {
                this.handleStickerUpload(e);
            });
        }

        const stickerModal = document.getElementById('sticker-modal');
        if (stickerModal) {
            stickerModal.addEventListener('click', (e) => {
                if (e.target.id === 'sticker-modal') {
                    stickerModal.classList.remove('show');
                }
            });
        }
    }

    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('File size must be less than 10MB');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.pendingMedia = {
                    url: result.fileUrl,
                    name: result.fileName,
                    type: result.fileType,
                    size: result.fileSize
                };
                this.showMediaPreview();
            } else {
                this.showNotification('Failed to upload file');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Failed to upload file');
        }

        e.target.value = '';
    }

    showMediaPreview() {
        const preview = document.getElementById('media-preview');
        const previewImage = document.getElementById('preview-image');
        const fileName = document.getElementById('media-file-name');

        if (this.pendingMedia.type === 'image') {
            previewImage.src = this.pendingMedia.url;
            previewImage.style.display = 'block';
        } else {
            previewImage.style.display = 'none';
        }

        fileName.textContent = this.pendingMedia.name;
        preview.style.display = 'flex';
    }

    cancelMediaUpload() {
        this.pendingMedia = null;
        document.getElementById('media-preview').style.display = 'none';
    }

    setReplyTo(messageData) {
        this.replyingTo = messageData;
        const preview = document.getElementById('reply-preview');
        const previewText = preview.querySelector('.reply-preview-text');
        
        previewText.textContent = `Replying to ${messageData.visibleId}: ${messageData.text || '[Media]'}`;
        preview.style.display = 'flex';
        
        document.getElementById('message-input').focus();
    }

    cancelReply() {
        this.replyingTo = null;
        document.getElementById('reply-preview').style.display = 'none';
    }

    switchChannel(channelName) {
        if (channelName === this.currentChannel) return;

        this.socket.emit('leaveChannel', { channel: this.currentChannel });

        document.querySelectorAll('.channel').forEach(channel => {
            channel.classList.remove('active');
        });
        document.querySelector(`[data-channel="${channelName}"]`).classList.add('active');

        this.currentChannel = channelName;
        this.clearMessages();
        this.loadChannelHistory();
        this.joinChannel(channelName);
        this.updateChannelInfo();
    }

    joinChannel(channelName) {
        if (!this.socket || !this.socket.connected) {
            console.warn('Socket not connected, cannot join channel');
            return;
        }
        
        this.socket.emit('joinChannel', { 
            channel: channelName,
            visibleId: this.visibleId,
            anonymousId: this.visibleId,
            userColor: this.userColor
        });
        
        this.socket.emit('requestRizz', { visibleId: this.visibleId });
    }

    giveRizz(targetVisibleId) {
        if (targetVisibleId === this.visibleId) {
            this.showNotification("You can't give rizz to yourself!");
            return;
        }
        if (!this.socket || !this.socket.connected) {
            this.showNotification('Not connected to server');
            return;
        }
        this.socket.emit('giveRizz', {
            targetVisibleId: targetVisibleId,
            channel: this.currentChannel
        });
        this.showNotification(`You gave rizz to ${targetVisibleId}! 🔥`);
    }

    getRizzLevel(count) {
        if (count > 100) return { icon: '⭐', level: 'legendary', name: 'Legendary' };
        if (count >= 51) return { icon: '💎', level: 'diamond', name: 'Diamond' };
        if (count >= 31) return { icon: '👑', level: 'gold', name: 'Gold' };
        if (count >= 16) return { icon: '🔥', level: 'silver', name: 'Silver' };
        if (count >= 6) return { icon: '⚡', level: 'bronze', name: 'Bronze' };
        return null;
    }

    getRizzBadgeHTML(visibleId) {
        const rizzCount = this.userRizzCounts.get(visibleId) || 0;
        const level = this.getRizzLevel(rizzCount);
        if (!level) return '';
        return `<span class="rizz-badge ${level.level}" title="${level.name} - ${rizzCount} Rizz">${level.icon}</span>`;
    }

    updateAllRizzBadges() {
        document.querySelectorAll('.message').forEach(msgEl => {
            const senderEl = msgEl.querySelector('.message-sender');
            if (senderEl) {
                const existingBadge = senderEl.querySelector('.rizz-badge');
                if (existingBadge) existingBadge.remove();
                const textContent = senderEl.textContent.replace(' (You)', '').trim();
                const badgeHTML = this.getRizzBadgeHTML(textContent);
                if (badgeHTML) senderEl.insertAdjacentHTML('beforeend', ' ' + badgeHTML);
            }
        });
    }

    updateChannelInfo() {
        const channelNames = {
            'general-chat': { name: 'general-chat', desc: 'General discussions and casual conversations' },
            'exam-prep': { name: 'exam-prep', desc: 'Study groups, exam tips, and academic support' },
            'campus-events': { name: 'campus-events', desc: 'Campus activities, events, and announcements' },
            'mental-health-support': { name: 'mental-health-support', desc: 'A safe space for mental health discussions' },
            'buy-and-sell': { name: 'buy-and-sell', desc: 'Buy, sell, and trade items with fellow students' }
        };

        const channelInfo = channelNames[this.currentChannel];
        document.querySelector('.channel-name').textContent = `# ${channelInfo.name}`;
        document.querySelector('.channel-description').textContent = channelInfo.desc;

        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.innerHTML = `
                <h3>Welcome to # ${channelInfo.name}!</h3>
                <p>${channelInfo.desc}</p>
                <p>Be the first to start the fun! Drop a message, share a meme, or just say hi!</p>
            `;
        }
    }

    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();

        if (!message && !this.pendingMedia) return;

        if (!this.socket || !this.socket.connected) {
            this.showNotification('Not connected to server. Please refresh the page.');
            return;
        }

        const mediaToSend = this.pendingMedia ? { ...this.pendingMedia } : null;
        const replyToSend = this.replyingTo ? {
            id: this.replyingTo.id,
            visibleId: this.replyingTo.visibleId,
            text: this.replyingTo.text,
            userColor: this.replyingTo.userColor
        } : null;

        const messageData = {
            text: message,
            visibleId: this.visibleId,
            anonymousId: this.visibleId,
            userColor: this.userColor,
            channel: this.currentChannel,
            timestamp: new Date(),
            media: mediaToSend,
            replyTo: replyToSend
        };

        this.cancelMediaUpload();
        this.cancelReply();
        
        this.socket.emit('message', messageData);
        messageInput.value = '';
        this.autoResizeTextarea();
        this.stopTyping();
    }

    displayMessage(data) {
        this.addToHistory(data);
        
        if (data.channel !== this.currentChannel) return;

        const messagesContainer = document.getElementById('messages');
        const welcomeMessage = document.querySelector('.welcome-message');
        
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message fade-in';
        messageElement.dataset.messageId = data.id;
        
        const timeString = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const displayName = data.visibleId || data.anonymousId;
        const isOwnMessage = displayName === this.visibleId;
        
        let replyHtml = '';
        if (data.replyTo) {
            const replyColor = data.replyTo.userColor || '#8A2BE2';
            replyHtml = `
                <div class="reply-quote" style="border-left-color: ${replyColor}; background: linear-gradient(90deg, ${replyColor}20 0%, transparent 100%);" onclick="app.scrollToMessage('${data.replyTo.id}')" title="Click to jump to message">
                    <div class="reply-quote-sender" style="color: ${replyColor}">${this.escapeHtml(data.replyTo.visibleId)}</div>
                    <div class="reply-quote-text">${this.escapeHtml(data.replyTo.text || '[Media]')}</div>
                </div>
            `;
        }
        
        let mediaHtml = '';
        if (data.media) {
            if (data.media.type === 'image') {
                mediaHtml = `
                    <div class="message-media">
                        <img src="${data.media.url}" alt="${data.media.name}" onclick="app.openImageModal('${data.media.url}')">
                    </div>
                `;
            } else if (data.media.type === 'video') {
                mediaHtml = `
                    <div class="message-media">
                        <video src="${data.media.url}" controls></video>
                    </div>
                `;
            } else {
                const fileSize = this.formatFileSize(data.media.size);
                mediaHtml = `
                    <div class="message-file">
                        <i class="fas fa-file"></i>
                        <div class="message-file-info">
                            <div class="message-file-name">${this.escapeHtml(data.media.name)}</div>
                            <div class="message-file-size">${fileSize}</div>
                        </div>
                        <a href="${data.media.url}" download class="action-btn" style="width:30px;height:30px;">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                `;
            }
        }

        let stickerHtml = '';
        if (data.sticker) {
            if (data.sticker.isEmoji) {
                stickerHtml = `
                    <div class="message-sticker">
                        <span class="sticker-display-emoji">${data.sticker.emoji}</span>
                    </div>
                `;
            } else {
                stickerHtml = `
                    <div class="message-sticker">
                        <img src="${data.sticker.url}" alt="Sticker" class="sticker-display-image" onclick="app.openImageModal('${data.sticker.url}')">
                    </div>
                `;
            }
        }
        
        const rizzBadge = this.getRizzBadgeHTML(displayName);
        
        messageElement.innerHTML = `
            <div class="quick-reactions">
                <button class="quick-reaction" onclick="app.addReaction('${data.id}', '&#128077;')">&#128077;</button>
                <button class="quick-reaction" onclick="app.addReaction('${data.id}', '&#10084;&#65039;')">&#10084;&#65039;</button>
                <button class="quick-reaction" onclick="app.addReaction('${data.id}', '&#128514;')">&#128514;</button>
                <button class="quick-reaction" onclick="app.addReaction('${data.id}', '&#128558;')">&#128558;</button>
                <button class="quick-reaction" onclick="app.addReaction('${data.id}', '&#128293;')">&#128293;</button>
            </div>
            <div class="message-avatar" style="background-color: ${data.userColor}">
                ${displayName.charAt(0).toUpperCase()}
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender" style="color: ${data.userColor}">${displayName}${isOwnMessage ? ' (You)' : ''} ${rizzBadge}</span>
                    <span class="message-time">${timeString}</span>
                </div>
                ${replyHtml}
                ${data.text ? `<div class="message-text">${this.escapeHtml(data.text)}</div>` : ''}
                ${mediaHtml}
                ${stickerHtml}
                <div class="message-reactions" id="reactions-${data.id}"></div>
            </div>
            <div class="message-actions">
                <button class="message-action-btn" onclick="app.replyToMessage('${data.id}', '${this.escapeHtml(displayName)}', '${this.escapeHtml(data.text || '')}', '${data.userColor}')">
                    <i class="fas fa-reply"></i>
                </button>
                <button class="message-action-btn rizz-btn" onclick="app.giveRizz('${this.escapeHtml(displayName)}')">
                    <i class="fas fa-fire-alt"></i>
                </button>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    replyToMessage(messageId, visibleId, text, userColor) {
        this.setReplyTo({
            id: messageId,
            visibleId: visibleId,
            text: text,
            userColor: userColor
        });
    }

    scrollToMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.classList.add('highlight-message');
            setTimeout(() => {
                messageElement.classList.remove('highlight-message');
            }, 2000);
        }
    }

    addReaction(messageId, emoji) {
        this.socket.emit('addReaction', {
            messageId,
            emoji,
            visibleId: this.visibleId,
            channel: this.currentChannel
        });
    }

    updateMessageReactions(messageId, reactions) {
        const reactionsContainer = document.getElementById(`reactions-${messageId}`);
        if (!reactionsContainer) return;

        reactionsContainer.innerHTML = '';
        for (const [emoji, count] of Object.entries(reactions)) {
            if (count > 0) {
                const badge = document.createElement('div');
                badge.className = 'reaction-badge';
                badge.innerHTML = `${emoji} <span class="count">${count}</span>`;
                badge.onclick = () => this.addReaction(messageId, emoji);
                reactionsContainer.appendChild(badge);
            }
        }
    }

    openImageModal(imageUrl) {
        const modal = document.getElementById('image-modal');
        const img = document.getElementById('fullsize-image');
        img.src = imageUrl;
        modal.classList.add('show');
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    updateOnlineUsersList(users) {
        const container = document.getElementById('online-users-list');
        container.innerHTML = '';

        users.forEach(user => {
            if (user.rizzCount !== undefined) {
                this.userRizzCounts.set(user.visibleId, user.rizzCount);
            }
            const rizzBadge = this.getRizzBadgeHTML(user.visibleId);
            const rizzCount = this.userRizzCounts.get(user.visibleId) || 0;
            const userItem = document.createElement('div');
            userItem.className = 'online-user-item';
            userItem.innerHTML = `
                <div class="online-user-avatar" style="background-color: ${user.userColor}">
                    ${user.visibleId.charAt(0).toUpperCase()}
                </div>
                <span class="online-user-name">${user.visibleId} ${rizzBadge}</span>
                <span class="online-user-rizz" title="${rizzCount} Rizz">🔥${rizzCount}</span>
                <div class="online-user-dot"></div>
            `;
            container.appendChild(userItem);
        });
    }

    openEmojiPicker() {
        document.getElementById('emoji-modal').classList.add('show');
        this.populateEmojiGrid();
    }

    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing', { 
                visibleId: this.visibleId, 
                channel: this.currentChannel 
            });
        }

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 1000);
    }

    stopTyping() {
        if (this.isTyping) {
            this.isTyping = false;
            this.socket.emit('stopTyping', { channel: this.currentChannel });
        }
        clearTimeout(this.typingTimeout);
    }

    showTypingIndicator(visibleId) {
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.style.display = 'block';
        typingIndicator.querySelector('.typing-text').textContent = `${visibleId} is typing...`;
        
        setTimeout(() => {
            this.hideTypingIndicator();
        }, 3000);
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.style.display = 'none';
    }

    updateOnlineCount(count = null) {
        const onlineCountElement = document.querySelector('.online-count');
        const actualCount = count !== null ? count : this.onlineUsers.size;
        onlineCountElement.textContent = `${actualCount} students online`;
    }

    updateUserDisplay() {
        document.querySelector('.user-name').textContent = this.visibleId;
        const rizzCountEl = document.getElementById('user-rizz-count');
        if (rizzCountEl) {
            rizzCountEl.textContent = this.myRizzCount;
        }
    }

    logout() {
        try {
            if (this.socket && this.socket.connected) {
                this.socket.emit('leaveChannel', { channel: this.currentChannel });
                this.socket.disconnect();
            }
        } catch (_) {}

        sessionStorage.removeItem('peerlink_login');
        window.location.href = 'login.html';
    }

    clearMessages() {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
    }

    autoResizeTextarea() {
        const textarea = document.getElementById('message-input');
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        const messagesContainer = document.querySelector('.messages-container');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #8A2BE2, #00BFFF);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1001;
            box-shadow: 0 0 20px rgba(138, 43, 226, 0.4);
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    playNotificationSound() {
        if (!this.soundEnabled) return;
        
        try {
            const audio = document.getElementById('notification-sound');
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(() => {});
            }
        } catch (e) {}
    }

    loadSettings() {
        const sound = localStorage.getItem('peerlink_sound');
        this.soundEnabled = sound !== 'false';
        
        const soundCheckbox = document.getElementById('sound-effects');
        if (soundCheckbox) {
            soundCheckbox.checked = this.soundEnabled;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    initializeEmojiPicker() {
        this.emojiData = {
            smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
            people: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁', '👅', '👄', '💋'],
            animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🦍', '🦧', '🐕', '🐩', '🦮', '🐈', '🦄', '🐎', '🦓', '🦌', '🐂', '🐃', '🐄', '🐪', '🐫', '🦙', '🦒', '🐘', '🦏', '🦛', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🐞'],
            food: ['🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪'],
            activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '🤺', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🥁', '🎸', '🎺', '🎷', '🎹', '🎻', '🎲', '♠️', '♥️', '♦️', '♣️', '🎯', '🎳', '🎮', '🎰'],
            objects: ['📱', '📲', '☎️', '📞', '📟', '📠', '🔋', '🔌', '💻', '🖥', '🖨', '⌨️', '🖱', '🖲', '💽', '💾', '💿', '📀', '🎥', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯', '💡', '🔦', '🏮', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '📑', '🔖', '🏷', '💰', '💴', '💵', '💶', '💷', '💸', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒', '🛠', '⛏', '🔩', '⚙️', '🔫', '💣', '🔪', '🗡', '⚔️', '🛡', '🏺', '🔮', '📿', '💈', '⚗️', '🔭', '🔬', '💊', '💉', '🧬', '🧪', '🌡', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛒'],
            symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '☢️', '☣️', '📴', '📳', '✅', '❌', '❓', '❗', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤']
        };
        
        this.populateEmojiGrid();
    }

    populateEmojiGrid() {
        const emojiGrid = document.getElementById('emoji-grid');
        if (!emojiGrid) return;
        
        emojiGrid.innerHTML = '';
        
        const emojis = this.emojiData[this.currentEmojiCategory] || [];
        emojis.forEach(emoji => {
            const emojiItem = document.createElement('div');
            emojiItem.className = 'emoji-item';
            emojiItem.textContent = emoji;
            emojiItem.addEventListener('click', () => {
                this.insertEmoji(emoji);
            });
            emojiGrid.appendChild(emojiItem);
        });
    }

    insertEmoji(emoji) {
        const messageInput = document.getElementById('message-input');
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(cursorPos);
        
        messageInput.value = textBefore + emoji + textAfter;
        messageInput.focus();
        messageInput.selectionStart = messageInput.selectionEnd = cursorPos + emoji.length;
        
        document.getElementById('emoji-modal').classList.remove('show');
    }

    initializeStickerPicker() {
        this.populateStickerGrid();
    }

    openStickerPicker() {
        document.getElementById('sticker-modal').classList.add('show');
        this.populateStickerGrid();
    }

    populateStickerGrid() {
        const stickerGrid = document.getElementById('sticker-grid');
        if (!stickerGrid) return;
        
        stickerGrid.innerHTML = '';
        
        let stickers = [];
        if (this.currentStickerCategory === 'favorites') {
            stickers = this.favoriteStickers;
        } else if (this.currentStickerCategory === 'my-stickers') {
            stickers = this.customStickers;
        } else if (this.currentStickerCategory === 'default') {
            stickers = this.defaultStickers;
        }
        
        if (stickers.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'sticker-empty-message';
            emptyMessage.innerHTML = this.currentStickerCategory === 'favorites' 
                ? '<i class="fas fa-heart"></i><p>No favorites yet. Click the heart on stickers to add them!</p>'
                : this.currentStickerCategory === 'my-stickers'
                ? '<i class="fas fa-plus-circle"></i><p>No custom stickers yet. Upload one below!</p>'
                : '<p>No stickers available.</p>';
            stickerGrid.appendChild(emptyMessage);
            return;
        }
        
        stickers.forEach(sticker => {
            const stickerItem = document.createElement('div');
            stickerItem.className = 'sticker-item';
            stickerItem.dataset.stickerId = sticker.id;
            
            const isFavorite = this.favoriteStickers.some(f => f.id === sticker.id);
            
            if (sticker.isEmoji) {
                stickerItem.innerHTML = `
                    <span class="sticker-emoji">${sticker.emoji}</span>
                    <button class="sticker-favorite-btn ${isFavorite ? 'active' : ''}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="fas fa-heart"></i>
                    </button>
                `;
            } else {
                stickerItem.innerHTML = `
                    <img src="${sticker.url}" alt="Custom sticker" class="sticker-image">
                    <button class="sticker-favorite-btn ${isFavorite ? 'active' : ''}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="fas fa-heart"></i>
                    </button>
                    ${this.currentStickerCategory === 'my-stickers' ? `
                        <button class="sticker-delete-btn" title="Delete sticker">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                `;
            }
            
            stickerItem.addEventListener('click', (e) => {
                if (e.target.closest('.sticker-favorite-btn')) {
                    e.stopPropagation();
                    this.toggleFavorite(sticker);
                } else if (e.target.closest('.sticker-delete-btn')) {
                    e.stopPropagation();
                    this.deleteCustomSticker(sticker.id);
                } else {
                    this.sendSticker(sticker);
                }
            });
            
            stickerGrid.appendChild(stickerItem);
        });
    }

    loadCustomStickers() {
        try {
            const stickers = localStorage.getItem('peerlink_custom_stickers');
            return stickers ? JSON.parse(stickers) : [];
        } catch (error) {
            console.error('Error loading custom stickers:', error);
            return [];
        }
    }

    saveCustomStickers() {
        try {
            localStorage.setItem('peerlink_custom_stickers', JSON.stringify(this.customStickers));
        } catch (error) {
            console.error('Error saving custom stickers:', error);
        }
    }

    loadFavoriteStickers() {
        try {
            const stickers = localStorage.getItem('peerlink_favorite_stickers');
            return stickers ? JSON.parse(stickers) : [];
        } catch (error) {
            console.error('Error loading favorite stickers:', error);
            return [];
        }
    }

    saveFavoriteStickers() {
        try {
            localStorage.setItem('peerlink_favorite_stickers', JSON.stringify(this.favoriteStickers));
        } catch (error) {
            console.error('Error saving favorite stickers:', error);
        }
    }

    toggleFavorite(sticker) {
        const existingIndex = this.favoriteStickers.findIndex(f => f.id === sticker.id);
        
        if (existingIndex !== -1) {
            this.favoriteStickers.splice(existingIndex, 1);
            this.showNotification('Removed from favorites');
        } else {
            this.favoriteStickers.push(sticker);
            this.showNotification('Added to favorites');
        }
        
        this.saveFavoriteStickers();
        this.populateStickerGrid();
    }

    handleStickerUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please upload an image file');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            this.showNotification('Sticker must be less than 2MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const stickerId = 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const newSticker = {
                id: stickerId,
                url: event.target.result,
                isEmoji: false
            };
            
            this.customStickers.push(newSticker);
            this.saveCustomStickers();
            
            document.querySelectorAll('.sticker-category').forEach(c => c.classList.remove('active'));
            document.querySelector('[data-category="my-stickers"]').classList.add('active');
            this.currentStickerCategory = 'my-stickers';
            
            this.populateStickerGrid();
            this.showNotification('Sticker added!');
        };
        
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    sendSticker(sticker) {
        if (!this.socket || !this.socket.connected) {
            this.showNotification('Not connected to server. Please refresh the page.');
            return;
        }

        const messageData = {
            text: '',
            visibleId: this.visibleId,
            anonymousId: this.visibleId,
            userColor: this.userColor,
            channel: this.currentChannel,
            timestamp: new Date(),
            sticker: {
                id: sticker.id,
                isEmoji: sticker.isEmoji,
                emoji: sticker.emoji || null,
                url: sticker.url || null
            },
            replyTo: null
        };

        this.socket.emit('message', messageData);
        document.getElementById('sticker-modal').classList.remove('show');
    }

    deleteCustomSticker(stickerId) {
        const index = this.customStickers.findIndex(s => s.id === stickerId);
        if (index !== -1) {
            this.customStickers.splice(index, 1);
            this.saveCustomStickers();
            
            const favIndex = this.favoriteStickers.findIndex(f => f.id === stickerId);
            if (favIndex !== -1) {
                this.favoriteStickers.splice(favIndex, 1);
                this.saveFavoriteStickers();
            }
            
            this.populateStickerGrid();
            this.showNotification('Sticker deleted');
        }
    }

    loadChatHistory() {
        try {
            const history = localStorage.getItem('peerlink_chat_history');
            return history ? JSON.parse(history) : {};
        } catch (error) {
            console.error('Error loading chat history:', error);
            return {};
        }
    }

    saveChatHistory() {
        try {
            localStorage.setItem('peerlink_chat_history', JSON.stringify(this.chatHistory));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    addToHistory(message) {
        if (!this.chatHistory[message.channel]) {
            this.chatHistory[message.channel] = [];
        }
        
        this.chatHistory[message.channel].push(message);
        
        if (this.chatHistory[message.channel].length > 100) {
            this.chatHistory[message.channel] = this.chatHistory[message.channel].slice(-100);
        }
        
        this.saveChatHistory();
    }

    loadChannelHistory() {
        const history = this.chatHistory[this.currentChannel] || [];
        
        history.slice(-50).forEach(message => {
            this.displayHistoryMessage(message);
        });
    }

    displayHistoryMessage(data) {
        const messagesContainer = document.getElementById('messages');
        const welcomeMessage = document.querySelector('.welcome-message');
        
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.dataset.messageId = data.id;
        
        const timeString = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
        const displayName = data.visibleId || data.anonymousId || data.userId;
        const isOwnMessage = displayName === this.visibleId;
        
        let replyHtml = '';
        if (data.replyTo) {
            const replyColor = data.replyTo.userColor || '#8A2BE2';
            replyHtml = `
                <div class="reply-quote" style="border-left-color: ${replyColor}; background: linear-gradient(90deg, ${replyColor}20 0%, transparent 100%);" onclick="app.scrollToMessage('${data.replyTo.id}')" title="Click to jump to message">
                    <div class="reply-quote-sender" style="color: ${replyColor}">${this.escapeHtml(data.replyTo.visibleId)}</div>
                    <div class="reply-quote-text">${this.escapeHtml(data.replyTo.text || '[Media]')}</div>
                </div>
            `;
        }
        
        let mediaHtml = '';
        if (data.media) {
            if (data.media.type === 'image') {
                mediaHtml = `
                    <div class="message-media">
                        <img src="${data.media.url}" alt="${data.media.name}" onclick="app.openImageModal('${data.media.url}')">
                    </div>
                `;
            } else if (data.media.type === 'video') {
                mediaHtml = `
                    <div class="message-media">
                        <video src="${data.media.url}" controls></video>
                    </div>
                `;
            } else if (data.media) {
                const fileSize = this.formatFileSize(data.media.size);
                mediaHtml = `
                    <div class="message-file">
                        <i class="fas fa-file"></i>
                        <div class="message-file-info">
                            <div class="message-file-name">${this.escapeHtml(data.media.name)}</div>
                            <div class="message-file-size">${fileSize}</div>
                        </div>
                        <a href="${data.media.url}" download class="action-btn" style="width:30px;height:30px;">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                `;
            }
        }

        let stickerHtml = '';
        if (data.sticker) {
            if (data.sticker.isEmoji) {
                stickerHtml = `
                    <div class="message-sticker">
                        <span class="sticker-display-emoji">${data.sticker.emoji}</span>
                    </div>
                `;
            } else {
                stickerHtml = `
                    <div class="message-sticker">
                        <img src="${data.sticker.url}" alt="Sticker" class="sticker-display-image" onclick="app.openImageModal('${data.sticker.url}')">
                    </div>
                `;
            }
        }
        
        const rizzBadge = this.getRizzBadgeHTML(displayName || 'Anonymous');
        
        messageElement.innerHTML = `
            <div class="quick-reactions">
                <button class="quick-reaction" onclick="app.addReaction('${data.id}', '👍')">👍</button>
                <button class="quick-reaction" onclick="app.addReaction('${data.id}', '❤️')">❤️</button>
                <button class="quick-reaction" onclick="app.addReaction('${data.id}', '😂')">😂</button>
                <button class="quick-reaction" onclick="app.addReaction('${data.id}', '😮')">😮</button>
                <button class="quick-reaction" onclick="app.addReaction('${data.id}', '🔥')">🔥</button>
            </div>
            <div class="message-avatar" style="background-color: ${data.userColor || '#8A2BE2'}">
                ${(displayName || 'A').charAt(0).toUpperCase()}
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender" style="color: ${data.userColor || '#8A2BE2'}">${displayName || 'Anonymous'}${isOwnMessage ? ' (You)' : ''} ${rizzBadge}</span>
                    <span class="message-time">${timeString}</span>
                </div>
                ${replyHtml}
                ${data.text ? `<div class="message-text">${this.escapeHtml(data.text)}</div>` : ''}
                ${mediaHtml}
                ${stickerHtml}
                <div class="message-reactions" id="reactions-${data.id}"></div>
            </div>
            <div class="message-actions">
                <button class="message-action-btn" onclick="app.replyToMessage('${data.id}', '${this.escapeHtml(displayName || 'Anonymous')}', '${this.escapeHtml(data.text || '')}', '${data.userColor || '#8A2BE2'}')">
                    <i class="fas fa-reply"></i>
                </button>
                <button class="message-action-btn rizz-btn" onclick="app.giveRizz('${this.escapeHtml(displayName || 'Anonymous')}')">
                    <i class="fas fa-fire-alt"></i>
                </button>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    const loginData = sessionStorage.getItem('peerlink_login');
    if (!loginData) {
        window.location.href = 'login.html';
        return;
    }
    
    app = new PeerLinkApp();
});
