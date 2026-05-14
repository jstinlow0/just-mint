// api/create-waiver.js
// Vercel serverless function — creates a full signed waiver page in the Signed Waivers database
// Signature is stored as encoded chunks so it's recoverable even after app rebuilds

const { Client } = require("@notionhq/client");

const WAIVER_DB = "4e2e71c7-c056-421c-a58a-66914158dc7c";

const SERVICE_PRICES = {
  "Clean + Polish": 8,
  "Lift":           30,
  "Dent":           50,
  "Crease":         70,
};

const batchTotal = (cards) =>
  cards.reduce((s, c) => s + (SERVICE_PRICES[c.service] ?? 0), 0);

// Notion rich_text blocks have a 2000-char limit — this helper splits long strings safely
function richText(content) {
  const LIMIT = 1900;
  const chunks = [];
  for (let i = 0; i < content.length; i += LIMIT) {
    chunks.push({ type: "text", text: { content: content.slice(i, i + LIMIT) } });
  }
  return chunks;
}

function paragraph(text) {
  return { object: "block", type: "paragraph", paragraph: { rich_text: richText(text) } };
}

function heading2(text) {
  return { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: text } }] } };
}

function heading3(text) {
  return { object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: text } }] } };
}

function divider() {
  return { object: "block", type: "divider", divider: {} };
}

function code(text) {
  return {
    object: "block", type: "code",
    code: { language: "plain text", rich_text: richText(text) },
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const order  = req.body;

  if (!order?.clientName) {
    return res.status(400).json({ error: "Invalid order payload" });
  }

  const total   = batchTotal(order.cards || []);
  const dateStr = new Date(order.waiverSignedAt).toISOString().split("T")[0];
  const dateReadable = new Date(order.waiverSignedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const services = [...new Set((order.cards || []).map(c => c.service))].join(", ");

  // ── Build page content as Notion blocks ───────────────────────────────────
  const children = [
    heading2("Client Information"),
    paragraph(`Client Name: ${order.clientName}`),
    paragraph(`Order #: ${order.id}`),
    paragraph(`Email: ${order.clientEmail}`),
    paragraph(`Phone: ${order.clientPhone}`),
    paragraph(`Contact Method: ${order.contactMethod}`),
    paragraph(`Payment: ${order.paymentType}`),
    paragraph(`Services: ${services}`),
    paragraph(`Batch Total: $${total}`),
    paragraph(`Date Signed: ${dateReadable}`),
    divider(),

    heading2(`Cards in This Batch (${(order.cards || []).length})`),
    ...(order.cards || []).map((card, i) => {
      const price = SERVICE_PRICES[card.service] ?? 0;
      const num   = card.cardNumber ? ` — #${card.cardNumber}` : "";
      return paragraph(`${i + 1}. ${card.cardName} (${card.year})${num} — Condition: ${card.condition} — ${card.service} — $${price}`);
    }),
    paragraph(`Batch Total: $${total}`),
    divider(),

    heading2("Service Agreement — Full Terms"),
    heading3("1. Services & Pricing"),
    paragraph("Just Mint Card Care provides card cleaning and restoration services on collectible trading cards. Prices per card (USD): Clean + Polish — $8; Lift/Edge & Corner Correction (includes Clean + Polish) — $30; Dent Correction (includes Clean + Polish) — $50; Crease Correction (includes Clean + Polish) — $70."),
    heading3("2. How the Process Works"),
    paragraph("Step 1 — Quote: Share photos and card list before drop-off. Step 2 — Approve: Your signature confirms agreement to scope, pricing, and this Agreement. Step 3 — Pay & Drop Off: Full payment due at or before drop-off. Step 4 — Pre-Condition Documentation: Every card photographed before work. Step 5 — Restoration: Unexpected issues pause work until client is contacted. Step 6 — Pick Up: Cards returned in sleeves and toploaders."),
    heading3("3. Payment"),
    paragraph("Full payment required before work begins. We accept PayPal, Venmo, Zelle, and cash. Scope changes require a revised quote; client is not obligated to accept."),
    heading3("4. Risks of Card Restoration"),
    paragraph("4.1 Risk of Worsening: A card's condition may worsen during restoration even with care. 4.2 Pre-Existing Damage: Just Mint Card Care is not responsible for damage documented at intake. 4.3 No Grading Guarantees: We make no guarantees regarding grading outcomes. 4.4 Severely Damaged Cards: If proceeding poses high risk, we contact client first."),
    heading3("5. Cancellations & Refunds"),
    paragraph("Cancel before drop-off for a full refund. Once work begins on a card, that fee is non-refundable. If we cannot safely complete a service, we refund that card's fee in full."),
    heading3("6. Your Responsibilities"),
    paragraph("Provide accurate card condition and authenticity information. Do not submit counterfeit or altered cards. Provide accurate contact information."),
    heading3("7. Turnaround Time"),
    paragraph("We commit to completing your batch within 1 Month of drop-off under normal circumstances and will notify you of any significant delay."),
    heading3("8. Claims & Disputes"),
    paragraph("Claims must be submitted within 5 days of pick-up at justminttcg@gmail.com. We respond within 3 business days. Unresolved disputes handled under Minnesota law."),
    heading3("9. Liability"),
    paragraph("Just Mint TCG's liability is limited to service fees paid. Compensation for our error is based on fair market value at drop-off. Not liable for pre-existing damage, grading outcomes, post-pickup damage, or unrelated losses."),
    heading3("10. Governing Law"),
    paragraph("This Agreement is governed by the laws of the State of Minnesota. Disputes handled in the courts of Hennepin County, Minnesota."),
    divider(),

    heading2("Electronic Signature"),
    paragraph(`✅ Electronically signed on ${dateReadable}.`),
    paragraph("By signing, the client confirms they have read, understood, and agreed to all terms above."),
    divider(),

    heading2("Signature Image Data"),
    paragraph("⚠️ Encoded signature for recovery — do not edit manually."),
  ];

  // Split signature into 1800-char chunks stored as code blocks
  if (order.signatureDataUrl && order.signatureDataUrl !== "[CAPTURED]") {
    const CHUNK = 1800;
    const sig   = order.signatureDataUrl;
    for (let i = 0; i < sig.length; i += CHUNK) {
      const n = Math.floor(i / CHUNK) + 1;
      children.push(code(`[SIG_${n}]${sig.slice(i, i + CHUNK)}[/SIG_${n}]`));
    }
  } else {
    children.push(paragraph("No signature image data captured."));
  }

  try {
    const waiverPage = await notion.pages.create({
      parent: { database_id: WAIVER_DB },
      properties: {
        "Waiver": {
          title: [{ text: { content: `Signed Waiver — ${order.id} | ${order.clientName}` } }],
        },
        "Client Name": {
          rich_text: [{ text: { content: order.clientName } }],
        },
        "Order #": {
          rich_text: [{ text: { content: order.id } }],
        },
        "Service": {
          rich_text: [{ text: { content: services } }],
        },
        "Price": {
          number: total,
        },
        "Cards in Batch": {
          number: (order.cards || []).length,
        },
        "Date Signed": {
          date: { start: dateStr },
        },
        "Signature Status": {
          select: { name: "Signed" },
        },
      },
      children,
    });

    console.log(`✓ Created waiver page for ${order.id}`);
    res.json({ success: true, waiverUrl: waiverPage.url });

  } catch (err) {
    console.error("Waiver creation error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
