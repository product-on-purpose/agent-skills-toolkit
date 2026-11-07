// Compare case-win thresholds with a pooled no-skill baseline. Toy grader profiles, not data.
const N = 20000;
const r = () => Math.random();
const score = (gs, i) => gs.reduce((s, g) => s + (r() < g[i] ? 1 : 0), 0);
const sum3 = (gs, i) => score(gs, i) + score(gs, i) + score(gs, i);
function run(profA, profB, thr, pooled) {
  let pass = 0, scPass = 0;
  for (let it = 0; it < N; it++) {
    let wa = 0, wb = 0;
    for (let k = 0; k < 3; k++) {
      let a = 0, b = 0;
      for (let c = 0; c < 10; c++) {
        const b1 = sum3(profA[c], 0), b2 = sum3(profA[c], 0);
        const baseA = pooled ? (b1 + b2) / 2 : b1;
        const baseB = pooled ? (b1 + b2) / 2 : b2;
        if ((sum3(profA[c], 1) - baseA) / 12 > thr) a++;
        if ((sum3(profB[c], 1) - baseB) / 12 > thr) b++;
      }
      if (a - b >= 2) wa++;
      if (b - a >= 2) wb++;
    }
    if (wa >= 2) pass++;
    if (wb >= 2) scPass++;
  }
  return { c1Pass: +(pass / N).toFixed(3), scWins: +(scPass / N).toFixed(3) };
}
const sub = [0.85, 0.9], easy = [0.85, 0.9];
const mk = (ps) => [[0.03, ps], [0.03, ps], sub, sub];
const half = (ps) => [[0.03, ps], easy, sub, sub];
const flat = [easy, easy, sub, sub];
const rep = (x, n) => Array(n).fill(x);
const mixed = (ps) => [...rep(mk(ps), 4), ...rep(half(ps), 3), ...rep(flat, 3)];
for (const [thr, pooled] of [[0.10, false], [0.10, true], [0.25, true], [0.34, true]]) {
  console.log(`thr>${thr} pooled=${pooled}`);
  console.log('  null, mixed            ', JSON.stringify(run(mixed(0.95), mixed(0.95), thr, pooled)));
  console.log('  gap .95 v .65, two-conv', JSON.stringify(run(rep(mk(0.95), 10), rep(mk(0.65), 10), thr, pooled)));
  console.log('  gap .95 v .65, mixed   ', JSON.stringify(run(mixed(0.95), mixed(0.65), thr, pooled)));
}
