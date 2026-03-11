// 7th Grade Math Practice Quiz (static browser app)
// - 10 questions per quiz
// - typed answers
// - mix of 7th grade topics
// - "show work" toggle
// - keeps best score in localStorage
//
// Teaching mode + progressive hints (Mode 2 requested):
// - For Equations: show Hint 1 after first wrong, Hint 2 after second wrong,
//   unlock Step-by-Step after 3 wrong attempts.
// - Do NOT show the correct answer when wrong.

const QUIZ_LEN = 10;

const el = (id) => document.getElementById(id);

const topicEl = el("topic");
const diffEl = el("difficulty");
const startBtn = el("start-button");

const container = el("problem-container");
const problemEl = el("problem");
const answerEl = el("answer");
const submitBtn = el("submit-button");
const toggleBtn = el("toggle-solution");
const solutionEl = el("solution");
const scoreEl = el("score");
const streakEl = el("streak");

// teaching + hints UI
const teachingDetailsEl = el("teaching-mode");
const teachingContentEl = el("teaching-content");
const hintsBoxEl = el("hints");
const hintContentEl = el("hint-content");

// scratchpad UI
const scratchCanvas = el("scratch-canvas");
const scratchClearBtn = el("scratch-clear");
const scratchSizeEl = el("scratch-size");

// feedback area
const feedbackEl = document.createElement("div");
feedbackEl.className = "feedback";
solutionEl.parentElement.insertBefore(feedbackEl, solutionEl);

