// api/manage.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    // 1. Security Check
    const authHeader = req.headers.authorization;
    const secret = process.env.ADMIN_SECRET;

    // Debugging: Check if secret is loaded
    if (!secret) {
        console.error("ADMIN_SECRET is missing in environment variables!");
        return res.status(500).json({ error: "Server configuration error: Admin secret not set." });
    }

    if (!authHeader || authHeader !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // ... (The rest of the code remains the same as before) ...
    
    try {
        if (req.method === 'GET') {
            const [cursor, keys] = await redis.scan(0, { match: 'cert:*', count: 100 });
            const certificates = [];
            for (const key of keys) {
                const data = await redis.get(key);
                if (data) certificates.push({ id: key.replace('cert:', ''), ...data });
            }
            return res.status(200).json(certificates);

        } else if (req.method === 'POST') {
            const { id, name, course, date } = req.body;
            if (!id || !name || !course) return res.status(400).json({ error: 'Missing fields' });
            
            const key = `cert:${id}`;
            const value = { name, course, date: date || new Date().toISOString().split('T')[0] };
            await redis.set(key, JSON.stringify(value));
            return res.status(200).json({ success: true });

        } else if (req.method === 'DELETE') {
            const { id } = req.body;
            if (!id) return res.status(400).json({ error: 'ID required' });
            await redis.del(`cert:${id}`);
            return res.status(200).json({ success: true });
        }

        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}