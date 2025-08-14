import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const r = await fetch("https://aronday.tines.com/api/public/murder-trials");
    if (!r.ok) {
      res.status(r.status).json({ error: `Upstream error ${r.status}` });
      return;
    }
    const data = await r.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Fetch failed" });
  }
}
