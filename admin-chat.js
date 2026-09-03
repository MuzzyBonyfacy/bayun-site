const SUPABASE_URL = 'https://aahxnfhpwqhosayxbmqj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_43t92RrUifHcfWSxqbpVIA_evczkniw';

const SupabaseAPI = {
    async select(table, params = '') {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        return await response.json();
    },

    async insert(table, data) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async update(table, data, params) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    }
};

const AdminChat = {
    currentSession: null,
    pollInterval: null,
    lastMessageCount: 0,

    async init() {
        await this.loadSessions();
        this.startPolling();
    },

    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 1000;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.frequency.value = 1200;
                osc2.type = 'sine';
                gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                osc2.start(audioContext.currentTime);
                osc2.stop(audioContext.currentTime + 0.2);
            }, 150);
        } catch (e) {
            console.log('Sound notification not available');
        }
    },

    async loadSessions() {
        const data = await SupabaseAPI.select('chat_sessions', 'order=updated_at.desc');

        if (!data || data.error) {
            console.error('Error loading sessions:', data);
            return;
        }

        const list = document.getElementById('sessionsList');
        const activeSessions = data.filter(s => s.status === 'active');
        document.getElementById('activeCount').textContent = activeSessions.length;

        if (data.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No conversations yet</div>';
            return;
        }

        list.innerHTML = data.map(session => `
            <div class="session-item ${this.currentSession === session.session_id ? 'active' : ''}" 
                 onclick="AdminChat.selectSession('${session.session_id}', '${session.client_name}')">
                <div class="session-name">${session.client_name}</div>
                <div class="session-preview">Click to view conversation</div>
                <div class="session-time">${new Date(session.updated_at).toLocaleString()}</div>
                <span class="session-status status-${session.status}">${session.status}</span>
            </div>
        `).join('');

        const newCount = activeSessions.length;
        if (this.lastMessageCount > 0 && newCount > this.lastMessageCount) {
            this.playNotificationSound();
        }
        this.lastMessageCount = newCount;
    },

    async selectSession(sessionId, clientName) {
        this.currentSession = sessionId;
        
        document.getElementById('noChatSelected').style.display = 'none';
        document.getElementById('activeChat').style.display = 'flex';
        document.getElementById('chatClientName').textContent = clientName;
        document.getElementById('chatSessionId').textContent = sessionId;
        
        await this.loadMessages();
        await this.loadSessions();
    },

    async loadMessages() {
        if (!this.currentSession) return;

        const data = await SupabaseAPI.select('chat_messages', 
            `session_id=eq.${this.currentSession}&order=created_at.asc`
        );

        if (!data || data.error) {
            console.error('Error loading messages:', data);
            return;
        }

        const messagesDiv = document.getElementById('chatMessages');
        const previousCount = messagesDiv.querySelectorAll('.message').length;
        
        messagesDiv.innerHTML = data.map(msg => `
            <div class="message ${msg.sender}">
                <div class="message-bubble">${this.escapeHtml(msg.message)}</div>
                <div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div>
            </div>
        `).join('');

        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        if (data.length > previousCount && previousCount > 0) {
            const newMessages = data.slice(previousCount);
            const hasClientMessage = newMessages.some(msg => msg.sender === 'client');
            if (hasClientMessage) {
                this.playNotificationSound();
            }
        }
    },

    async sendMessage() {
        const input = document.getElementById('managerInput');
        const message = input.value.trim();

        if (!message || !this.currentSession) return;

        const result = await SupabaseAPI.insert('chat_messages', {
            session_id: this.currentSession,
            sender: 'manager',
            message: message
        });

        if (result && result.error) {
            console.error('Error sending message:', result);
            return;
        }

        await SupabaseAPI.update('chat_sessions', 
            { updated_at: new Date().toISOString() },
            `session_id=eq.${this.currentSession}`
        );

        input.value = '';
        await this.loadMessages();
    },

    startPolling() {
        this.pollInterval = setInterval(async () => {
            await this.loadSessions();
            if (this.currentSession) {
                await this.loadMessages();
            }
        }, 5000);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => AdminChat.init());

document.getElementById('managerInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') AdminChat.sendMessage();
});