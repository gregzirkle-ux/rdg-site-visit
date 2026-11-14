'use strict';
/* v17 photo order, shared by the Word report, gallery, ZIP, photo index and Save photos.
   'location': report photos grouped by location in the order each was first visited,
   General (no location) first, oldest to newest within a group, numbered continuously.
   'time': visits issued before v17 keep their original order (safety first, numbered by time). */
function photoLocation(r) {
  const value = r && (r.location != null && r.location !== '' ? r.location : r.area);
  return String(value || '').trim();
}
function locationKey(name) { return String(name || '').trim().toLowerCase(); }
/* Saved locations on the wheel: names with a number first, by that number (Level 2, Room 9,
   Room 101), then names without a number alphabetically. Equal numbers sort by name. */
/* v19: mode 'alpha' sorts A to Z; mode 'recent' keeps the saved order, which is most recently
   added or used first. */
function sortLocations(list, mode = 'number') {
  const num = s => { const m = String(s).match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : null; };
  const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  if (mode === 'recent') return [...list];
  if (mode === 'alpha') return [...list].sort(byName);
  return [...list].sort((a, b) => {
    const x = num(a), y = num(b);
    if (x !== null && y !== null) return x - y || byName(a, b);
    if (x !== null || y !== null) return x !== null ? -1 : 1;
    return byName(a, b);
  });
}
/* Search: every word typed must appear in the name, in any order and any case. */
function filterLocations(list, text) {
  const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
  return words.length ? list.filter(name => { const n = String(name).toLowerCase(); return words.every(w => n.includes(w)); }) : [...list];
}
/* Rename in a saved list: the new name takes the old one's place; a duplicate is dropped. */
function renameInList(list, from, to) {
  const out = [];
  for (const name of list) {
    const next = locationKey(name) === locationKey(from) ? to : name;
    if (!out.some(x => locationKey(x) === locationKey(next))) out.push(next);
  }
  if (!out.some(x => locationKey(x) === locationKey(to))) out.unshift(to);
  return out;
}
function reportOrderOf(v) {
  if (v && (v.reportOrder === 'location' || v.reportOrder === 'time')) return v.reportOrder;
  return v && (v.closed || v.editing || (v.history && v.history.length)) ? 'time' : 'location';
}
function groupByLocation(list) {
  const groups = new Map();
  for (const r of list) {
    const key = locationKey(photoLocation(r));
    if (!groups.has(key)) groups.set(key, { key, label: key ? photoLocation(r) : 'General', photos: [], first: r.ts });
    const g = groups.get(key); g.photos.push(r); if (r.ts < g.first) g.first = r.ts;
  }
  return [...groups.values()].sort((a, b) => (a.key === '' ? 0 : 1) - (b.key === '' ? 0 : 1) || a.first - b.first);
}
/* General first, then the report's location order; locations with no report photos come last. */
function followOrder(groups, order) {
  const rank = g => g.key === '' ? -1 : order.has(g.key) ? order.get(g.key) : 1e6;
  return groups.sort((a, b) => rank(a) - rank(b) || a.first - b.first);
}
function photoPlan(visit, recs) {
  const byTime = [...recs].sort((a, b) => a.ts - b.ts);
  const included = byTime.filter(r => !r.omit), extras = byTime.filter(r => r.omit);
  const numbers = new Map(), labels = new Map();
  // One spelling per location: the first one used, so 'room 204' prints as 'Room 204'.
  for (const r of byTime) { const k = locationKey(photoLocation(r)); if (!labels.has(k)) labels.set(k, k ? photoLocation(r) : 'General'); }
  if (reportOrderOf(visit) === 'time') {
    included.forEach((r, i) => numbers.set(r.id, i + 1));
    const ordered = [...included.filter(r => r.tag === 'Safety'), ...included.filter(r => r.tag !== 'Safety')];
    return { mode: 'time', headings: false, groups: [{ key: '', label: '', photos: ordered }], ordered, extras, numbers, labels };
  }
  const groups = groupByLocation(included);
  const ordered = groups.flatMap(g => g.photos);
  ordered.forEach((r, i) => numbers.set(r.id, i + 1));
  const order = new Map(groups.map((g, i) => [g.key, i]));
  // Extras follow the report photos, in the same location order; extra-only locations come last.
  const extraGroups = followOrder(groupByLocation(extras), order);
  return { mode: 'location', headings: groups.some(g => g.key !== ''), groups, ordered, extras: extraGroups.flatMap(g => g.photos), numbers, labels };
}
/* Gallery order: every photo in its location group so a photo does not jump when it is left out. */
function galleryGroups(visit, recs) {
  if (reportOrderOf(visit) === 'time') return [{ key: '', label: '', photos: [...recs].sort((a, b) => a.ts - b.ts) }];
  const plan = photoPlan(visit, recs), order = new Map(plan.groups.map((g, i) => [g.key, i]));
  return followOrder(groupByLocation(recs), order);
}
