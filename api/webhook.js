const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

const replies = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    const { message } = req.body;

    if (!message || !message.reply_to_message) {
        return res.status(200).end();
    }

    const replyText = message.text;
    const originalMessage = message.reply_to_message.text;

    const sessionMatch = originalMessage.match(/Session: (.+)/);
    if (sessionMatch) {
        const sessionId = sessionMatch[1].trim();
        if (!replies.has(sessionId)) {
            replies.set(sessionId, []);
        }
        replies.get(sessionId).push({
            text: replyText,
            timestamp: Date.now()
        });
    }

    return res.status(200).end();
}

export { replies };