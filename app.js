// 7th Grade Math Practice Quiz (static browser app)
// - 10 questions per quiz
// - typed answers
// - mix of 7th grade topics
// - "show work" toggle
// - keeps best score in localStorage

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
    return {
      topic: "Integers/Rationals",
      prompt: `${a} ÷ ${b} = ?`,
      expected: { kind: "num", value: a / b },
      work: `We compute ${a} ÷ ${b}.\nBecause ${a} = ${b} × ${a/b}, the quotient is ${a/b}.`
    };
  }

  if (op === "×") {
    return {
      topic: "Integers/Rationals",
      prompt: `${a} × ${b} = ?`,
      expected: { kind: "num", value: a * b },
      work: `Multiply:\n${a} × ${b} = ${a*b}`
    };
  }

  if (op === "+") {
    return {
      topic: "Integers/Rationals",
      prompt: `${a} + ${b} = ?`,
      expected: { kind: "num", value: a + b },
      work: `Add:\n${a} + ${b} = ${a+b}`
    };
  }

  return {
    topic: "Integers/Rationals",
    prompt: `${a} − (${b}) = ?`,
    expected: { kind: "num", value: a - b },
    work: `Subtracting ${b} means add ${-b}:\n${a} + (${ -b }) = ${a-b}`
  };
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
    return {
      topic: "Fractions/Decimals",
      prompt: `${s1} × ${s2} = ? (fraction or decimal)`,
      expected: { kind: "frac", n: simp.n, d: simp.d },
      work:
`Multiply numerators and denominators:
(${f1.n}/${f1.d}) × (${f2.n}/${f2.d}) = ${rawN}/${rawD}
Simplify → ${simp.n}/${simp.d}`
    };
  }

  const sign = op === "+" ? 1 : -1;
  const rawN = f1.n * f2.d + sign * (f2.n * f1.d);
  const rawD = f1.d * f2.d;
  const simp = simplifyFrac(rawN, rawD);

  return {
    topic: "Fractions/Decimals",
    prompt: `${s1} ${op} ${s2} = ? (fraction or decimal)`,
    expected: { kind: "frac", n: simp.n, d: simp.d },
    work:
`Common denominator: ${rawD}
Combine: ${rawN}/${rawD}
Simplify → ${simp.n}/${simp.d}`
  };
}

