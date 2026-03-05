// api/verify.js
import { Redis } from '@upstash/redis';

// Check if variables exist
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error("Missing Upstash Environment Variables");
}

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Certificate ID is required' });
    }

    try {
        // Fetch data from Redis
        const data = await redis.get(`cert:${id}`);

        if (data) {
            return res.status(200).json({ 
                valid: true, 
                name: data.name, 
                course: data.course,
                date: data.date || 'N/A'
            });
        } else {
            return res.status(404).json({ valid: false, error: 'Certificate not found' });
        }
    } catch (error) {
        console.error("Redis Error:", error);
        return res.status(500).json({ error: 'Database connection failed', details: error.message });
    }
}