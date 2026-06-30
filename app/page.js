// "use client";

// import React, { useState, useMemo, useRef } from "react";
// import { Plus, Trash2, Users, Receipt, ArrowRight, Scissors, Camera } from "lucide-react";

// /*
//   Fattoura — split the bill
//   --------------------------------------------------------------
//   Scan a receipt, assign each item to whoever shared it (price splits
//   equally among them), then enter how much each person paid (in LL or $).
//   The app converts everything to one currency and works out who pays whom.

//   Tip is split EQUALLY among everyone in the list.
//   Lebanese receipt prices already INCLUDE the 11% VAT, so each price is final.
// */

// const C = {
//   bg: "#20251b", paper: "#f7f4ec", ink: "#23241f", inkSoft: "#7a7c70",
//   line: "#e6e1d4", accent: "#d8552e", accentSoft: "#fbe9e0", good: "#3f7d56", warn: "#b5402a",
// };
// const PERSON_COLORS = ["#d8552e", "#3f7d56", "#2f6f9f", "#b8852b", "#8b4a8f", "#c2406a", "#557d3f", "#9a5b2e"];
// const mono = { fontFamily: "ui-monospace, Menlo, monospace", fontVariantNumeric: "tabular-nums" };
// const fmtLBP = (n) => Math.round(n).toLocaleString("en-US");
// const fmtUSD = (n, rate) => (n / rate).toFixed(2);

// const SEED_PEOPLE = [].map(
//   (name, i) => ({ id: "p" + i, name, color: PERSON_COLORS[i % PERSON_COLORS.length] })
// );
// const SEED_ITEMS = [].map(([name, price, qty], i) => ({ id: "i" + i, name, price, qty, sharers: [] }));

// function fileToResizedBase64(file, maxDim = 2000, quality = 0.9) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onerror = reject;
//     reader.onload = () => {
//       const img = new Image();
//       img.onerror = reject;
//       img.onload = () => {
//         const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
//         const w = Math.round(img.width * scale);
//         const h = Math.round(img.height * scale);
//         const canvas = document.createElement("canvas");
//         canvas.width = w; canvas.height = h;
//         canvas.getContext("2d").drawImage(img, 0, 0, w, h);
//         const dataUrl = canvas.toDataURL("image/jpeg", quality);
//         resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
//       };
//       img.src = reader.result;
//     };
//     reader.readAsDataURL(file);
//   });
// }

// export default function SplitTheBill() {
//   const [people, setPeople] = useState(SEED_PEOPLE);
//   const [items, setItems] = useState(SEED_ITEMS);
//   const [paidById, setPaidById] = useState({}); // personId -> { amount, ccy: "LL" | "USD" }
//   const [tip, setTip] = useState(0);
//   const [rate, setRate] = useState(89000);
//   const [scanning, setScanning] = useState(false);
//   const [scanError, setScanError] = useState("");
//   const fileRef = useRef(null);

//   // --- scanning ---
//   const onPickFile = async (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setScanError("");
//     setScanning(true);
//     try {
//       const { base64, mimeType } = await fileToResizedBase64(file);
//       const res = await fetch("/api/scan", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ imageBase64: base64, mimeType }),
//       });
//       const data = await res.json();
//       if (!res.ok || data.error) throw new Error(data.error || "Scan failed");
//       const scanned = (data.items || []).map((it, i) => ({
//         id: "scan" + Date.now() + "-" + i,
//         name: it.name || "Item",
//         price: Number(it.price) || 0,
//         qty: Number(it.quantity) || 1,
//         sharers: [],
//       }));
//       if (scanned.length) setItems(scanned);
//       else setScanError("No items found. Try a sharper, flatter photo.");
//     } catch (err) {
//       setScanError(err.message || "Could not read the receipt.");
//     } finally {
//       setScanning(false);
//       e.target.value = "";
//     }
//   };

//   // --- people ---
//   const addPerson = () => {
//     const i = people.length;
//     setPeople([...people, { id: "p" + Date.now(), name: "Person " + (i + 1), color: PERSON_COLORS[i % PERSON_COLORS.length] }]);
//   };
//   const renamePerson = (id, name) => setPeople(people.map((p) => (p.id === id ? { ...p, name } : p)));
//   const removePerson = (id) => {
//     setPeople(people.filter((p) => p.id !== id));
//     setItems(items.map((it) => ({ ...it, sharers: it.sharers.filter((s) => s !== id) })));
//     const next = { ...paidById }; delete next[id]; setPaidById(next);
//   };
//   const setPaidAmount = (id, amount) =>
//     setPaidById({ ...paidById, [id]: { ...(paidById[id] || { ccy: "LL" }), amount } });
//   const setPaidCcy = (id, ccy) =>
//     setPaidById({ ...paidById, [id]: { ...(paidById[id] || { amount: 0 }), ccy } });

