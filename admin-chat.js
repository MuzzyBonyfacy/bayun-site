const SUPABASE_URL = 'https://aahxnfhpwqhosayxbmqj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_43t92RrUifHcfWSxqbpVIA_evczkniw';

let supabase = null;
if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase client not loaded');
}

const AdminChat = {
    currentSession: null,
    pollInterval: null,

    async init() {
        await this.loadSessions();
        this.startPolling();
    },

    async loadSessions() {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error loading sessions:', error);
            return;
        }

        const list = document.getElementById('sessionsList');
        document.getElementById('activeCount').textContent = data.filter(s => s.status === 'active').length;

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

        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', this.currentSession)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error loading messages:', error);
            return;
        }

        const messagesDiv = document.getElementById('chatMessages');
        messagesDiv.innerHTML = data.map(msg => `
            <div class="message ${msg.sender}">
                <div class="message-bubble">${this.escapeHtml(msg.message)}</div>
                <div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div>
            </div>
        `).join('');

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    async sendMessage() {
        const input = document.getElementById('managerInput');
        const message = input.value.trim();

        if (!message || !this.currentSession) return;

        const { error } = await supabase
            .from('chat_messages')
            .insert({
                session_id: this.currentSession,
                sender: 'manager',
                message: message
            });

        if (error) {
            console.error('Error sending message:', error);
            return;
        }

        await supabase
            .from('chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('session_id', this.currentSession);

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