let quiz = null;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) { return arr[randInt(0, arr.length - 1)]; }

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
function simplifyFrac(n, d) {
  if (d === 0) return { n, d };
  let sign = 1;
  if (n * d < 0) sign = -1;
  n = Math.abs(n); d = Math.abs(d);
  const g = gcd(n, d);
  return { n: sign * (n / g), d: d / g };
}
function fracToString({n, d}) {
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

function parseTypedNumber(text) {
  const s = (text ?? "").trim().replace(/\s+/g, "");
  if (!s) return null;

  const m = s.match(/^([+-]?\d+)\/(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    const d = parseInt(m[2], 10);
    if (d === 0) return null;
    return { kind: "frac", n, d };
  }

  if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
    return { kind: "num", value: Number(s) };
  }
  return null;
}

function equalAnswer(userParsed, expected) {
  if (!userParsed) return false;

  if (expected.kind === "frac") {
    const exp = simplifyFrac(expected.n, expected.d);
    const expValue = exp.n / exp.d;

    if (userParsed.kind === "frac") {
      const usr = simplifyFrac(userParsed.n, userParsed.d);
      return usr.n === exp.n && usr.d === exp.d;
    }
    if (userParsed.kind === "num") {
      return Math.abs(userParsed.value - expValue) < 1e-9;
    }
    return false;
  }

  if (expected.kind === "num") {
    if (userParsed.kind === "num") return Math.abs(userParsed.value - expected.value) < 1e-9;
    if (userParsed.kind === "frac") {
      const usr = simplifyFrac(userParsed.n, userParsed.d);
      return Math.abs((usr.n / usr.d) - expected.value) < 1e-9;
    }
  }
  return false;
}

function fmtExpected(expected) {
  if (expected.kind === "num") return String(expected.value);
  const s = simplifyFrac(expected.n, expected.d);
  return fracToString(s);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function setTeachingModeContent(p) {
  // default fallback
  const teaching = p.teaching || `Try the problem first. Use hints if needed, then check the step-by-step.`;
  teachingContentEl.innerHTML = `<div>${escapeHtml(teaching).replaceAll("\n", "<br>")}</div>`;
  // keep it open for equations so students see the concept
  if (p.topicKey === "equations") teachingDetailsEl.open = true;
}

function resetHintsUI() {
  hintsBoxEl.style.display = "none";
  hintContentEl.innerHTML = "";
}

function renderHints(p) {
  const hints = p.hints || [];
  const shown = Math.min(p.attempts, hints.length);
  if (shown <= 0) {
    resetHintsUI();
    return;
  }
  hintsBoxEl.style.display = "block";
  hintContentEl.innerHTML = "";
  for (let i = 0; i < shown; i++) {
    const div = document.createElement("div");
    div.textContent = `Hint ${i + 1}: ${hints[i]}`;
    hintContentEl.appendChild(div);
  }
}

function updateSolutionLockUI(p) {
  const unlocked = !!p.solutionUnlocked;
  toggleBtn.disabled = !unlocked;
  toggleBtn.title = unlocked ? "" : "Unlocks after 3 wrong attempts";
  if (!unlocked) {
    solutionEl.style.display = "none";
    toggleBtn.textContent = "Show Step-by-Step Work";
  }
}

/* Scratchpad (NEW) */
function clearScratchpadIfPresent() {
  if (!scratchCanvas) return;
  const ctx = scratchCanvas.getContext("2d");
  ctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
}

function initScratchpad() {
  if (!scratchCanvas) return;

  const ctx = scratchCanvas.getContext("2d");
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#111";

  const getPos = (evt) => {
    const rect = scratchCanvas.getBoundingClientRect();
    const clientX = (evt.touches ? evt.touches[0].clientX : evt.clientX);
    const clientY = (evt.touches ? evt.touches[0].clientY : evt.clientY);
    return {
      x: (clientX - rect.left) * (scratchCanvas.width / rect.width),
      y: (clientY - rect.top) * (scratchCanvas.height / rect.height),
    };
  };

  let drawing = false;
  let last = null;

  const start = (evt) => {
    drawing = true;
    last = getPos(evt);
    evt.preventDefault();
  };

  const move = (evt) => {
    if (!drawing) return;
    const cur = getPos(evt);
    ctx.lineWidth = Number(scratchSizeEl?.value || 3);

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();

    last = cur;
    evt.preventDefault();
  };

  const end = (evt) => {
    drawing = false;
    last = null;
    evt?.preventDefault?.();
  };

  // Mouse
  scratchCanvas.addEventListener("mousedown", start);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);

  // Touch
  scratchCanvas.addEventListener("touchstart", start, { passive: false });
  scratchCanvas.addEventListener("touchmove", move, { passive: false });
  scratchCanvas.addEventListener("touchend", end, { passive: false });

  scratchClearBtn?.addEventListener("click", () => {
    clearScratchpadIfPresent();
  });
}

// Problem generators
function makeProblem(topic, difficulty) {
  switch (topic) {
    case "integers": return makeIntegers(difficulty);
    case "fractions": return makeFractions(difficulty);
    case "ratios": return makeRatios(difficulty);
    case "percent": return makePercent(difficulty);
    case "expressions": return makeExpressions(difficulty);
    case "equations": return makeEquations(difficulty);
    case "geometry": return makeGeometry(difficulty);
    case "statistics": return makeStatistics(difficulty);
    default: return makeMixed(difficulty);
  }
}

function withTeachingState(p, topicKey) {
  // attach state used by teaching/hints/solution lock
  p.topicKey = topicKey;
  p.attempts = 0;
  p.solutionUnlocked = false;
  return p;
}

function makeMixed(difficulty) {
  const topics = ["integers","fractions","ratios","percent","expressions","equations","geometry","statistics"];
  return makeProblem(choice(topics), difficulty);
}

function makeIntegers(difficulty) {
  const ops = difficulty === "easy" ? ["+", "-"]
    : difficulty === "medium" ? ["+", "-", "×"]
    : ["+", "-", "×", "÷"];

  const op = choice(ops);
  let a = difficulty === "easy" ? randInt(-20, 20) : difficulty === "medium" ? randInt(-50, 50) : randInt(-100, 100);
  let b = difficulty === "easy" ? randInt(-20, 20) : difficulty === "medium" ? randInt(-30, 30) : randInt(-50, 50);

  if (op === "÷") {
    b = choice([-12,-10,-8,-6,-5,-4,-3,-2,2,3,4,5,6,8,10,12]);
    const q = randInt(-12, 12);
    a = b * q;
    return withTeachingState({
      topic: "Integers/Rationals",
      prompt: `${a} ÷ ${b} = ?`,
      expected: { kind: "num", value: a / b },
      work: `We compute ${a} ÷ ${b}.\nBecause ${a} = ${b} × ${a/b}, the quotient is ${a/b}.`
    }, "integers");
  }

  if (op === "×") {
    return withTeachingState({
      topic: "Integers/Rationals",
      prompt: `${a} × ${b} = ?`,
      expected: { kind: "num", value: a * b },
      work: `Multiply:\n${a} × ${b} = ${a*b}`
    }, "integers");
  }

  if (op === "+") {
    return withTeachingState({
      topic: "Integers/Rationals",
      prompt: `${a} + ${b} = ?`,
      expected: { kind: "num", value: a + b },
      work: `Add:\n${a} + ${b} = ${a+b}`
    }, "integers");
  }

  return withTeachingState({
    topic: "Integers/Rationals",
    prompt: `${a} − (${b}) = ?`,
    expected: { kind: "num", value: a - b },
    work: `Subtracting ${b} means add ${-b}:\n${a} + (${ -b }) = ${a-b}`
  }, "integers");
}

function makeFractions(difficulty) {
  const op = choice(difficulty === "easy" ? ["+", "-"] : ["+", "-", "×"]);
  const d1 = choice([2,3,4,5,6,8,10,12]);
  const d2 = choice([2,3,4,5,6,8,10,12]);
  let n1 = randInt(1, d1 - 1);
  let n2 = randInt(1, d2 - 1);
  if (difficulty !== "easy") {
    if (Math.random() < 0.3) n1 *= -1;
    if (Math.random() < 0.3) n2 *= -1;
  }

  const f1 = simplifyFrac(n1, d1);
  const f2 = simplifyFrac(n2, d2);
  const s1 = fracToString(f1);
  const s2 = fracToString(f2);

  if (op === "×") {
    const rawN = f1.n * f2.n, rawD = f1.d * f2.d;
    const simp = simplifyFrac(rawN, rawD);
    return withTeachingState({
      topic: "Fractions/Decimals",
      prompt: `${s1} × ${s2} = ? (fraction or decimal)`,
      expected: { kind: "frac", n: simp.n, d: simp.d },
      work:
`Multiply numerators and denominators:
(${f1.n}/${f1.d}) × (${f2.n}/${f2.d}) = ${rawN}/${rawD}
Simplify → ${simp.n}/${simp.d}`
    }, "fractions");
  }

  const sign = op === "+" ? 1 : -1;
  const rawN = f1.n * f2.d + sign * (f2.n * f1.d);
  const rawD = f1.d * f2.d;
  const simp = simplifyFrac(rawN, rawD);

  return withTeachingState({
    topic: "Fractions/Decimals",
    prompt: `${s1} ${op} ${s2} = ? (fraction or decimal)`,
    expected: { kind: "frac", n: simp.n, d: simp.d },
    work:
`Common denominator: ${rawD}
Combine: ${rawN}/${rawD}
Simplify → ${simp.n}/${simp.d}`
  }, "fractions");
}

function makeRatios(difficulty) {
  const mode = choice(["unitRate","proportion"]);

  if (mode === "unitRate") {
    const items = difficulty === "easy" ? randInt(2, 8) : randInt(3, 12);
    const costPer = choice([1,2,3,4,5,6,7,8,9]);
    const total = items * costPer;
    return withTeachingState({
      topic: "Ratios/Proportions",
      prompt: `${items} notebooks cost $${total}. What is the cost per notebook?`,
      expected: { kind: "num", value: costPer },
      work: `Unit rate = ${total} ÷ ${items} = ${costPer}`
    }, "ratios");
  }

  const a = randInt(2, 12);
  const b = randInt(2, 12);
  const c = randInt(2, 12);
  const x = (b * c) / a;
  if ((difficulty !== "hard") && !Number.isInteger(x)) return makeRatios(difficulty);

  const expected = Number.isInteger(x)
    ? { kind: "num", value: x }
    : (() => {
        const simp = simplifyFrac(b * c, a);
        return { kind: "frac", n: simp.n, d: simp.d };
      })();

  return withTeachingState({
    topic: "Ratios/Proportions",
    prompt: `Solve for x: ${a}/${b} = ${c}/x`,
    expected,
    work: `Cross multiply: ${a}x = ${b}·${c} = ${b*c}\nSo x = ${b*c}/${a} = ${fmtExpected(expected)}`
  }, "ratios");
}

function makePercent(difficulty) {
  const mode = choice(["percentOf","discount"]);
  const base = difficulty === "easy" ? randInt(20, 200) : randInt(30, 500);
  const pct = choice(difficulty === "easy" ? [5,10,15,20,25,30,50] : [7,12,18,22,35,40,45,60]);

  if (mode === "percentOf") {
    const value = base * (pct / 100);
    if ((difficulty !== "hard") && Math.abs(value - Math.round(value)) > 1e-9) return makePercent(difficulty);
    const v = (difficulty === "hard") ? Number(value.toFixed(2)) : Math.round(value);
    return withTeachingState({
      topic: "Percent",
      prompt: `What is ${pct}% of ${base}?`,
      expected: { kind: "num", value: v },
      work: `${pct}% = ${pct}/100\n${base} × ${pct/100} = ${v}`
    }, "percent");
  }

  const price = base;
  const newPrice = price * (1 - pct/100);
  if ((difficulty !== "hard") && !Number.isInteger(newPrice)) return makePercent(difficulty);
  const v = (difficulty === "hard") ? Number(newPrice.toFixed(2)) : newPrice;
  return withTeachingState({
    topic: "Percent",
    prompt: `A $${price} item is discounted by ${pct}%. What is the new price?`,
    expected: { kind: "num", value: v },
    work: `New price = ${price} × (1 − ${pct/100}) = ${v}`
  }, "percent");
}

function makeExpressions(difficulty) {
  if (difficulty === "easy") {
    const x = randInt(-5, 10);
    const a = randInt(-6, 10);
    const b = randInt(-10, 10);
    const val = a * x + b;
    return withTeachingState({
      topic: "Expressions",
      prompt: `Evaluate when x = ${x}:  ${a}x + ${b}`,
      expected: { kind: "num", value: val },
      work: `${a}(${x}) + ${b} = ${a*x} + ${b} = ${val}`
    }, "expressions");
  }

  const x = randInt(-4, 8);
  const a = randInt(2, 9) * (Math.random() < 0.25 ? -1 : 1);
  const b = randInt(-8, 8);
  const c = randInt(-8, 8);
  const val = a * (x + b) + c;

  return withTeachingState({
    topic: "Expressions",
    prompt: `Evaluate when x = ${x}:  ${a}(x ${b>=0?"+":"-"} ${Math.abs(b)}) ${c>=0?"+":"-"} ${Math.abs(c)}`,
    expected: { kind: "num", value: val },
    work:
`Inside: x ${b>=0?"+":"-"} ${Math.abs(b)} = ${x+b}
Multiply: ${a}(${x+b}) = ${a*(x+b)}
Then add/subtract ${c}: ${val}`
  }, "expressions");
}

function makeEquations(difficulty) {
  // Teaching Mode content for equations (used for both easy and not-easy)
  const teaching =
`Goal: isolate x (get x by itself).
Two-step order:
1) Undo +/− first (move the constant).
2) Undo ×/÷ second (move the coefficient).

Worked example:
Solve: 3x + 5 = 20
Undo +5: 3x = 15
Undo ×3: x = 5`;

  if (difficulty === "easy") {
    const x = randInt(-10, 15);
    const b = randInt(-12, 12);
    const c = x + b;

    const opSign = b >= 0 ? "+" : "-";
    const undo = b >= 0 ? "subtract" : "add";

    return withTeachingState({
      topic: "Equations",
      prompt: `Solve for x:  x ${opSign} ${Math.abs(b)} = ${c}`,
      expected: { kind: "num", value: x },
      work: `Undo the ${opSign} ${Math.abs(b)}:\nx = ${c} ${b>=0?"-":"+"} ${Math.abs(b)} = ${x}`,
      teaching,
      hints: [
        `To isolate x, ${undo} ${Math.abs(b)} on BOTH sides.`,
        `After you move the constant, x will be alone.`,
        `Do: x = ${c} ${b>=0?"-":"+"} ${Math.abs(b)}`
      ]
    }, "equations");
  }

  const a = choice([2,3,4,5,6,7,8,9]) * (Math.random() < 0.2 ? -1 : 1);
  const x = randInt(-8, 10);
  const b = randInt(-12, 12);
  const c = a * x + b;

  const opSign = b >= 0 ? "+" : "-";
  const undoConst = b >= 0 ? `subtract ${Math.abs(b)}` : `add ${Math.abs(b)}`;

  return withTeachingState({
    topic: "Equations",
    prompt: `Solve for x:  ${a}x ${opSign} ${Math.abs(b)} = ${c}`,
    expected: { kind: "num", value: x },
    work:
`Undo +/− first:
${a}x = ${c} ${b>=0?"-":"+"} ${Math.abs(b)} = ${c-b}
Divide by ${a}:
x = (${c-b})/${a} = ${x}`,
    teaching,
    hints: [
      `Step 1: ${undoConst} on BOTH sides to move the constant.`,
      `Step 2: after that you will have ${a}x = (something). Then divide BOTH sides by ${a}.`,
      `Compute: ${a}x = ${c} ${b>=0?"-":"+"} ${Math.abs(b)}. Then x = (${c-b})/${a}.`
    ]
  }, "equations");
}

function makeGeometry(difficulty) {
  const mode = choice(["circleCirc","rectArea","triArea"]);

  if (mode === "circleCirc") {
    const r = difficulty === "easy" ? randInt(2, 8) : randInt(3, 14);
    const C = 2 * 3.14 * r;
    const ans = Number(C.toFixed(2));
    return withTeachingState({
      topic: "Geometry",
      prompt: `A circle has radius r = ${r}. Using π ≈ 3.14, what is the circumference? (round to 2 decimals)`,
      expected: { kind: "num", value: ans },
      work: `C = 2πr ≈ 2 × 3.14 × ${r} = ${ans}`
    }, "geometry");
  }

  if (mode === "rectArea") {
    const l = randInt(4, 30);
    const w = randInt(3, 20);
    return withTeachingState({
      topic: "Geometry",
      prompt: `Find the area of a rectangle with length ${l} and width ${w}.`,
      expected: { kind: "num", value: l * w },
      work: `A = ${l} × ${w} = ${l*w}`
    }, "geometry");
  }

  const b = randInt(4, 30);
  const h = randInt(3, 20);
  const A = (b * h) / 2;
  if ((difficulty !== "hard") && !Number.isInteger(A)) return makeGeometry(difficulty);
  const ans = (difficulty === "hard") ? Number(A.toFixed(1)) : A;
  return withTeachingState({
    topic: "Geometry",
    prompt: `Find the area of a triangle with base ${b} and height ${h}.`,
    expected: { kind: "num", value: ans },
    work: `A = (1/2)bh = (1/2) × ${b} × ${h} = ${ans}`
  }, "geometry");
}

function makeStatistics(difficulty) {
  const mode = choice(["mean","median"]);
  const len = difficulty === "easy" ? 5 : 7;
  let data = Array.from({length: len}, () => randInt(2, 20));
  const sorted = [...data].sort((a,b) => a-b);

  if (mode === "mean") {
    const sum = data.reduce((s,v)=>s+v,0);
    const mean = sum / len;
    if ((difficulty !== "hard") && !Number.isInteger(mean)) return makeStatistics(difficulty);
    const ans = (difficulty === "hard") ? Number(mean.toFixed(2)) : mean;
    return withTeachingState({
      topic: "Statistics",
      prompt: `Find the mean of: ${data.join(", ")}`,
      expected: { kind: "num", value: ans },
      work: `Sum = ${sum}, Count = ${len}\nMean = ${sum} ÷ ${len} = ${ans}`
    }, "statistics");
  }

  const median = sorted[Math.floor(len/2)];
  return withTeachingState({
    topic: "Statistics",
    prompt: `Find the median of: ${data.join(", ")}`,
    expected: { kind: "num", value: median },
    work: `Sorted: ${sorted.join(", ")}\nMiddle value = ${median}`
  }, "statistics");
}

// Quiz UI
function setScoreUI() {
  scoreEl.textContent = `Score: ${quiz.score}`;
  streakEl.textContent = `Streak: ${quiz.streak}`;
}

function showProblem() {
  const p = quiz.current;
  problemEl.textContent = p.prompt;

  // NEW: auto-clear scratch paper on each new problem
  clearScratchpadIfPresent();

  answerEl.value = "";
  answerEl.focus();

  feedbackEl.textContent = "";
  solutionEl.textContent = p.work || "";
  solutionEl.style.display = "none";
  toggleBtn.textContent = "Show Step-by-Step Work";

  // reset teaching/hints/solution lock
  setTeachingModeContent(p);
  resetHintsUI();
  updateSolutionLockUI(p);

  setScoreUI();
}

function endQuiz() {
  const pct = Math.round((quiz.score / QUIZ_LEN) * 100);
  problemEl.textContent = `Quiz complete! Final score: ${quiz.score}/${QUIZ_LEN} (${pct}%).`;
  feedbackEl.textContent = "Press Start to try another quiz (you can change topic/difficulty).";
  solutionEl.style.display = "none";

  submitBtn.disabled = true;
  toggleBtn.disabled = true;
}

function nextProblem() {
  quiz.index++;
  if (quiz.index >= QUIZ_LEN) return endQuiz();
  quiz.current = makeProblem(quiz.topicKey, quiz.difficulty);
  showProblem();
}

function grade() {
  const p = quiz.current;
  const parsed = parseTypedNumber(answerEl.value);

  if (!parsed) {
    feedbackEl.textContent = "Type a number (examples: 12, -3.5, 3/4).";
    return;
  }

  const ok = equalAnswer(parsed, p.expected);
  if (ok) {
    quiz.score++;
    quiz.streak++;
    feedbackEl.textContent = "Correct!";

    // optionally unlock on correct too (nice UX)
    p.solutionUnlocked = true;
    updateSolutionLockUI(p);

  } else {
    quiz.streak = 0;

    // track attempts for hints/unlock
    p.attempts = (p.attempts || 0) + 1;

    if (p.topicKey === "equations") {
      // show progressive hints and unlock after 3 wrong attempts
      renderHints(p);

      if (p.attempts >= 3) {
        p.solutionUnlocked = true;
        updateSolutionLockUI(p);
        feedbackEl.textContent = "Still stuck? Step-by-step is now unlocked.";
      } else {
        feedbackEl.textContent = `Not quite. Try again (attempt ${p.attempts}/3). A hint is available above.`;
      }

      // IMPORTANT: do NOT reveal correct answer
    } else {
      // keep old behavior for other topics (you can extend later)
      feedbackEl.textContent = "Not quite. Try again.";
    }
  }

  setScoreUI();

  // For equations we want them to try again on the SAME problem,
  // not immediately skip to the next one.
  if (ok) {
    submitBtn.disabled = true;
    setTimeout(() => {
      submitBtn.disabled = false;
      nextProblem();
    }, 850);
  }
}

function startQuiz() {
  quiz = {
    topicKey: topicEl.value,
    difficulty: diffEl.value,
    index: 0,
    score: 0,
    streak: 0,
    current: null,
  };

  quiz.current = (quiz.topicKey ? makeProblem(quiz.topicKey, quiz.difficulty) : makeMixed(quiz.difficulty));
  container.style.display = "block";
  submitBtn.disabled = false;
  toggleBtn.disabled = false;
  showProblem();
}

startBtn.addEventListener("click", startQuiz);
submitBtn.addEventListener("click", (e) => { e.preventDefault(); grade(); });
answerEl.addEventListener("keydown", (e) => { if (e.key === "Enter") grade(); });

toggleBtn.addEventListener("click", () => {
  const p = quiz?.current;
  if (!p || !p.solutionUnlocked) return; // extra safety

  const isHidden = solutionEl.style.display === "none";
  solutionEl.style.display = isHidden ? "block" : "none";
  toggleBtn.textContent = isHidden ? "Hide Step-by-Step Work" : "Show Step-by-Step Work";
});

// Init scratchpad once
initScratchpad();
