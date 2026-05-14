// api/update-status.js
// Fire-and-forget status updates on Card Orders pages when owner advances an order

import { Client } from "@notionhq/client";

const STATUS_MAP = {
  pending:     "Pending",
  in_progress: "In Progress",
  complete:    "Complete",
  picked_up:   "Picked Up",
};

function extractPageId(url) {
  const m = (url || "").replace(/-/g, "").match(/([a-f0-9]{32})/i);
  return m ? m[1] : null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const { orderUrls, status } = req.body;

  const ids = (orderUrls || []).map(extractPageId).filter(Boolean);
  if (!ids.length) return res.json({ ok: true, skipped: true });

  const notionStatus  = STATUS_MAP[status] || "Pending";
  const isComplete    = status === "complete" || status === "picked_up";
  const dateCompleted = isComplete ? new Date().toISOString().slice(0, 16) : null;

  try {
    await Promise.all(ids.map(id =>
      notion.pages.update({
        page_id: id,
        properties: {
          "Order Status":   { select:   { name: notionStatus } },
          "Order Complete": { checkbox: isComplete },
          ...(dateCompleted ? {
            "Date Completed": { date: { start: dateCompleted } },
          } : {}),
        },
      })
    ));
    res.json({ ok: true });
  } catch (err) {
    console.error("Status update error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};