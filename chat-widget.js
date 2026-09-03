const ChatWidget = {
    sessionId: localStorage.getItem('chat_session_id') || 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    isOpen: false,
    isRu: document.documentElement.lang === 'ru',
    pollInterval: null,

    init() {
        console.log('ChatWidget init, sessionId:', this.sessionId);
        localStorage.setItem('chat_session_id', this.sessionId);
        this.createWidget();
        this.bindEvents();
        this.loadMessages();
        this.startBackgroundPolling();
    },

    createWidget() {
        const t = this.isRu ? {
            title: 'Поддержка BAYUN',
            status: 'Онлайн',
            greeting: 'Здравствуйте! Напишите ваш вопрос, и мы ответим вам.',
            namePlaceholder: 'Ваше имя',
            inputPlaceholder: 'Напишите сообщение...',
            sendBtn: 'Отправить',
            requiredName: 'Введите имя'
        } : {
            title: 'BAYUN Support',
            status: 'Online',
            greeting: 'Hello! Write your question and we will answer you.',
            namePlaceholder: 'Your name',
            inputPlaceholder: 'Write a message...',
            sendBtn: 'Send',
            requiredName: 'Enter your name'
        };

        const widget = document.createElement('div');
        widget.className = 'chat-widget';
        widget.innerHTML = `
            <div class="chat-window" id="chatWindow">
                <div class="chat-header">
                    <div class="chat-avatar">
                        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                    </div>
                    <div class="chat-header-info">
                        <h4>${t.title}</h4>
                        <p>${t.status}</p>
                    </div>
                    <button class="chat-close" id="chatClose">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-message manager">
                        <div class="chat-bubble">${t.greeting}</div>
                        <div class="chat-time">${this.getTime()}</div>
                    </div>
                </div>
                <div class="chat-input-area">
                    <div class="chat-form-name">
                        <input type="text" id="chatName" placeholder="${t.namePlaceholder}" />
                    </div>
                    <div class="chat-form">
                        <input type="text" id="chatInput" placeholder="${t.inputPlaceholder}" />
                        <button class="chat-send" id="chatSend">
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
            <button class="chat-button" id="chatButton">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            </button>
        `;
        document.body.appendChild(widget);
        
        // Add notification badge
        const chatBtn = document.getElementById('chatButton');
        const badge = document.createElement('div');
        badge.className = 'notification-badge';
        badge.id = 'notificationBadge';
        badge.textContent = '0';
        chatBtn.appendChild(badge);
    },

    bindEvents() {
        document.getElementById('chatButton').addEventListener('click', () => this.toggle());
        document.getElementById('chatClose').addEventListener('click', () => this.close());
        document.getElementById('chatSend').addEventListener('click', () => this.send());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.send();
        });
    },

    toggle() {
        this.isOpen = !this.isOpen;
        document.getElementById('chatWindow').classList.toggle('active', this.isOpen);
        if (this.isOpen) {
            this.startPolling();
            this.hideNotification();
        } else {
            this.stopPolling();
        }
    },

    close() {
        this.isOpen = false;
        document.getElementById('chatWindow').classList.remove('active');
        this.stopPolling();
    },

    open() {
        this.isOpen = true;
        document.getElementById('chatWindow').classList.add('active');
        this.startPolling();
        this.hideNotification();
    },

    async send() {
        const nameInput = document.getElementById('chatName');
        const input = document.getElementById('chatInput');
        const name = nameInput.value.trim();
        const message = input.value.trim();

        if (!name) {
            nameInput.style.borderColor = '#ff5252';
            nameInput.focus();
            return;
        }

        if (!message) return;

        console.log('Sending message:', { name, message, sessionId: this.sessionId });

        nameInput.style.borderColor = '#e0e0e0';
        this.addMessage(message, 'client');
        input.value = '';

        await this.saveSession(name);
        await this.saveMessage(message, 'client');
    },

    async saveSession(name) {
        console.log('saveSession called');
        try {
            console.log('Upserting session...');
            const result = await SupabaseAPI.upsert('chat_sessions', {
                session_id: this.sessionId,
                client_name: name,
                status: 'active'
            }, 'session_id');
            
            console.log('saveSession result:', result);
            return result;
        } catch (error) {
            console.error('saveSession error:', error);
        }
    },

    async saveMessage(message, sender) {
        console.log('saveMessage called');
        try {
            console.log('Inserting message...');
            const result = await SupabaseAPI.insert('chat_messages', {
                session_id: this.sessionId,
                sender: sender,
                message: message
            });
            
            console.log('saveMessage result:', result);
            return result;
        } catch (error) {
            console.error('saveMessage error:', error);
        }
    },

    async loadMessages() {
        try {
            console.log('Loading messages for session:', this.sessionId);
            const result = await SupabaseAPI.select('chat_messages', 
                `session_id=eq.${this.sessionId}&order=created_at.asc`
            );
            
            console.log('loadMessages result:', result);

            if (result && result.length > 0) {
                const messagesDiv = document.getElementById('chatMessages');
                messagesDiv.innerHTML = '';
                result.forEach(msg => {
                    this.addMessage(msg.message, msg.sender, false);
                });
            }
        } catch (error) {
            console.error('loadMessages error:', error);
        }
    },

    async pollMessages() {
        if (!this.isOpen) return;
        
        try {
            const result = await SupabaseAPI.select('chat_messages', 
                `session_id=eq.${this.sessionId}&sender=eq.manager&order=created_at.asc`
            );

            if (result) {
                const messagesDiv = document.getElementById('chatMessages');
                const existingCount = messagesDiv.querySelectorAll('.chat-message.manager').length;
                
                if (result.length > existingCount) {
                    const newMessages = result.slice(existingCount);
                    newMessages.forEach(msg => {
                        this.addMessage(msg.message, 'manager', false);
                    });
                    this.showNotification(newMessages.length);
                }
            }
        } catch (error) {
            console.error('pollMessages error:', error);
        }
    },

    showNotification(count) {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = 'flex';
        }
        this.playNotificationSound();
    },

    hideNotification() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.style.display = 'none';
        }
    },

    startBackgroundPolling() {
        setInterval(() => {
            if (!this.isOpen) {
                this.pollForNotifications();
            }
        }, 5000);
    },

    async pollForNotifications() {
        try {
            const result = await SupabaseAPI.select('chat_messages', 
                `session_id=eq.${this.sessionId}&sender=eq.manager&order=created_at.asc`
            );

            if (result && result.length > 0) {
                const lastShown = parseInt(localStorage.getItem('chat_last_shown') || '0');
                const newCount = result.filter(msg => new Date(msg.created_at).getTime() > lastShown).length;
                
                if (newCount > 0) {
                    this.showNotification(newCount);
                }
            }
        } catch (error) {
            // Silent fail for background polling
        }
    },

    startPolling() {
        this.stopPolling();
        this.pollInterval = setInterval(() => this.pollMessages(), 3000);
    },

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    },

    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.log('Sound notification not available');
        }
    },

    addMessage(text, type, scroll = true) {
        const messages = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.className = `chat-message ${type}`;
        div.innerHTML = `
            <div class="chat-bubble">${this.escapeHtml(text)}</div>
            <div class="chat-time">${this.getTime()}</div>
        `;
        messages.appendChild(div);
        if (scroll) {
            messages.scrollTop = messages.scrollHeight;
        }
        localStorage.setItem('chat_last_shown', Date.now().toString());
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    getTime() {
        return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ChatWidget');
    ChatWidget.init();
});

function openChatWithGreeting() {
    ChatWidget.open();
    setTimeout(() => {
        const input = document.getElementById('chatInput');
        if (input) {
            input.focus();
        }
    }, 300);
}