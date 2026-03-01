import { useState, useCallback, useEffect, useRef } from "react";
import { evaluate, round } from "mathjs";

type Mode = "standard" | "scientific" | "programmer";
type AngleMode = "DEG" | "RAD";
type HistoryItem = { expression: string; result: string };

const THEMES = [
  { name: "Neon", bg: "from-gray-950 via-purple-950 to-gray-950", accent: "from-purple-500 to-cyan-500", btn: "from-purple-900/60 to-indigo-900/60", btnHover: "hover:from-purple-700/80 hover:to-indigo-700/80", op: "from-purple-600 to-cyan-500", eq: "from-pink-500 to-orange-400", display: "from-gray-900 to-purple-950", text: "text-purple-300", glow: "shadow-purple-500/50" },
  { name: "Sunset", bg: "from-orange-950 via-red-950 to-pink-950", accent: "from-orange-400 to-pink-500", btn: "from-orange-900/60 to-red-900/60", btnHover: "hover:from-orange-700/80 hover:to-red-700/80", op: "from-orange-500 to-pink-500", eq: "from-yellow-400 to-orange-500", display: "from-gray-900 to-orange-950", text: "text-orange-300", glow: "shadow-orange-500/50" },
  { name: "Ocean", bg: "from-cyan-950 via-blue-950 to-teal-950", accent: "from-cyan-400 to-blue-500", btn: "from-cyan-900/60 to-blue-900/60", btnHover: "hover:from-cyan-700/80 hover:to-blue-700/80", op: "from-cyan-500 to-blue-500", eq: "from-teal-400 to-cyan-500", display: "from-gray-900 to-cyan-950", text: "text-cyan-300", glow: "shadow-cyan-500/50" },
  { name: "Matrix", bg: "from-gray-950 via-green-950 to-gray-950", accent: "from-green-400 to-emerald-500", btn: "from-green-900/60 to-emerald-900/60", btnHover: "hover:from-green-700/80 hover:to-emerald-700/80", op: "from-green-500 to-emerald-500", eq: "from-lime-400 to-green-500", display: "from-gray-900 to-green-950", text: "text-green-300", glow: "shadow-green-500/50" },
];

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

