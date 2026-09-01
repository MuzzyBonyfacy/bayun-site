const ChatWidget = {
    sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    isOpen: false,
    messages: [],
    lastTimestamp: 0,
    isRu: document.documentElement.lang === 'ru',

    init() {
        this.createWidget();
        this.bindEvents();
    },

    createWidget() {
        const t = this.isRu ? {
            title: 'Поддержка BAYUN',
            status: 'Онлайн | Среднее время ответа: 5 мин',
            greeting: 'Здравствуйте! Чем мы можем помочь? Напишите ваш вопрос, и мы ответим в Telegram.',
            namePlaceholder: 'Ваше имя',
            inputPlaceholder: 'Напишите сообщение...',
            sent: 'Ваше сообщение отправлено! Наш менеджер ответит в Telegram в ближайшее время.',
            error: 'Ошибка отправки. Попробуйте еще раз.',
            connectionError: 'Ошибка соединения. Попробуйте позже.'
        } : {
            title: 'BAYUN Support',
            status: 'Online | Average response: 5 min',
            greeting: 'Hello! How can we help you? Write your question and we will answer in Telegram.',
            namePlaceholder: 'Your name',
            inputPlaceholder: 'Write a message...',
            sent: 'Your message has been sent! Our manager will reply in Telegram shortly.',
            error: 'Error sending message. Please try again.',
            connectionError: 'Connection error. Please try again later.'
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
                    <div class="chat-message bot">
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
    },

    close() {
        this.isOpen = false;
        document.getElementById('chatWindow').classList.remove('active');
    },

    send() {
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

        const t = this.isRu ? {
            sent: 'Ваше сообщение отправлено! Наш менеджер ответит в Telegram в ближайшее время.',
            error: 'Ошибка отправки. Попробуйте еще раз.',
            connectionError: 'Ошибка соединения. Попробуйте позже.'
        } : {
            sent: 'Your message has been sent! Our manager will reply in Telegram shortly.',
            error: 'Error sending message. Please try again.',
            connectionError: 'Connection error. Please try again later.'
        };

        this.addMessage(message, 'user');
        input.value = '';

        fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, message, sessionId: this.sessionId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                this.addMessage(t.sent, 'bot');
            } else {
                this.addMessage(t.error, 'bot');
            }
        })
        .catch(() => {
            this.addMessage(t.connectionError, 'bot');
        });
    },

    addMessage(text, type) {
        const messages = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.className = `chat-message ${type}`;
        div.innerHTML = `
            <div class="chat-bubble">${text}</div>
            <div class="chat-time">${this.getTime()}</div>
        `;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    },

    getTime() {
        return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
};

document.addEventListener('DOMContentLoaded', () => ChatWidget.init());