//   // --- items ---
//   const setItem = (id, patch) => setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
//   const toggleSharer = (itemId, personId) =>
//     setItems(items.map((it) => {
//       if (it.id !== itemId) return it;
//       const on = it.sharers.includes(personId);
//       return { ...it, sharers: on ? it.sharers.filter((s) => s !== personId) : [...it.sharers, personId] };
//     }));
//   const addItem = () => setItems([...items, { id: "i" + Date.now(), name: "", price: 0, qty: 1, sharers: [] }]);
//   const removeItem = (id) => setItems(items.filter((it) => it.id !== id));
//   const splitItem = (id) =>
//     setItems(items.flatMap((it) => {
//       if (it.id !== id || it.qty <= 1) return [it];
//       const n = it.qty;
//       const base = Math.floor(it.price / n);
//       const remainder = it.price - base * n;
//       return Array.from({ length: n }, (_, k) => ({
//         id: it.id + "-u" + k, name: it.name + " #" + (k + 1),
//         price: base + (k < remainder ? 1 : 0), qty: 1, sharers: [],
//       }));
//     }));

//   // --- what each person OWES (their share of items + an EQUAL slice of tip) ---
//   const summary = useMemo(() => {
//     const subtotal = Object.fromEntries(people.map((p) => [p.id, 0]));
//     let unassigned = 0, grand = 0;
//     for (const it of items) {
//       grand += it.price;
//       if (it.sharers.length === 0) { unassigned += it.price; continue; }
//       const share = it.price / it.sharers.length;
//       for (const s of it.sharers) if (s in subtotal) subtotal[s] += share;
//     }
//     const tipPerPerson = people.length > 0 ? tip / people.length : 0;
//     const totals = Object.fromEntries(
//       people.map((p) => [p.id, subtotal[p.id] + tipPerPerson])
//     );
//     return { totals, unassigned, grand };
//   }, [people, items, tip]);

//   const grandWithTip = summary.grand + Number(tip || 0);

//   // --- balances + settlement (paid converted to LL via rate) ---
//   const settlement = useMemo(() => {
//     const rows = people.map((p) => {
//       const owed = summary.totals[p.id] || 0;
//       const entry = paidById[p.id] || {};
//       const amt = Number(entry.amount) || 0;
//       const paid = entry.ccy === "USD" ? amt * rate : amt; // everything in LL
//       return { id: p.id, name: p.name, color: p.color, owed, paid, net: paid - owed };
//     });
//     const totalPaid = rows.reduce((a, r) => a + r.paid, 0);

//     const debtors = rows.filter((r) => r.net < -0.5).map((r) => ({ ...r, amt: -r.net })).sort((a, b) => b.amt - a.amt);
//     const creditors = rows.filter((r) => r.net > 0.5).map((r) => ({ ...r, amt: r.net })).sort((a, b) => b.amt - a.amt);
//     const transfers = [];
//     let i = 0, j = 0;
//     while (i < debtors.length && j < creditors.length) {
//       const amount = Math.min(debtors[i].amt, creditors[j].amt);
//       transfers.push({ from: debtors[i], to: creditors[j], amount });
//       debtors[i].amt -= amount; creditors[j].amt -= amount;
//       if (debtors[i].amt < 0.5) i++;
//       if (creditors[j].amt < 0.5) j++;
//     }
//     return { rows, totalPaid, transfers };
//   }, [people, summary, paidById, rate]);

//   const paidGap = grandWithTip - settlement.totalPaid;
//   const paidEnough = settlement.totalPaid + 0.5 >= grandWithTip; // green when equal or greater

//   return (
//     <div style={{ background: C.bg, minHeight: "100%", padding: "20px 12px", fontFamily: "system-ui, sans-serif" }}>
//       <div style={{ maxWidth: 460, margin: "0 auto" }}>

//         <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.paper, marginBottom: 4 }}>
//           <Receipt size={22} />
//           <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0.3 }}>Fattoura</div>
//         </div>
//         <div style={{ color: C.paper, opacity: 0.6, fontSize: 12, marginBottom: 14, paddingLeft: 32 }}>Splitting, the easy way</div>

//         {/* scan */}
//         <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
//         <button onClick={() => fileRef.current?.click()} disabled={scanning}
//           style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
//             background: C.accent, color: "#fff", border: "none", borderRadius: 12, padding: "13px",
//             fontSize: 15, fontWeight: 700, cursor: scanning ? "default" : "pointer", opacity: scanning ? 0.7 : 1, marginBottom: 12 }}>
//           <Camera size={18} /> {scanning ? "Reading receipt…" : "Scan receipt"}
//         </button>
//         {scanError && (
//           <div style={{ background: C.accentSoft, color: C.warn, borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>
//             {scanError}
//           </div>
//         )}