const safeEval = (expr: string, angleMode: AngleMode): string => {
  try {
    let processed = expr
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/π/g, String(Math.PI))
      .replace(/e(?![0-9])/g, String(Math.E));

    if (angleMode === "DEG") {
      processed = processed
        .replace(/sin\(/g, `sin_deg(`)
        .replace(/cos\(/g, `cos_deg(`)
        .replace(/tan\(/g, `tan_deg(`)
        .replace(/asin\(/g, `asin_deg(`)
        .replace(/acos\(/g, `acos_deg(`)
        .replace(/atan\(/g, `atan_deg(`);

      const scope: Record<string, unknown> = {
        sin_deg: (x: number) => Math.sin(toRad(x)),
        cos_deg: (x: number) => Math.cos(toRad(x)),
        tan_deg: (x: number) => Math.tan(toRad(x)),
        asin_deg: (x: number) => toDeg(Math.asin(x)),
        acos_deg: (x: number) => toDeg(Math.acos(x)),
        atan_deg: (x: number) => toDeg(Math.atan(x)),
        log: (x: number) => Math.log10(x),
        ln: (x: number) => Math.log(x),
        sqrt: (x: number) => Math.sqrt(x),
        cbrt: (x: number) => Math.cbrt(x),
        abs: (x: number) => Math.abs(x),
        factorial: (x: number) => {
          if (x < 0 || !Number.isInteger(x)) throw new Error("Invalid");
          let r = 1; for (let i = 2; i <= x; i++) r *= i; return r;
        },
      };
      const result = evaluate(processed, scope);
      return String(round(result, 10));
    } else {
      const scope: Record<string, unknown> = {
        log: (x: number) => Math.log10(x),
        ln: (x: number) => Math.log(x),
        sqrt: (x: number) => Math.sqrt(x),
        cbrt: (x: number) => Math.cbrt(x),
        abs: (x: number) => Math.abs(x),
        factorial: (x: number) => {
          if (x < 0 || !Number.isInteger(x)) throw new Error("Invalid");
          let r = 1; for (let i = 2; i <= x; i++) r *= i; return r;
        },
      };
      const result = evaluate(processed, scope);
      return String(round(result, 10));
    }
  } catch {
    return "Error";
  }
};

export default function App() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [mode, setMode] = useState<Mode>("scientific");
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");
  const [themeIdx, setThemeIdx] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [justEval, setJustEval] = useState(false);
  const [memory, setMemory] = useState(0);
  const [showMemory, setShowMemory] = useState(false);
  const [shake, setShake] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);
  const theme = THEMES[themeIdx];

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleInput = useCallback((val: string) => {
    setJustEval(false);
    setDisplay(prev => {
      if (prev === "0" && /^[0-9]$/.test(val)) return val;
      if (prev === "Error") return /^[0-9]$/.test(val) ? val : "0";
      if (justEval && /^[0-9\.]$/.test(val)) return val;
      return prev + val;
    });
  }, [justEval]);

  const handleOperator = useCallback((op: string) => {
    setJustEval(false);
    setDisplay(prev => {
      const last = prev.slice(-1);
      const ops = ["+", "-", "×", "÷", "*", "/", "^", "−"];
      if (ops.includes(last)) return prev.slice(0, -1) + op;
      return prev + op;
    });
  }, []);

  const handleEquals = useCallback(() => {
    setDisplay(prev => {
      if (!prev || prev === "Error") return prev;
      const result = safeEval(prev, angleMode);
      if (result === "Error") { triggerShake(); return "Error"; }
      setHistory(h => [{ expression: prev, result }, ...h].slice(0, 50));
      setExpression(prev + " =");
      setJustEval(true);
      return result;
    });
  }, [angleMode]);

  const handleClear = useCallback(() => {
    setDisplay("0");
    setExpression("");
    setJustEval(false);
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay(prev => {
      if (prev === "Error") return "0";
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  }, []);

  const handleSpecial = useCallback((fn: string) => {
    setJustEval(false);
    if (fn === "±") {
      setDisplay(prev => {
        if (prev === "0") return "0";
        return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
      });
      return;
    }
    if (fn === "%") {
      setDisplay(prev => {
        const val = parseFloat(prev);
        return isNaN(val) ? prev : String(val / 100);
      });
      return;
    }
    if (fn === "1/x") {
      setDisplay(prev => {
        const result = safeEval(`1/(${prev})`, angleMode);
        return result;
      });
      return;
    }
    if (fn === "x²") {
      setDisplay(prev => safeEval(`(${prev})^2`, angleMode));
      return;
    }
    if (fn === "x³") {
      setDisplay(prev => safeEval(`(${prev})^3`, angleMode));
      return;
    }
    if (fn === "10^x") {
      setDisplay(prev => safeEval(`10^(${prev})`, angleMode));
      return;
    }
    if (fn === "e^x") {
      setDisplay(prev => safeEval(`e^(${prev})`, angleMode));
      return;
    }
    if (fn === "x!") {
      setDisplay(prev => safeEval(`factorial(${prev})`, angleMode));
      return;
    }
    if (fn === "√") {
      setDisplay(prev => safeEval(`sqrt(${prev})`, angleMode));
      return;
    }
    if (fn === "∛") {
      setDisplay(prev => safeEval(`cbrt(${prev})`, angleMode));
      return;
    }
    if (fn === "|x|") {
      setDisplay(prev => safeEval(`abs(${prev})`, angleMode));
      return;
    }
    // functions that open paren
    const map: Record<string, string> = {
      "sin": "sin(", "cos": "cos(", "tan": "tan(",
      "asin": "asin(", "acos": "acos(", "atan": "atan(",
      "log": "log(", "ln": "ln(", "√(": "sqrt(", "∛(": "cbrt(",
    };
    if (map[fn]) {
      setDisplay(prev => (prev === "0" ? map[fn] : prev + map[fn]));
    }
  }, [angleMode]);

  const handleMemory = useCallback((op: string) => {
    if (op === "MC") { setMemory(0); setShowMemory(true); setTimeout(() => setShowMemory(false), 1000); }
    if (op === "MR") { setDisplay(String(memory)); }
    if (op === "M+") { setMemory(m => m + parseFloat(display)); setShowMemory(true); setTimeout(() => setShowMemory(false), 1000); }
    if (op === "M-") { setMemory(m => m - parseFloat(display)); setShowMemory(true); setTimeout(() => setShowMemory(false), 1000); }
    if (op === "MS") { setMemory(parseFloat(display)); setShowMemory(true); setTimeout(() => setShowMemory(false), 1000); }
  }, [display, memory]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleInput(e.key);
      else if (e.key === ".") handleInput(".");
      else if (e.key === "+") handleOperator("+");
      else if (e.key === "-") handleOperator("−");
      else if (e.key === "*") handleOperator("×");
      else if (e.key === "/") { e.preventDefault(); handleOperator("÷"); }
      else if (e.key === "^") handleOperator("^");
      else if (e.key === "Enter" || e.key === "=") handleEquals();
      else if (e.key === "Backspace") handleBackspace();
      else if (e.key === "Escape") handleClear();
      else if (e.key === "(") handleInput("(");
      else if (e.key === ")") handleInput(")");
      else if (e.key === "%") handleSpecial("%");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleInput, handleOperator, handleEquals, handleBackspace, handleClear, handleSpecial]);

  const displaySize = display.length > 15 ? "text-lg" : display.length > 10 ? "text-2xl" : display.length > 6 ? "text-3xl" : "text-4xl";

  const Btn = ({
    label, onClick, wide, taller, color, textColor, emoji
  }: {
    label: string; onClick: () => void; wide?: boolean; taller?: boolean;
    color?: string; textColor?: string; emoji?: string;
  }) => {
    const [pressed, setPressed] = useState(false);
    return (
      <button
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => { setPressed(false); onClick(); }}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => { setPressed(false); onClick(); }}
        className={`
          relative overflow-hidden rounded-xl font-semibold text-sm md:text-base
          transition-all duration-150 select-none cursor-pointer
          ${wide ? "col-span-2" : ""} ${taller ? "row-span-2" : ""}
          ${color || `bg-gradient-to-br ${theme.btn} ${theme.btnHover}`}
          ${textColor || "text-white"}
          ${pressed ? "scale-90 brightness-150" : "scale-100"}
          border border-white/10 shadow-lg hover:shadow-xl
          active:scale-90
          flex items-center justify-center gap-1
          min-h-[3rem]
        `}
        style={{ boxShadow: pressed ? `0 0 18px 2px rgba(168,85,247,0.4)` : undefined }}
      >
        <span className="relative z-10">{emoji && <span className="mr-0.5">{emoji}</span>}{label}</span>
        {pressed && (
          <span className="absolute inset-0 bg-white/10 rounded-xl animate-ping" />
        )}
      </button>
    );
  };

  const standardButtons = [
    // row 1
    { label: "MC", onClick: () => handleMemory("MC"), color: "bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600 hover:to-slate-700", textColor: "text-slate-300 text-xs" },
    { label: "MR", onClick: () => handleMemory("MR"), color: "bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600 hover:to-slate-700", textColor: "text-slate-300 text-xs" },
    { label: "M+", onClick: () => handleMemory("M+"), color: "bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600 hover:to-slate-700", textColor: "text-slate-300 text-xs" },
    { label: "M-", onClick: () => handleMemory("M-"), color: "bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600 hover:to-slate-700", textColor: "text-slate-300 text-xs" },
    // row 2
    { label: "C", onClick: handleClear, color: `bg-gradient-to-br from-red-700/80 to-red-900/80 hover:from-red-600 hover:to-red-800` },
    { label: "±", onClick: () => handleSpecial("±") },
    { label: "%", onClick: () => handleSpecial("%") },
    { label: "÷", onClick: () => handleOperator("÷"), color: `bg-gradient-to-br ${theme.op} hover:brightness-110` },
    // row 3
    { label: "7", onClick: () => handleInput("7") },
    { label: "8", onClick: () => handleInput("8") },
    { label: "9", onClick: () => handleInput("9") },
    { label: "×", onClick: () => handleOperator("×"), color: `bg-gradient-to-br ${theme.op} hover:brightness-110` },
    // row 4
    { label: "4", onClick: () => handleInput("4") },
    { label: "5", onClick: () => handleInput("5") },
    { label: "6", onClick: () => handleInput("6") },
    { label: "−", onClick: () => handleOperator("−"), color: `bg-gradient-to-br ${theme.op} hover:brightness-110` },
    // row 5
    { label: "1", onClick: () => handleInput("1") },
    { label: "2", onClick: () => handleInput("2") },
    { label: "3", onClick: () => handleInput("3") },
    { label: "+", onClick: () => handleOperator("+"), color: `bg-gradient-to-br ${theme.op} hover:brightness-110` },
    // row 6
    { label: "0", onClick: () => handleInput("0"), wide: true },
    { label: ".", onClick: () => handleInput(".") },
    { label: "=", onClick: handleEquals, color: `bg-gradient-to-br ${theme.eq} hover:brightness-110 shadow-lg` },
  ];

  const sciButtons = [
    { label: "sin", onClick: () => handleSpecial("sin") },
    { label: "cos", onClick: () => handleSpecial("cos") },
    { label: "tan", onClick: () => handleSpecial("tan") },
    { label: "asin", onClick: () => handleSpecial("asin"), textColor: "text-xs text-white" },
    { label: "acos", onClick: () => handleSpecial("acos"), textColor: "text-xs text-white" },
    { label: "atan", onClick: () => handleSpecial("atan"), textColor: "text-xs text-white" },
    { label: "log", onClick: () => handleSpecial("log") },
    { label: "ln", onClick: () => handleSpecial("ln") },
    { label: "√", onClick: () => handleSpecial("√") },
    { label: "∛", onClick: () => handleSpecial("∛") },
    { label: "x²", onClick: () => handleSpecial("x²") },
    { label: "x³", onClick: () => handleSpecial("x³") },
    { label: "x!", onClick: () => handleSpecial("x!") },
    { label: "1/x", onClick: () => handleSpecial("1/x"), textColor: "text-xs text-white" },
    { label: "|x|", onClick: () => handleSpecial("|x|") },
    { label: "xʸ", onClick: () => handleOperator("^") },
    { label: "e^x", onClick: () => handleSpecial("e^x"), textColor: "text-xs text-white" },
    { label: "10^x", onClick: () => handleSpecial("10^x"), textColor: "text-xs text-white" },
    { label: "π", onClick: () => handleInput("π") },
    { label: "e", onClick: () => handleInput("e") },
    { label: "(", onClick: () => handleInput("(") },
    { label: ")", onClick: () => handleInput(")") },
    { label: "⌫", onClick: handleBackspace, color: "bg-gradient-to-br from-orange-700/70 to-orange-900/70 hover:from-orange-600 hover:to-orange-800" },
    { label: "MS", onClick: () => handleMemory("MS"), textColor: "text-xs text-slate-300", color: "bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600 hover:to-slate-700" },
  ];

  // Programmer mode
  const [progBase, setProgBase] = useState<"DEC" | "HEX" | "OCT" | "BIN">("DEC");
  const progVal = parseInt(display) || 0;
  const hexVal = isNaN(progVal) ? "Error" : progVal.toString(16).toUpperCase();
  const octVal = isNaN(progVal) ? "Error" : progVal.toString(8);
  const binVal = isNaN(progVal) ? "Error" : progVal.toString(2);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg} flex items-center justify-center p-4 font-mono`}>
      {/* Background glow orbs */}
      <div className={`fixed inset-0 pointer-events-none overflow-hidden`}>
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br ${theme.accent} opacity-10 rounded-full blur-3xl animate-pulse`} />
        <div className={`absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br ${theme.op} opacity-10 rounded-full blur-3xl animate-pulse`} style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔢</span>
            <span className={`text-lg font-bold bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}>UltraCalc</span>
          </div>
          {/* Theme switcher */}
          <div className="flex gap-1.5">
            {THEMES.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setThemeIdx(i)}
                title={t.name}
                className={`w-5 h-5 rounded-full bg-gradient-to-br ${t.accent} border-2 transition-all ${themeIdx === i ? "border-white scale-125" : "border-transparent"}`}
              />
            ))}
          </div>
        </div>

        {/* Main calculator card */}
        <div className={`relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl ${theme.glow} shadow-2xl overflow-hidden`}>
          {/* Scanline effect */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.05)_2px,rgba(0,0,0,0.05)_4px)] pointer-events-none z-0" />

          <div className="relative z-10 p-4">
            {/* Mode switcher */}
            <div className="flex gap-1 mb-3 bg-black/30 rounded-xl p-1">
              {(["standard", "scientific", "programmer"] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200
                    ${mode === m ? `bg-gradient-to-r ${theme.accent} text-white shadow-lg` : "text-gray-400 hover:text-white"}`}
                >
                  {m === "standard" ? "STD" : m === "scientific" ? "SCI" : "PROG"}
                </button>
              ))}
            </div>

            {/* Display */}
            <div
              ref={displayRef}
              className={`
                relative bg-gradient-to-br ${theme.display} rounded-2xl p-4 mb-4
                border border-white/10 min-h-[100px] flex flex-col justify-between
                ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}
                overflow-hidden
              `}
            >
              {/* Memory indicator */}
              {memory !== 0 && (
                <div className={`absolute top-2 left-3 text-xs ${theme.text} font-bold`}>M: {memory}</div>
              )}
              {showMemory && (
                <div className="absolute top-2 right-3 text-xs text-green-400 animate-bounce">Memory ✓</div>
              )}

              {/* Expression */}
              <div className="text-right text-gray-500 text-xs min-h-[1.2rem] truncate">
                {expression}
              </div>

              {/* Main display */}
              <div className={`text-right font-bold ${displaySize} ${theme.text} break-all leading-tight mt-2`}
                style={{ textShadow: `0 0 20px currentColor` }}
              >
                {display}
              </div>

              {/* Programmer mode conversions */}
              {mode === "programmer" && !isNaN(progVal) && (
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <div className="text-gray-500">HEX: <span className="text-yellow-400">{hexVal}</span></div>
                  <div className="text-gray-500">OCT: <span className="text-blue-400">{octVal}</span></div>
                  <div className="text-gray-500 col-span-2 truncate">BIN: <span className="text-green-400">{binVal}</span></div>
                </div>
              )}
            </div>

            {/* Scientific angle toggle */}
            {mode === "scientific" && (
              <div className="flex gap-2 mb-3">
                {(["DEG", "RAD"] as AngleMode[]).map(a => (
                  <button
                    key={a}
                    onClick={() => setAngleMode(a)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all
                      ${angleMode === a ? `bg-gradient-to-r ${theme.accent} text-white` : "bg-white/5 text-gray-400 hover:text-white"}`}
                  >
                    {a}
                  </button>
                ))}
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`ml-auto px-3 py-1 rounded-lg text-xs font-bold transition-all bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white`}
                >
                  📜 History
                </button>
              </div>
            )}

            {/* History panel */}
            {showHistory && (
              <div className="mb-3 bg-black/40 rounded-xl p-3 max-h-36 overflow-y-auto border border-white/10">
                <div className="text-xs text-gray-500 mb-2 flex justify-between">
                  <span>History</span>
                  <button onClick={() => setHistory([])} className="text-red-400 hover:text-red-300">Clear</button>
                </div>
                {history.length === 0 ? (
                  <div className="text-gray-600 text-xs text-center py-2">No history yet</div>
                ) : (
                  history.map((h, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs py-1 border-b border-white/5 cursor-pointer hover:bg-white/5 rounded px-1"
                      onClick={() => { setDisplay(h.result); setShowHistory(false); }}
                    >
                      <span className="text-gray-500 truncate max-w-[60%]">{h.expression}</span>
                      <span className={`${theme.text} font-bold`}>{h.result}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Scientific buttons */}
            {mode === "scientific" && (
              <div className="grid grid-cols-6 gap-1.5 mb-2">
                {sciButtons.map((btn, i) => (
                  <Btn key={i} {...btn} color={btn.color || `bg-gradient-to-br from-indigo-900/50 to-purple-900/50 hover:from-indigo-700/70 hover:to-purple-700/70`} />
                ))}
              </div>
            )}

            {/* Programmer buttons */}
            {mode === "programmer" && (
              <div className="mb-2">
                <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                  {["A","B","C","D","E","F"].map(h => (
                    <Btn key={h} label={h} onClick={() => handleInput(h)}
                      color={progBase === "HEX" ? `bg-gradient-to-br from-yellow-800/70 to-yellow-900/70 hover:from-yellow-700 hover:to-yellow-800` : "bg-white/5 opacity-40 cursor-not-allowed"}
                    />
                  ))}
                  <Btn label="AND" onClick={() => handleOperator("&")} color="bg-gradient-to-br from-blue-800/70 to-blue-900/70 hover:from-blue-700 hover:to-blue-800" textColor="text-xs text-white" />
                  <Btn label="OR" onClick={() => handleOperator("|")} color="bg-gradient-to-br from-blue-800/70 to-blue-900/70 hover:from-blue-700 hover:to-blue-800" textColor="text-xs text-white" />
                  <Btn label="XOR" onClick={() => handleOperator("xor")} color="bg-gradient-to-br from-blue-800/70 to-blue-900/70 hover:from-blue-700 hover:to-blue-800" textColor="text-xs text-white" />
                  <Btn label="NOT" onClick={() => setDisplay(prev => String(~parseInt(prev)))} color="bg-gradient-to-br from-blue-800/70 to-blue-900/70 hover:from-blue-700 hover:to-blue-800" textColor="text-xs text-white" />
                  <Btn label="<<" onClick={() => setDisplay(prev => String(parseInt(prev) << 1))} color="bg-gradient-to-br from-teal-800/70 to-teal-900/70" textColor="text-xs text-white" />
                  <Btn label=">>" onClick={() => setDisplay(prev => String(parseInt(prev) >> 1))} color="bg-gradient-to-br from-teal-800/70 to-teal-900/70" textColor="text-xs text-white" />
                  <Btn label="MOD" onClick={() => handleOperator("%")} color="bg-gradient-to-br from-pink-800/70 to-pink-900/70" textColor="text-xs text-white" />
                  <Btn label="⌫" onClick={handleBackspace} color="bg-gradient-to-br from-orange-700/70 to-orange-900/70" />
                </div>
                <div className="flex gap-1 mb-1.5">
                  {(["DEC","HEX","OCT","BIN"] as const).map(b => (
                    <button key={b} onClick={() => setProgBase(b)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all
                        ${progBase === b ? `bg-gradient-to-r ${theme.accent} text-white` : "bg-white/5 text-gray-400 hover:text-white"}`}
                    >{b}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Standard buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {mode === "standard" && (
                <Btn label="⌫" onClick={handleBackspace} color="bg-gradient-to-br from-orange-700/70 to-orange-900/70 hover:from-orange-600 hover:to-orange-800" />
              )}
              {standardButtons.map((btn, i) => (
                <Btn key={i} {...btn} />
              ))}
            </div>

            {/* Keyboard hint */}
            <div className="mt-3 text-center text-gray-600 text-xs">⌨️ Keyboard supported</div>
          </div>
        </div>

        {/* Footer */}
        <div className={`text-center mt-3 text-xs bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent font-semibold`}>
          Ultra Calculator v2.0 ✨
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
