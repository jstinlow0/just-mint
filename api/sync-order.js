// api/sync-order.js
// Vercel serverless function — syncs a new order to Notion Client + Card Orders databases
// Requires NOTION_TOKEN environment variable set in Vercel project settings

import { Client } from "@notionhq/client";

const CLIENT_DB = "334bc09b-53ce-80a9-82ec-000b8cffc130";
const CARD_DB   = "334bc09b-53ce-8026-a631-000b683d4ef9";

const SERVICE_PRICES = {
  "Clean + Polish": 8,
  "Lift":           30,
  "Dent":           50,
  "Crease":         70,
};

export default async function handler(req, res) {
  // Allow CORS for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const order  = req.body;

  if (!order?.clientName || !Array.isArray(order.cards) || order.cards.length === 0) {
    return res.status(400).json({ error: "Invalid order payload" });
  }

  try {
    // ── Step 1: Create client record ──────────────────────────────────────────
    const uniqueConditions = [...new Set(order.cards.map(c => c.condition))];

    const clientPage = await notion.pages.create({
      parent: { database_id: CLIENT_DB },
      properties: {
        "Name": {
          title: [{ text: { content: order.clientName } }],
        },
        "Contact Info": {
          rich_text: [{ text: { content: `${order.clientEmail} / ${order.clientPhone}` } }],
        },
        "Contact Method": {
          select: { name: order.contactMethod },
        },
        "Preferred Payment": {
          select: { name: order.paymentType },
        },
        "Service Requested": {
          multi_select: uniqueConditions.map(c => ({ name: c })),
        },
        "Date Intake": {
          date: { start: new Date(order.waiverSignedAt).toISOString().split("T")[0] },
        },
        "Risk Agreement":  { checkbox: true },
        "Intake Complete": { checkbox: true },
      },
    });

    // ── Step 2: Create one Card Orders page per card ──────────────────────────
    const orderUrls = [];

    for (const card of order.cards) {
      const price = SERVICE_PRICES[card.service] ?? 0;
      const title = card.cardNumber
        ? `${card.cardName} (${card.year}) #${card.cardNumber} · ${order.id}`
        : `${card.cardName} (${card.year}) · ${order.id}`;

      const cardPage = await notion.pages.create({
        parent: { database_id: CARD_DB },
        properties: {
          "Name": {
            title: [{ text: { content: title } }],
          },
          "Order #": {
            rich_text: [{ text: { content: order.id } }],
          },
          "Condition (Before)": {
            select: { name: card.condition },
          },
          "Service Type": {
            select: { name: card.service },
          },
          "Price Charged": {
            number: price,
          },
          "Date Received": {
            date: {
              start: new Date(order.waiverSignedAt).toISOString().slice(0, 16),
              // No time_zone needed — ISO string is already UTC
            },
          },
          "Order Status":   { select:   { name: "Pending" } },
          "Order Complete": { checkbox: false },
          "Payment Received": { checkbox: true },
          "Clients": {
            relation: [{ id: clientPage.id }],
          },
        },
      });

      orderUrls.push(cardPage.url);
    }

    console.log(`✓ Synced order ${order.id} — ${order.cards.length} card(s) for ${order.clientName}`);
    res.json({ success: true, clientUrl: clientPage.url, orderUrls });

  } catch (err) {
    console.error("Sync error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};