//         {/* people */}
//         <Panel>
//           <Label icon={<Users size={14} />}>Who was there?</Label>
//           <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
//             {people.map((p) => (
//               <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 6px 4px 10px" }}>
//                 <span style={{ width: 9, height: 9, borderRadius: 999, background: p.color }} />
//                 <input value={p.name} onChange={(e) => renamePerson(p.id, e.target.value)}
//                   style={{ border: "none", outline: "none", width: 74, fontSize: 13, color: C.ink, background: "transparent" }} />
//                 <button onClick={() => removePerson(p.id)} style={iconBtn}><Trash2 size={13} color={C.inkSoft} /></button>
//               </div>
//             ))}
//             <button onClick={addPerson} style={{ ...pill, borderStyle: "dashed", color: C.accent, borderColor: C.accent }}>
//               <Plus size={14} /> Add person
//             </button>
//           </div>
//         </Panel>

//         {/* items */}
//         <Panel>
//           <Label>Items — tap the people who shared each one</Label>
//           <div style={{ marginTop: 6 }}>
//             {items.map((it) => {
//               const per = it.sharers.length ? it.price / it.sharers.length : 0;
//               return (
//                 <div key={it.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
//                   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                     <input value={it.name} placeholder="Item name" onChange={(e) => setItem(it.id, { name: e.target.value })}
//                       style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: C.ink, background: "transparent" }} />
//                     {it.qty > 1 && (
//                       <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentSoft, borderRadius: 6, padding: "2px 6px" }}>×{it.qty}</span>
//                     )}
//                     <input type="number" value={it.price} onChange={(e) => setItem(it.id, { price: Number(e.target.value) })}
//                       style={{ width: 92, textAlign: "right", border: "none", outline: "none", fontSize: 14, color: C.ink, background: "transparent", ...mono }} />
//                     <button onClick={() => removeItem(it.id)} style={iconBtn}><Trash2 size={13} color={C.inkSoft} /></button>
//                   </div>
//                   {it.qty > 1 && (
//                     <button onClick={() => splitItem(it.id)}
//                       style={{ ...pill, fontSize: 12, padding: "3px 9px", marginTop: 8, color: C.accent, borderColor: C.accent, background: "#fff" }}>
//                       <Scissors size={12} /> Split into {it.qty} separate units
//                     </button>
//                   )}
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
//                     {people.map((p) => {
//                       const on = it.sharers.includes(p.id);
//                       return (
//                         <button key={p.id} onClick={() => toggleSharer(it.id, p.id)}
//                           style={{ ...pill, fontSize: 12, padding: "3px 9px",
//                             background: on ? p.color : "#fff", color: on ? "#fff" : C.inkSoft, borderColor: on ? p.color : C.line }}>
//                           {p.name}
//                         </button>
//                       );
//                     })}
//                   </div>
//                   {it.sharers.length > 0 && (
//                     <div style={{ ...mono, fontSize: 11, color: C.inkSoft, marginTop: 6 }}>
//                       {fmtLBP(per)} LL each · split {it.sharers.length} way{it.sharers.length > 1 ? "s" : ""}
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//           <button onClick={addItem} style={{ ...pill, borderStyle: "dashed", color: C.accent, borderColor: C.accent, marginTop: 12 }}>
//             <Plus size={14} /> Add item
//           </button>
//         </Panel>

//         {/* tip + rate */}
//         <Panel>
//           <Row label="Tip / service (LL)">
//             <input type="number" value={tip} onChange={(e) => setTip(Number(e.target.value))} style={{ ...numInput, ...mono }} />
//           </Row>
//           <Row label="Rate (LL per $1)">
//             <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value) || 1)} style={{ ...numInput, ...mono }} />
//           </Row>
//         </Panel>

