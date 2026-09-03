const ChatWidget = {
    sessionId: localStorage.getItem('chat_session_id') || 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    isOpen: false,
    isRu: document.documentElement.lang === 'ru',
    pollInterval: null,

    init() {
        localStorage.setItem('chat_session_id', this.sessionId);
        this.createWidget();
        this.bindEvents();
        this.loadMessages();
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
        } else {
            this.stopPolling();
        }
    },

    close() {
        this.isOpen = false;
        document.getElementById('chatWindow').classList.remove('active');
        this.stopPolling();
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

        nameInput.style.borderColor = '#e0e0e0';
        this.addMessage(message, 'client');
        input.value = '';

        await this.saveSession(name);
        await this.saveMessage(message, 'client');
    },

    async saveSession(name) {
        if (!supabase) return;
        
        const { error } = await supabase
            .from('chat_sessions')
            .upsert({
                session_id: this.sessionId,
                client_name: name,
                status: 'active'
            }, { onConflict: 'session_id' });
    },

    async saveMessage(message, sender) {
        if (!supabase) return;
        
        const { error } = await supabase
            .from('chat_messages')
            .insert({
                session_id: this.sessionId,
                sender: sender,
                message: message
            });
    },

    async loadMessages() {
        if (!supabase) return;
        
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', this.sessionId)
            .order('created_at', { ascending: true });

        if (data && data.length > 0) {
            const messagesDiv = document.getElementById('chatMessages');
            messagesDiv.innerHTML = '';
            data.forEach(msg => {
                this.addMessage(msg.message, msg.sender, false);
            });
        }
    },

    async pollMessages() {
        if (!supabase || !this.isOpen) return;
        
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', this.sessionId)
            .eq('sender', 'manager')
            .order('created_at', { ascending: true });

        if (data) {
            const messagesDiv = document.getElementById('chatMessages');
            const existingCount = messagesDiv.querySelectorAll('.chat-message.manager').length;
            
            if (data.length > existingCount) {
                data.slice(existingCount).forEach(msg => {
                    this.addMessage(msg.message, 'manager', false);
                });
            }
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

document.addEventListener('DOMContentLoaded', () => ChatWidget.init());