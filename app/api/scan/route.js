// app/api/scan/route.js
// -----------------------------------------------------------------------------
// Server-side OCR endpoint.
// The browser sends a receipt photo here; this code calls Gemini with your
// SECRET key and returns clean structured items. The key lives here on the
// server and is never sent to the browser — that's the whole point of this file.
// -----------------------------------------------------------------------------

// Tell Gemini exactly what shape we want back, so we get clean JSON every time.
const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "integer" },
          price: { type: "number" }, // the LINE TOTAL, as a plain number
        },
        required: ["name", "quantity", "price"],
      },
    },
    total: { type: "number" },
    currency: { type: "string" },
  },
  required: ["items"],
};

// const PROMPT = `You are reading a restaurant receipt (likely from Lebanon).
// Extract EVERY ordered line item, in order, exactly as printed.
// For each item return:
// - name: the item name as printed
// - quantity: the count at the START of the line (use 1 if there is none)
// - price: the LINE TOTAL shown on the right, as a plain number ONLY — strip any
//   currency symbol, thousands separators, and trailing letters.
//   Example: "623,000T" becomes 623000. "2,002,500T" becomes 2002500.
// Also return "total" (the grand total in local currency if shown) and "currency".
// Ignore the header, table number, date, VAT line, server name, and thank-you text.
// Only return the real ordered items.`;

const PROMPT = `You are reading a restaurant receipt (likely from Lebanon).
Extract EVERY ordered line item, in order, exactly as printed.

For each item return:
- name: the item name as printed
- quantity: the count at the START of the line (use 1 if there is none)
- price: the LINE TOTAL on the right, as a plain number ONLY — strip any currency
  symbol, thousands separators, and trailing letters.
  Example: "623,000T" -> 623000    "2,002,500T" -> 2002500

Read every digit carefully. Do NOT drop, add, or round any digit. A price with a
missing or extra zero is a serious error. Preserve the exact number of digits printed.

VERIFY BEFORE ANSWERING: the receipt prints a grand TOTAL. Add up all the line-item
prices you extracted and compare that sum to the printed total. If they do not match,
re-examine the prices — a mismatch is almost always one misread digit, usually a
missing or extra zero — and fix them until the sum equals the printed total.

Also return "total" (the printed grand total as a plain number) and "currency".
Ignore the header, table number, date, VAT line, server name, and thank-you text.
Only return the real ordered items.`;

export async function POST(req) {
  try {
    const { imageBase64, mimeType } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY is not set. Add it to .env.local and restart." },
        { status: 500 }
      );
    }
    if (!imageBase64) {
      return Response.json({ error: "No image received." }, { status: 400 });
    }

    const body = {
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    };

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        { error: data?.error?.message || "The OCR request failed." },
        { status: 500 }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "Could not read the receipt clearly. Try a sharper, flatter photo." },
        { status: 502 }
      );
    }

    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}