//         {/* who paid (and how much) — border turns green once the bill is covered */}
//         <Panel glow={paidEnough ? C.good : C.warn}>
//           <Label>Who paid, and how much?</Label>
//           <div style={{ marginTop: 6 }}>
//             {people.map((p) => {
//               const entry = paidById[p.id] || {};
//               const ccy = entry.ccy || "LL";
//               return (
//                 <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0" }}>
//                   <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink }}>
//                     <span style={{ width: 9, height: 9, borderRadius: 999, background: p.color }} />
//                     {p.name}
//                   </span>
//                   <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//                     <input type="number" placeholder="0" value={entry.amount ?? ""}
//                       onChange={(e) => setPaidAmount(p.id, Number(e.target.value))}
//                       style={{ ...numInput, width: 96, ...mono }} />
//                     <button onClick={() => setPaidCcy(p.id, ccy === "USD" ? "LL" : "USD")}
//                       style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 8, padding: "5px 0", width: 42, fontSize: 12, fontWeight: 700, color: C.ink, cursor: "pointer" }}>
//                       {ccy === "USD" ? "$" : "LL"}
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//           <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.inkSoft }}>
//             <span>Paid so far</span>
//             <span style={{ textAlign: "right" }}>
//               <span style={{ ...mono, display: "block", color: C.ink }}>{fmtLBP(settlement.totalPaid)} / {fmtLBP(grandWithTip)} LL</span>
//               <span style={mono}>${fmtUSD(settlement.totalPaid, rate)} / ${fmtUSD(grandWithTip, rate)}</span>
//             </span>
//           </div>
//           {Math.abs(paidGap) > 0.5 && (
//             <div style={{ fontSize: 12, color: C.warn, marginTop: 4 }}>
//               {paidGap > 0
//                 ? `${fmtLBP(paidGap)} LL of the bill isn't covered yet.`
//                 : `Paid is ${fmtLBP(-paidGap)} LL more than the bill.`}
//               <br />

//               {paidGap > 0
//                 ? `${fmtUSD(paidGap, rate)} $ of the bill isn't covered yet.`
//                 : `Paid is ${fmtUSD(-paidGap, rate)} $ more than the bill.`}
//             </div>
            
//           )}
//         </Panel>

//         {/* settle up */}
//         <Panel>
//           <Label>Settle up</Label>
//           <div style={{ marginTop: 8 }}>
//             {settlement.rows.map((r) => {
//               const settled = Math.abs(r.net) < 0.5;
//               return (
//                 <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
//                   <span style={{ width: 9, height: 9, borderRadius: 999, background: r.color }} />
//                   <span style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>{r.name}</span>
//                   <span style={{ ...mono, fontSize: 10, color: C.inkSoft }}>paid {fmtLBP(r.paid)} · owed {fmtLBP(r.owed)}</span>
//                   <span style={{ marginLeft: "auto", textAlign: "right" }}>
//                     {settled
//                       ? <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>settled</span>
//                       : (
//                         <>
//                           <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: r.net > 0 ? C.good : C.accent }}>
//                             {fmtLBP(Math.abs(r.net))} LL
//                           </span>
//                           <span style={{ fontSize: 10, color: C.inkSoft, display: "block" }}>{r.net > 0 ? "gets back" : "owes"}</span>
//                         </>
//                       )}
//                   </span>
//                 </div>
//               );
//             })}
//           </div>

