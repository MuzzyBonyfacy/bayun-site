const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, message, sessionId } = req.body;

    if (!name || !message) {
        return res.status(400).json({ error: 'Name and message required' });
    }

    const text = `📨 *Новое сообщение с сайта BAYUN*\n\n👤 *Имя:* ${name}\n💬 *Сообщение:* ${message}\n🆔 *Session:* ${sessionId}`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();

        if (!data.ok) {
            return res.status(500).json({ error: 'Failed to send message' });
        }

        return res.status(200).json({ success: true, messageId: data.result.message_id });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}