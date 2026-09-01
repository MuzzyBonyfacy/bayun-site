const replies = new Map();

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { sessionId, lastTimestamp } = req.query;

    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId required' });
    }

    const sessionReplies = replies.get(sessionId) || [];
    const newReplies = sessionReplies.filter(r => r.timestamp > parseInt(lastTimestamp || 0));

    return res.status(200).json({ replies: newReplies });
}

export { replies };