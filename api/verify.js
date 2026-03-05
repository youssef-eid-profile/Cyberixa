import { Redis } from '@upstash/redis';

// Initialize Redis using Environment Variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    // Allow CORS (optional, if frontend is on a different domain)
    res.setHeader('Access-Control-Allow-Origin', '*');

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Certificate ID is required' });
    }

    try {
        // Fetch data from Redis
        // We prepend 'cert:' to the ID to namespace the keys
        const data = await redis.get(`cert:${id}`);

        if (data) {
            // Found in database
            return res.status(200).json({ 
                valid: true, 
                name: data.name, 
                course: data.course,
                date: data.date || 'N/A'
            });
        } else {
            // Not found
            return res.status(404).json({ valid: false, error: 'Certificate not found' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}