//           {settlement.transfers.length > 0 && (
//             <div style={{ marginTop: 14 }}>
//               <Label>Who pays whom</Label>
//               <div style={{ marginTop: 4 }}>
//                 {settlement.transfers.map((t, i) => (
//                   <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
//                     <span style={{ width: 8, height: 8, borderRadius: 999, background: t.from.color }} />
//                     <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{t.from.name}</span>
//                     <ArrowRight size={13} color={C.inkSoft} />
//                     <span style={{ width: 8, height: 8, borderRadius: 999, background: t.to.color }} />
//                     <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{t.to.name}</span>
//                     <span style={{ marginLeft: "auto", textAlign: "right" }}>
//                       <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: C.accent }}>{fmtLBP(t.amount)} LL</span>
//                       <span style={{ ...mono, fontSize: 10, color: C.inkSoft, display: "block" }}>${fmtUSD(t.amount, rate)}</span>
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {summary.unassigned > 0 && (
//             <div style={{ marginTop: 10, fontSize: 12, color: C.warn }}>
//               <span style={mono}>{fmtLBP(summary.unassigned)} LL</span> still unassigned — tap people on those items.
//             </div>
//           )}

//           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, paddingTop: 12, borderTop: `2px solid ${C.ink}` }}>
//             <span style={{ fontSize: 13, color: C.inkSoft }}>Grand total {tip > 0 ? "(incl. tip)" : ""}</span>
//             <span style={{ textAlign: "right" }}>
//               <span style={{ ...mono, fontSize: 18, fontWeight: 800, color: C.accent }}>{fmtLBP(grandWithTip)} LL</span>
//               <span style={{ ...mono, fontSize: 12, color: C.inkSoft, display: "block" }}>${fmtUSD(grandWithTip, rate)}</span>
//             </span>
//           </div>
//         </Panel>

//         <div style={{ textAlign: "center", color: C.paper, opacity: 0.4, fontSize: 11, marginTop: 8 }}>nothing is saved · everything stays on this screen</div>
//       </div>
//     </div>
//   );
// }

// function Panel({ children, accent, glow }) {
//   const ring = glow ? `0 0 0 2px ${glow}` : accent ? `0 0 0 2px ${C.accent}` : "0 1px 0 rgba(0,0,0,0.04)";
//   return (
//     <div style={{ background: C.paper, borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: ring }}>
//       {children}
//     </div>
//   );
// }
// function Label({ children, icon }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: C.inkSoft }}>
//       {icon}{children}
//     </div>
//   );
// }
// function Row({ label, children }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0" }}>
//       <span style={{ fontSize: 13, color: C.ink }}>{label}</span>
//       {children}
//     </div>
//   );
// }
// const pill = { display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 11px", fontSize: 13, background: "#fff", cursor: "pointer" };
// const iconBtn = { border: "none", background: "transparent", cursor: "pointer", padding: 3, display: "flex" };
// const numInput = { width: 120, textAlign: "right", border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 8px", fontSize: 13, color: C.ink };

"use client";

import React, { useState, useMemo, useRef } from "react";
import { Plus, Trash2, Users, Receipt, ArrowRight, Scissors, Camera } from "lucide-react";

/*
  Fattoura — split the bill
  --------------------------------------------------------------
  Scan a receipt, assign each item to whoever shared it, then enter how
  much each person paid (in LL or $). Everything is converted to one base
  currency (LL) for the math, and shown in both LL and $.

  Per-item currency: an item priced BELOW 5,000 is read as US dollars,
  5,000 or above is read as Lebanese lira. Each item is judged on its own,
  so a receipt can mix $ and LL items.

  Tip is split EQUALLY among everyone in the list.
*/

const C = {
  bg: "#20251b", paper: "#f7f4ec", ink: "#23241f", inkSoft: "#7a7c70",
  line: "#e6e1d4", accent: "#d8552e", accentSoft: "#fbe9e0", good: "#3f7d56", warn: "#b5402a",
};
const PERSON_COLORS = ["#d8552e", "#3f7d56", "#2f6f9f", "#b8852b", "#8b4a8f", "#c2406a", "#557d3f", "#9a5b2e"];
const mono = { fontFamily: "ui-monospace, Menlo, monospace", fontVariantNumeric: "tabular-nums" };
const fmtLBP = (n) => Math.round(n).toLocaleString("en-US");
const fmtUSD = (n, rate) => (n / rate).toFixed(2);

// per-item currency rule: below 5,000 => US dollars, otherwise lira
const USD_MAX = 1000;
const itemIsUSD = (price) => price > 0 && price < USD_MAX;
const itemToLL = (price, rate) => (itemIsUSD(price) ? price * rate : price); // value in LL

const SEED_PEOPLE = [].map(
  (name, i) => ({ id: "p" + i, name, color: PERSON_COLORS[i % PERSON_COLORS.length] })
);
const SEED_ITEMS = [].map(([name, price, qty], i) => ({ id: "i" + i, name, price, qty, sharers: [] }));

function fileToResizedBase64(file, maxDim = 2000, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function SplitTheBill() {
  const [people, setPeople] = useState(SEED_PEOPLE);
  const [items, setItems] = useState(SEED_ITEMS);
  const [paidById, setPaidById] = useState({}); // personId -> { amount, ccy: "LL" | "USD" }
  const [tip, setTip] = useState(0);
  const [rate, setRate] = useState(89000);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const fileRef = useRef(null);

  // --- scanning ---
  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError("");
    setScanning(true);
    try {
      const { base64, mimeType } = await fileToResizedBase64(file);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Scan failed");
      const scanned = (data.items || []).map((it, i) => ({
        id: "scan" + Date.now() + "-" + i,
        name: it.name || "Item",
        price: Number(it.price) || 0,
        qty: Number(it.quantity) || 1,
        sharers: [],
      }));
      if (scanned.length) setItems(scanned);
      else setScanError("No items found. Try a sharper, flatter photo.");
    } catch (err) {
      setScanError(err.message || "Could not read the receipt.");
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  // --- people ---
  const addPerson = () => {
    const i = people.length;
    setPeople([...people, { id: "p" + Date.now(), name: "", color: PERSON_COLORS[i % PERSON_COLORS.length] }]);
  };
  const renamePerson = (id, name) => setPeople(people.map((p) => (p.id === id ? { ...p, name } : p)));
  const removePerson = (id) => {
    setPeople(people.filter((p) => p.id !== id));
    setItems(items.map((it) => ({ ...it, sharers: it.sharers.filter((s) => s !== id) })));
    const next = { ...paidById }; delete next[id]; setPaidById(next);
  };
  const setPaidAmount = (id, amount) =>
    setPaidById({ ...paidById, [id]: { ...(paidById[id] || { ccy: "LL" }), amount } });
  const setPaidCcy = (id, ccy) =>
    setPaidById({ ...paidById, [id]: { ...(paidById[id] || { amount: 0 }), ccy } });

  // --- items ---
  const setItem = (id, patch) => setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const toggleSharer = (itemId, personId) =>
    setItems(items.map((it) => {
      if (it.id !== itemId) return it;
      const on = it.sharers.includes(personId);
      return { ...it, sharers: on ? it.sharers.filter((s) => s !== personId) : [...it.sharers, personId] };
    }));
  const addItem = () => setItems([...items, { id: "i" + Date.now(), name: "", price: 0, qty: 1, sharers: [] }]);
  const removeItem = (id) => setItems(items.filter((it) => it.id !== id));

  // Split a quantity-N line into N equal units.
  // Work in the item's smallest unit so the parts always sum back to the
  // original: CENTS for dollar items (2 decimals), whole POUNDS for lira.
  const splitItem = (id) =>
    setItems(items.flatMap((it) => {
      if (it.id !== id || it.qty <= 1) return [it];
      const n = it.qty;
      const decimals = itemIsUSD(it.price) ? 2 : 0;
      const factor = Math.pow(10, decimals);
      const totalUnits = Math.round(it.price * factor);
      const base = Math.floor(totalUnits / n);
      const remainder = totalUnits - base * n;
      return Array.from({ length: n }, (_, k) => ({
        id: it.id + "-u" + k,
        name: it.name + " #" + (k + 1),
        price: (base + (k < remainder ? 1 : 0)) / factor,
        qty: 1,
        sharers: [],
      }));
    }));

  // --- what each person OWES (each item converted to LL by its own currency) ---
  const summary = useMemo(() => {
    const subtotal = Object.fromEntries(people.map((p) => [p.id, 0]));
    let unassigned = 0, grand = 0;
    for (const it of items) {
      const priceLL = itemToLL(it.price, rate);
      grand += priceLL;
      if (it.sharers.length === 0) { unassigned += priceLL; continue; }
      const share = priceLL / it.sharers.length;
      for (const s of it.sharers) if (s in subtotal) subtotal[s] += share;
    }
    const tipPerPerson = people.length > 0 ? tip / people.length : 0;
    const totals = Object.fromEntries(
      people.map((p) => [p.id, subtotal[p.id] + tipPerPerson])
    );
    return { totals, unassigned, grand };
  }, [people, items, tip, rate]);

  const grandWithTip = summary.grand + Number(tip || 0);

  // --- balances + settlement (paid converted to LL via rate) ---
  const settlement = useMemo(() => {
    const rows = people.map((p) => {
      const owed = summary.totals[p.id] || 0;
      const entry = paidById[p.id] || {};
      const amt = Number(entry.amount) || 0;
      const paid = entry.ccy === "USD" ? amt * rate : amt; // everything in LL
      return { id: p.id, name: p.name, color: p.color, owed, paid, net: paid - owed };
    });
    const totalPaid = rows.reduce((a, r) => a + r.paid, 0);

    const debtors = rows.filter((r) => r.net < -0.5).map((r) => ({ ...r, amt: -r.net })).sort((a, b) => b.amt - a.amt);
    const creditors = rows.filter((r) => r.net > 0.5).map((r) => ({ ...r, amt: r.net })).sort((a, b) => b.amt - a.amt);
    const transfers = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].amt, creditors[j].amt);
      transfers.push({ from: debtors[i], to: creditors[j], amount });
      debtors[i].amt -= amount; creditors[j].amt -= amount;
      if (debtors[i].amt < 0.5) i++;
      if (creditors[j].amt < 0.5) j++;
    }
    return { rows, totalPaid, transfers };
  }, [people, summary, paidById, rate]);

  const paidGap = grandWithTip - settlement.totalPaid;
  const paidEnough = settlement.totalPaid + 0.5 >= grandWithTip;

  return (
    <div style={{ background: C.bg, minHeight: "100%", padding: "20px 12px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.paper, marginBottom: 4 }}>
          <Receipt size={22} />
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0.3 }}>Fattoura</div>
        </div>
        <div style={{ color: C.paper, opacity: 0.6, fontSize: 12, marginBottom: 14, paddingLeft: 32 }}>Splitting, the easy way</div>

        {/* scan */}
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
        <button onClick={() => fileRef.current?.click()} disabled={scanning}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: C.accent, color: "#fff", border: "none", borderRadius: 12, padding: "13px",
            fontSize: 15, fontWeight: 700, cursor: scanning ? "default" : "pointer", opacity: scanning ? 0.7 : 1, marginBottom: 12 }}>
          <Camera size={18} /> {scanning ? "Reading receipt…" : "Scan receipt"}
        </button>
        {scanError && (
          <div style={{ background: C.accentSoft, color: C.warn, borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>
            {scanError}
          </div>
        )}

        {/* people */}
        <Panel>
          <Label icon={<Users size={14} />}>Who was there?</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {people.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 6px 4px 10px" }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: p.color }} />
                <input value={p.name} onChange={(e) => renamePerson(p.id, e.target.value)}
                  style={{ border: "none", outline: "none", width: 74, fontSize: 13, color: C.ink, background: "transparent" }} />
                <button onClick={() => removePerson(p.id)} style={iconBtn}><Trash2 size={13} color={C.inkSoft} /></button>
              </div>
            ))}
            <button onClick={addPerson} style={{ ...pill, borderStyle: "dashed", color: C.accent, borderColor: C.accent }}>
              <Plus size={14} /> Add person
            </button>
          </div>
        </Panel>

        {/* items */}
        <Panel>
          <Label>Items — tap the people who shared each one</Label>
          <div style={{ marginTop: 6 }}>
            {items.map((it) => {
              const isUSD = itemIsUSD(it.price);
              const per = it.sharers.length ? it.price / it.sharers.length : 0;
              return (
                <div key={it.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input value={it.name} placeholder="Item name" onChange={(e) => setItem(it.id, { name: e.target.value })}
                      style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: C.ink, background: "transparent" }} />
                    {it.qty > 1 && (
                      <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentSoft, borderRadius: 6, padding: "2px 6px" }}>×{it.qty}</span>
                    )}
                    <span title={isUSD ? "read as US dollars" : "read as lira"}
                      style={{ ...mono, fontSize: 10, fontWeight: 700, color: isUSD ? C.accent : C.inkSoft,
                        border: `1px solid ${isUSD ? C.accent : C.line}`, borderRadius: 5, padding: "1px 5px" }}>
                      {isUSD ? "$" : "LL"}
                    </span>
                    <input type="number" value={it.price} onChange={(e) => setItem(it.id, { price: Number(e.target.value) })}
                      style={{ width: 84, textAlign: "right", border: "none", outline: "none", fontSize: 14, color: C.ink, background: "transparent", ...mono }} />
                    <button onClick={() => removeItem(it.id)} style={iconBtn}><Trash2 size={13} color={C.inkSoft} /></button>
                  </div>
                  {it.qty > 1 && (
                    <button onClick={() => splitItem(it.id)}
                      style={{ ...pill, fontSize: 12, padding: "3px 9px", marginTop: 8, color: C.accent, borderColor: C.accent, background: "#fff" }}>
                      <Scissors size={12} /> Split into {it.qty} separate units
                    </button>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {people.map((p) => {
                      const on = it.sharers.includes(p.id);
                      return (
                        <button key={p.id} onClick={() => toggleSharer(it.id, p.id)}
                          style={{ ...pill, fontSize: 12, padding: "3px 9px",
                            background: on ? p.color : "#fff", color: on ? "#fff" : C.inkSoft, borderColor: on ? p.color : C.line }}>
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                  {it.sharers.length > 0 && (
                    <div style={{ ...mono, fontSize: 11, color: C.inkSoft, marginTop: 6 }}>
                      {isUSD ? `$${per.toFixed(2)}` : `${fmtLBP(per)} LL`} each · split {it.sharers.length} way{it.sharers.length > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={addItem} style={{ ...pill, borderStyle: "dashed", color: C.accent, borderColor: C.accent, marginTop: 12 }}>
            <Plus size={14} /> Add item
          </button>
        </Panel>

        {/* tip + rate */}
        <Panel>
          <Row label="Tip / service (LL)">
            <input type="number" value={tip} onChange={(e) => setTip(Number(e.target.value))} style={{ ...numInput, ...mono }} />
          </Row>
          <Row label="Rate (LL per $1)">
            <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value) || 1)} style={{ ...numInput, ...mono }} />
          </Row>
        </Panel>

        {/* who paid (and how much) — border turns green once the bill is covered */}
        <Panel glow={paidEnough ? C.good : C.warn}>
          <Label>Who paid, and how much?</Label>
          <div style={{ marginTop: 6 }}>
            {people.map((p) => {
              const entry = paidById[p.id] || {};
              const ccy = entry.ccy || "LL";
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: p.color }} />
                    {p.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" placeholder="0" value={entry.amount ?? ""}
                      onChange={(e) => setPaidAmount(p.id, Number(e.target.value))}
                      style={{ ...numInput, width: 96, ...mono }} />
                    <button onClick={() => setPaidCcy(p.id, ccy === "USD" ? "LL" : "USD")}
                      style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 8, padding: "5px 0", width: 42, fontSize: 12, fontWeight: 700, color: C.ink, cursor: "pointer" }}>
                      {ccy === "USD" ? "$" : "LL"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.inkSoft }}>
            <span>Paid so far</span>
            <span style={{ textAlign: "right" }}>
              <span style={{ ...mono, display: "block", color: C.ink }}>{fmtLBP(settlement.totalPaid)} / {fmtLBP(grandWithTip)} LL</span>
              <span style={mono}>${fmtUSD(settlement.totalPaid, rate)} / ${fmtUSD(grandWithTip, rate)}</span>
            </span>
          </div>
          {Math.abs(paidGap) > 0.5 && (
            <div style={{ fontSize: 12, color: C.warn, marginTop: 4 }}>
              {paidGap > 0
                ? `${fmtLBP(paidGap)} LL ( $${fmtUSD(paidGap, rate)} ) of the bill isn't covered yet.`
                : `Paid is ${fmtLBP(-paidGap)} LL ( $${fmtUSD(-paidGap, rate)} ) more than the bill.`}
            </div>
          )}
        </Panel>

        {/* settle up */}
        <Panel>
          <Label>Settle up</Label>
          <div style={{ marginTop: 8 }}>
            {settlement.rows.map((r) => {
              const settled = Math.abs(r.net) < 0.5;
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: r.color }} />
                  <span style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ ...mono, fontSize: 10, color: C.inkSoft }}>paid {fmtLBP(r.paid)} · owed {fmtLBP(r.owed)}</span>
                  <span style={{ marginLeft: "auto", textAlign: "right" }}>
                    {settled
                      ? <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>settled</span>
                      : (
                        <>
                          <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: r.net > 0 ? C.good : C.accent }}>
                            {fmtLBP(Math.abs(r.net))} LL
                          </span>
                          <span style={{ ...mono, fontSize: 10, color: C.inkSoft, display: "block" }}>${fmtUSD(Math.abs(r.net), rate)} · {r.net > 0 ? "gets back" : "owes"}</span>
                        </>
                      )}
                  </span>
                </div>
              );
            })}
          </div>

          {settlement.transfers.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Label>Who pays whom</Label>
              <div style={{ marginTop: 4 }}>
                {settlement.transfers.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: t.from.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{t.from.name}</span>
                    <ArrowRight size={13} color={C.inkSoft} />
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: t.to.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{t.to.name}</span>
                    <span style={{ marginLeft: "auto", textAlign: "right" }}>
                      <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: C.accent }}>{fmtLBP(t.amount)} LL</span>
                      <span style={{ ...mono, fontSize: 10, color: C.inkSoft, display: "block" }}>${fmtUSD(t.amount, rate)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.unassigned > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: C.warn }}>
              <span style={mono}>{fmtLBP(summary.unassigned)} LL</span> still unassigned — tap people on those items.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, paddingTop: 12, borderTop: `2px solid ${C.ink}` }}>
            <span style={{ fontSize: 13, color: C.inkSoft }}>Grand total {tip > 0 ? "(incl. tip)" : ""}</span>
            <span style={{ textAlign: "right" }}>
              <span style={{ ...mono, fontSize: 18, fontWeight: 800, color: C.accent }}>{fmtLBP(grandWithTip)} LL</span>
              <span style={{ ...mono, fontSize: 12, color: C.inkSoft, display: "block" }}>${fmtUSD(grandWithTip, rate)}</span>
            </span>
          </div>
        </Panel>

        <div style={{ textAlign: "center", color: C.paper, opacity: 0.4, fontSize: 11, marginTop: 8 }}>nothing is saved · everything stays on this screen</div>
      </div>
    </div>
  );
}

function Panel({ children, accent, glow }) {
  const ring = glow ? `0 0 0 2px ${glow}` : accent ? `0 0 0 2px ${C.accent}` : "0 1px 0 rgba(0,0,0,0.04)";
  return (
    <div style={{ background: C.paper, borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: ring }}>
      {children}
    </div>
  );
}
function Label({ children, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: C.inkSoft }}>
      {icon}{children}
    </div>
  );
}
function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0" }}>
      <span style={{ fontSize: 13, color: C.ink }}>{label}</span>
      {children}
    </div>
  );
}
const pill = { display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 11px", fontSize: 13, background: "#fff", cursor: "pointer" };
const iconBtn = { border: "none", background: "transparent", cursor: "pointer", padding: 3, display: "flex" };
const numInput = { width: 120, textAlign: "right", border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 8px", fontSize: 13, color: C.ink };