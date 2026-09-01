const replies = new Map();

export function addReply(sessionId, text) {
    if (!replies.has(sessionId)) {
        replies.set(sessionId, []);
    }
    replies.get(sessionId).push({
        text,
        timestamp: Date.now()
    });
}

export function getReplies(sessionId, lastTimestamp = 0) {
    const sessionReplies = replies.get(sessionId) || [];
    return sessionReplies.filter(r => r.timestamp > lastTimestamp);
}