function makeRatios(difficulty) {
  const mode = choice(["unitRate","proportion"]);

  if (mode === "unitRate") {
    const items = difficulty === "easy" ? randInt(2, 8) : randInt(3, 12);
    const costPer = choice([1,2,3,4,5,6,7,8,9]);
    const total = items * costPer;
    return {
      topic: "Ratios/Proportions",
      prompt: `${items} notebooks cost $${total}. What is the cost per notebook?`,
      expected: { kind: "num", value: costPer },
      work: `Unit rate = ${total} ÷ ${items} = ${costPer}`
    };
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

  return {
    topic: "Ratios/Proportions",
    prompt: `Solve for x: ${a}/${b} = ${c}/x`,
    expected,
    work: `Cross multiply: ${a}x = ${b}·${c} = ${b*c}\nSo x = ${b*c}/${a} = ${fmtExpected(expected)}`
  };
}

function makePercent(difficulty) {
  const mode = choice(["percentOf","discount"]);
  const base = difficulty === "easy" ? randInt(20, 200) : randInt(30, 500);
  const pct = choice(difficulty === "easy" ? [5,10,15,20,25,30,50] : [7,12,18,22,35,40,45,60]);

  if (mode === "percentOf") {
    const value = base * (pct / 100);
    if ((difficulty !== "hard") && Math.abs(value - Math.round(value)) > 1e-9) return makePercent(difficulty);
    const v = (difficulty === "hard") ? Number(value.toFixed(2)) : Math.round(value);
    return {
      topic: "Percent",
      prompt: `What is ${pct}% of ${base}?`,
      expected: { kind: "num", value: v },
      work: `${pct}% = ${pct}/100\n${base} × ${pct/100} = ${v}`
    };
  }

  const price = base;
  const newPrice = price * (1 - pct/100);
  if ((difficulty !== "hard") && !Number.isInteger(newPrice)) return makePercent(difficulty);
  const v = (difficulty === "hard") ? Number(newPrice.toFixed(2)) : newPrice;
  return {
    topic: "Percent",
    prompt: `A $${price} item is discounted by ${pct}%. What is the new price?`,
    expected: { kind: "num", value: v },
    work: `New price = ${price} × (1 − ${pct/100}) = ${v}`
  };
}

function makeExpressions(difficulty) {
  if (difficulty === "easy") {
    const x = randInt(-5, 10);
    const a = randInt(-6, 10);
    const b = randInt(-10, 10);
    const val = a * x + b;
    return {
      topic: "Expressions",
      prompt: `Evaluate when x = ${x}:  ${a}x + ${b}`,
      expected: { kind: "num", value: val },
      work: `${a}(${x}) + ${b} = ${a*x} + ${b} = ${val}`
    };
  }

  const x = randInt(-4, 8);
  const a = randInt(2, 9) * (Math.random() < 0.25 ? -1 : 1);
  const b = randInt(-8, 8);
  const c = randInt(-8, 8);
  const val = a * (x + b) + c;

  return {
    topic: "Expressions",
    prompt: `Evaluate when x = ${x}:  ${a}(x ${b>=0?"+":"-"} ${Math.abs(b)}) ${c>=0?"+":"-"} ${Math.abs(c)}`,
    expected: { kind: "num", value: val },
    work:
`Inside: x ${b>=0?"+":"-"} ${Math.abs(b)} = ${x+b}
Multiply: ${a}(${x+b}) = ${a*(x+b)}
Then add/subtract ${c}: ${val}`
  };
}

function makeEquations(difficulty) {
  if (difficulty === "easy") {
    const x = randInt(-10, 15);
    const b = randInt(-12, 12);
    const c = x + b;
    return {
      topic: "Equations",
      prompt: `Solve for x:  x ${b>=0?"+":"-"} ${Math.abs(b)} = ${c}`,
      expected: { kind: "num", value: x },
      work: `Undo the ${b>=0?"+":"-"} ${Math.abs(b)}:\nx = ${c} ${b>=0?"-":"+"} ${Math.abs(b)} = ${x}`
    };
  }

  const a = choice([2,3,4,5,6,7,8,9]) * (Math.random() < 0.2 ? -1 : 1);
  const x = randInt(-8, 10);
  const b = randInt(-12, 12);
  const c = a * x + b;

  return {
    topic: "Equations",
    prompt: `Solve for x:  ${a}x ${b>=0?"+":"-"} ${Math.abs(b)} = ${c}`,
    expected: { kind: "num", value: x },
    work:
`Undo +/− first:
${a}x = ${c} ${b>=0?"-":"+"} ${Math.abs(b)} = ${c-b}
Divide by ${a}:
x = (${c-b})/${a} = ${x}`
  };
}

function makeGeometry(difficulty) {
  const mode = choice(["circleCirc","rectArea","triArea"]);

  if (mode === "circleCirc") {
    const r = difficulty === "easy" ? randInt(2, 8) : randInt(3, 14);
    const C = 2 * 3.14 * r;
    const ans = Number(C.toFixed(2));
    return {
      topic: "Geometry",
      prompt: `A circle has radius r = ${r}. Using π ≈ 3.14, what is the circumference? (round to 2 decimals)`,
      expected: { kind: "num", value: ans },
      work: `C = 2πr ≈ 2 × 3.14 × ${r} = ${ans}`
    };
  }

  if (mode === "rectArea") {
    const l = randInt(4, 30);
    const w = randInt(3, 20);
    return {
      topic: "Geometry",
      prompt: `Find the area of a rectangle with length ${l} and width ${w}.`,
      expected: { kind: "num", value: l * w },
      work: `A = ${l} × ${w} = ${l*w}`
    };
  }

  const b = randInt(4, 30);
  const h = randInt(3, 20);
  const A = (b * h) / 2;
  if ((difficulty !== "hard") && !Number.isInteger(A)) return makeGeometry(difficulty);
  const ans = (difficulty === "hard") ? Number(A.toFixed(1)) : A;
  return {
    topic: "Geometry",
    prompt: `Find the area of a triangle with base ${b} and height ${h}.`,
    expected: { kind: "num", value: ans },
    work: `A = (1/2)bh = (1/2) × ${b} × ${h} = ${ans}`
  };
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
    return {
      topic: "Statistics",
      prompt: `Find the mean of: ${data.join(", ")}`,
      expected: { kind: "num", value: ans },
      work: `Sum = ${sum}, Count = ${len}\nMean = ${sum} ÷ ${len} = ${ans}`
    };
  }

  const median = sorted[Math.floor(len/2)];
  return {
    topic: "Statistics",
    prompt: `Find the median of: ${data.join(", ")}`,
    expected: { kind: "num", value: median },
    work: `Sorted: ${sorted.join(", ")}\nMiddle value = ${median}`
  };
}

// Quiz UI
function setScoreUI() {
  scoreEl.textContent = `Score: ${quiz.score}`;
  streakEl.textContent = `Streak: ${quiz.streak}`;
}

function showProblem() {
  const p = quiz.current;
  problemEl.textContent = p.prompt;
  answerEl.value = "";
  answerEl.focus();

  feedbackEl.textContent = "";
  solutionEl.textContent = p.work || "";
  solutionEl.style.display = "none";
  toggleBtn.textContent = "Show Step-by-Step Work";

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
  } else {
    quiz.streak = 0;
    feedbackEl.textContent = `Not quite. Correct answer: ${fmtExpected(p.expected)}`;
  }
  setScoreUI();

  submitBtn.disabled = true;
  setTimeout(() => {
    submitBtn.disabled = false;
    nextProblem();
  }, 850);
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
  const isHidden = solutionEl.style.display === "none";
  solutionEl.style.display = isHidden ? "block" : "none";
  toggleBtn.textContent = isHidden ? "Hide Step-by-Step Work" : "Show Step-by-Step Work";
});
