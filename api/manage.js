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

    if (!secret) {
        return res.status(500).json({ error: "Server config error." });
    }
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        if (req.method === 'GET') {
            // LIST CERTIFICATES
            const [cursor, keys] = await redis.scan(0, { match: 'cert:*', count: 100 });
            const certificates = [];

            for (const key of keys) {
                const data = await redis.get(key);
                if (data) {
                    // Calculate link if it's missing in old records
                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-site.vercel.app';
                    const link = data.link || `${baseUrl}/verify.html?id=${key.replace('cert:', '')}`;
                    
                    certificates.push({ 
                        id: key.replace('cert:', ''), 
                        link: link, // Add link to response
                        ...data 
                    });
                }
            }
            return res.status(200).json(certificates);

        } else if (req.method === 'POST') {
            // ADD CERTIFICATE
            const { id, name, course, date } = req.body;

            if (!id || !name || !course) {
                return res.status(400).json({ error: 'Missing fields' });
            }

            // Generate the Link automatically
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-site.vercel.app';
            const link = `${baseUrl}/verify.html?id=${id}`;

            const key = `cert:${id}`;
            const value = { 
                name, 
                course, 
                date: date || new Date().toISOString().split('T')[0],
                link // Save link in DB
            };

            await redis.set(key, JSON.stringify(value));
            return res.status(200).json({ success: true, link: link });

        } else if (req.method === 'DELETE') {
            // DELETE CERTIFICATE
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