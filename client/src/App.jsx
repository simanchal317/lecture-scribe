import { useState, useRef } from "react";

const STYLES = [
  { id: "cornell", label: "Cornell Notes", icon: "⊞", desc: "Cues, notes & summary sections" },
  { id: "outline", label: "Structured Outline", icon: "≡", desc: "Hierarchical headings & points" },
  { id: "bullets", label: "Bullet Points", icon: "•", desc: "Key points in clean bullets" },
  { id: "mindmap", label: "Concept Map", icon: "◎", desc: "Central topic with branches" },
  { id: "flashcard", label: "Flashcards", icon: "⊟", desc: "Q&A pairs for review" },
  { id: "table", label: "Concept Table", icon: "▦", desc: "Key concepts, dates, and definitions" },
];

const SUBJECTS = ["General", "Science", "History", "Math", "Literature", "Computer Science", "Philosophy", "Business", "Law", "Medicine"];

function buildPrompt(text, style, subject) {
  const styleInstructions = {
    cornell: `Format the notes in the Cornell Notes style with clearly labeled sections:
## 📌 CUES (left column - key terms, questions, triggers)
- List cue words or questions

## 📝 NOTES (right column - detailed notes)
- Organized notes under relevant headings

## 💡 SUMMARY
A concise 3-5 sentence summary of the main points.`,

    outline: `Format as a detailed structured outline with Roman numerals and sub-points:
# Main Title
## I. First Major Topic
### A. Subtopic
   - Detail 1
   - Detail 2
### B. Subtopic
## II. Second Major Topic
...and so on with clear hierarchy`,

    bullets: `Format as clean bullet-pointed notes:
# 📚 Topic Title
**Key Concept 1**
- Important point
- Supporting detail

**Key Concept 2**
- Important point
...organized thematically`,

    mindmap: `Format as a text-based concept map:
# 🧠 CENTRAL TOPIC

## Branch 1: [Main Concept]
→ Sub-concept: detail
→ Sub-concept: detail

## Branch 2: [Main Concept]
→ Sub-concept: detail
...with connections noted`,

    flashcard: `Format as numbered flashcard pairs:
---
**Card 1**
Q: [Question about key concept]
A: [Clear, concise answer]
---
**Card 2**
Q: [Another question]
A: [Answer]
---
...create 8-15 cards covering main ideas`,

    table: `Format as a comprehensive table of key concepts, dates, and definitions:
| Concept | Date/Time | Definition/Description | Significance |
| --- | --- | --- | --- |
| Term | [Date or period] | Concise definition | Why it matters |

Followed by a summary of the most critical takeaways.`,
  };

  return `You are an expert academic note-taker. Convert the following ${subject} lecture/content into well-structured notes.

${styleInstructions[style]}

Use markdown formatting. Be thorough but concise. Preserve important details, definitions, formulas, and examples. Highlight the most critical information.

--- LECTURE CONTENT ---
${text}
--- END OF CONTENT ---

Generate the notes now:`;
}

export default function App() {
  const [input, setInput] = useState("");
  const [style, setStyle] = useState("outline");
  const [subject, setSubject] = useState("General");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [videoFile, setVideoFile] = useState(null);
  const fileInputRef = useRef(null);
  const outputRef = useRef(null);

  const handleGenerate = async () => {
    if (!input.trim() && !videoFile) {
      setError("Please paste your lecture content or upload a video first.");
      return;
    }
    if (input.trim() && input.trim().length < 50 && !videoFile) {
      setError("Please provide more content (at least 50 characters).");
      return;
    }
    setError("");
    setLoading(true);
    setNotes("");

    try {
      let result = "";
      const prompt = buildPrompt(input || "Process this lecture video.", style, subject);

      if (videoFile) {
        const formData = new FormData();
        formData.append("video", videoFile);
        formData.append("prompt", prompt);
        formData.append("style", style);
        formData.append("subject", subject);

        const response = await fetch("http://localhost:3001/api/upload-video", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        result = data.content?.map(b => b.text || "").join("\n") || "";
      } else {
        const response = await fetch("http://localhost:3001/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-1.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        result = data.content?.map(b => b.text || "").join("\n") || "";
      }
      
      setNotes(result);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError("Generation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        setError("Video size exceeds 200MB limit.");
        return;
      }
      setVideoFile(file);
      setError("");
    }
  };

  const handleClear = () => {
    setInput("");
    setNotes("");
    setError("");
    setCharCount(0);
    setVideoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  function renderMarkdown(md) {
    const lines = md.split("\n");
    const elements = [];
    let key = 0;
    let inFlashcard = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const k = key++;

      if (line.startsWith("# ")) {
        elements.push(<h1 key={k} style={styles.h1}>{line.slice(2)}</h1>);
      } else if (line.startsWith("## ")) {
        elements.push(<h2 key={k} style={styles.h2}>{line.slice(3)}</h2>);
      } else if (line.startsWith("### ")) {
        elements.push(<h3 key={k} style={styles.h3}>{line.slice(4)}</h3>);
      } else if (line.startsWith("---")) {
        inFlashcard = !inFlashcard;
        elements.push(<hr key={k} style={styles.divider} />);
      } else if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const row = line.split("|").filter(cell => cell.trim() !== "");
        const isHeader = lines[i+1]?.includes("---");
        elements.push(
          <div key={k} style={isHeader ? styles.tableHeader : styles.tableRow}>
            {row.map((cell, idx) => (
              <div key={idx} style={styles.tableCell}>{cell.trim()}</div>
            ))}
          </div>
        );
        if (isHeader) i++;
      } else if (line.startsWith("- ") || line.startsWith("• ")) {
        elements.push(
          <div key={k} style={styles.bullet}>
            <span style={styles.bulletDot}>◆</span>
            <span dangerouslySetInnerHTML={{ __html: parseBold(line.slice(2)) }} />
          </div>
        );
      } else if (/^\d+\./.test(line)) {
        elements.push(
          <div key={k} style={styles.numbered}>
            <span style={styles.numDot}>{line.match(/^\d+/)[0]}.</span>
            <span dangerouslySetInnerHTML={{ __html: parseBold(line.replace(/^\d+\.\s*/, "")) }} />
          </div>
        );
      } else if (line.startsWith("→")) {
        elements.push(
          <div key={k} style={styles.arrow}>
            <span style={styles.arrowIcon}>→</span>
            <span dangerouslySetInnerHTML={{ __html: parseBold(line.slice(1)) }} />
          </div>
        );
      } else if (line.startsWith("**Q:") || line.startsWith("Q:")) {
        elements.push(
          <div key={k} style={styles.question}>
            <span style={styles.qLabel}>Q</span>
            <span>{line.replace(/^\*?\*?Q:\s*\*?\*?/, "")}</span>
          </div>
        );
      } else if (line.startsWith("**A:") || line.startsWith("A:")) {
        elements.push(
          <div key={k} style={styles.answer}>
            <span style={styles.aLabel}>A</span>
            <span>{line.replace(/^\*?\*?A:\s*\*?\*?/, "")}</span>
          </div>
        );
      } else if (line.startsWith("   -") || line.startsWith("     -")) {
        elements.push(
          <div key={k} style={styles.subBullet}>
            <span style={styles.subDot}>·</span>
            <span dangerouslySetInnerHTML={{ __html: parseBold(line.replace(/^\s+-\s*/, "")) }} />
          </div>
        );
      } else if (line.trim() === "") {
        elements.push(<div key={k} style={{ height: "0.5rem" }} />);
      } else {
        elements.push(
          <p key={k} style={styles.para} dangerouslySetInnerHTML={{ __html: parseBold(line) }} />
        );
      }
    }
    return elements;
  }

  function parseBold(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8d5a3;font-weight:600;">$1</strong>')
      .replace(/`(.+?)`/g, '<code style="background:#1a1f2e;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.88em;color:#7ecfb3;">$1</code>');
  }

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;

  return (
    <div style={styles.root}>
      <div style={styles.bgAccent} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoMark}>
          <span style={styles.logoIcon}>✦</span>
        </div>
        <div>
          <h1 style={styles.title}>LectureScribe</h1>
          <p style={styles.subtitle}>Transform lectures into structured notes with AI</p>
        </div>
        <div style={styles.badge}>AI Powered</div>
      </header>

      <div style={styles.container}>
        {/* Left Panel - Input */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelIcon}>📄</span>
            <span style={styles.panelTitle}>Lecture Content</span>
            {(input || videoFile) && (
              <button onClick={handleClear} style={styles.clearBtn}>Clear All</button>
            )}
          </div>

          <div style={styles.uploadArea}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/*"
              style={{ display: "none" }}
            />
            <button 
              onClick={() => fileInputRef.current.click()}
              style={{ ...styles.uploadBtn, ...(videoFile ? styles.uploadBtnActive : {}) }}
            >
              {videoFile ? `📽️ ${videoFile.name}` : "📁 Upload Video Lecture (Max 200MB)"}
            </button>
            {videoFile && (
              <p style={styles.uploadHint}>AI will analyze the video to generate notes.</p>
            )}
          </div>

          {!videoFile && (
            <textarea
              style={styles.textarea}
              placeholder="Or paste your lecture transcript, slides text...&#10;&#10;Tip: The more content you provide, the better your notes will be!"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                setCharCount(e.target.value.length);
              }}
            />
          )}

          <div style={styles.inputMeta}>
            <span style={styles.metaText}>{wordCount} words · {charCount} chars</span>
            <span style={styles.metaText}>{charCount > 0 ? (charCount > 500 ? "✓ Good length" : "Add more for better notes") : "Paste content above"}</span>
          </div>

          {/* Subject selector */}
          <div style={styles.sectionLabel}>Subject</div>
          <div style={styles.subjectGrid}>
            {SUBJECTS.map(s => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                style={{ ...styles.subjectBtn, ...(subject === s ? styles.subjectActive : {}) }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Config + Output */}
        <div style={styles.rightCol}>
          {/* Note Style */}
          <div style={styles.styleCard}>
            <div style={styles.sectionLabel} >Note Format</div>
            <div style={styles.styleGrid}>
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  style={{ ...styles.styleBtn, ...(style === s.id ? styles.styleActive : {}) }}
                >
                  <span style={styles.styleIcon}>{s.icon}</span>
                  <div>
                    <div style={styles.styleName}>{s.label}</div>
                    <div style={styles.styleDesc}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || (!input.trim() && !videoFile)}
            style={{ ...styles.generateBtn, ...(loading || (!input.trim() && !videoFile) ? styles.generateDisabled : {}) }}
          >
            {loading ? (
              <span style={styles.loadingInner}>
                <span style={styles.spinner} />
                Generating notes...
              </span>
            ) : (
              <span>✦ Generate Notes</span>
            )}
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>

      {/* Output */}
      {(notes || loading) && (
        <div ref={outputRef} style={styles.outputSection}>
          <div style={styles.outputHeader}>
            <div style={styles.outputTitleRow}>
              <span style={styles.outputIcon}>📋</span>
              <span style={styles.outputTitle}>Generated Notes</span>
              <span style={styles.outputBadge}>{subject} · {STYLES.find(s => s.id === style)?.label}</span>
            </div>
            {notes && (
              <button onClick={handleCopy} style={styles.copyBtn}>
                {copied ? "✓ Copied!" : "Copy Notes"}
              </button>
            )}
          </div>

          <div style={styles.outputBody}>
            {loading ? (
              <div style={styles.loadingState}>
                <div style={styles.loadingDots}>
                  <span style={{ ...styles.dot, animationDelay: "0s" }} />
                  <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
                  <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
                </div>
                <p style={styles.loadingText}>Analyzing and structuring your notes...</p>
              </div>
            ) : (
              <div style={styles.notesContent}>
                {renderMarkdown(notes)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!notes && !loading && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>✦</div>
          <p style={styles.emptyText}>Your beautifully structured notes will appear here</p>
          <div style={styles.emptyHints}>
            <div style={styles.hint}><span>📎</span> Works with lecture transcripts</div>
            <div style={styles.hint}><span>📑</span> PDF text extractions</div>
            <div style={styles.hint}><span>📺</span> YouTube auto-captions</div>
            <div style={styles.hint}><span>📓</span> Textbook chapters</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:.3; transform: scale(.8); } 50% { opacity:1; transform: scale(1); } }
        * { box-sizing: border-box; }
        textarea::placeholder { color: #4a5170; }
        textarea:focus { outline: none; border-color: #e8d5a3 !important; box-shadow: 0 0 0 2px rgba(232,213,163,0.15); }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0d1117",
    color: "#c9d1d9",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    padding: "0 0 4rem",
    position: "relative",
    overflow: "hidden",
  },
  bgAccent: {
    position: "absolute", top: 0, left: 0, right: 0, height: "400px",
    background: "radial-gradient(ellipse at 50% -20%, rgba(232,213,163,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  header: {
    display: "flex", alignItems: "center", gap: "1rem",
    padding: "2.5rem 3rem 2rem",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "relative",
  },
  logoMark: {
    width: 48, height: 48, borderRadius: 12,
    background: "linear-gradient(135deg, #e8d5a3, #c4a96b)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoIcon: { fontSize: 22, color: "#1a1208" },
  title: {
    margin: 0, fontSize: 26, fontWeight: 700,
    color: "#f0e6c8", letterSpacing: "-0.5px",
  },
  subtitle: { margin: "2px 0 0", fontSize: 13, color: "#6e7a8a", fontFamily: "system-ui, sans-serif" },
  badge: {
    marginLeft: "auto", fontSize: 11, fontFamily: "system-ui, sans-serif",
    fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
    padding: "4px 10px", borderRadius: 20,
    background: "rgba(232,213,163,0.1)", color: "#e8d5a3",
    border: "1px solid rgba(232,213,163,0.2)",
  },
  container: {
    display: "grid", gridTemplateColumns: "1fr 380px",
    gap: "1.5rem", padding: "2rem 3rem", maxWidth: 1200,
  },
  panel: {
    background: "#161b22", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "1.5rem",
  },
  panelHeader: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem",
  },
  panelIcon: { fontSize: 16 },
  panelTitle: { fontSize: 13, fontWeight: 600, color: "#8b949e", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", flex: 1 },
  clearBtn: {
    fontSize: 12, color: "#6e7a8a", background: "transparent", border: "none",
    cursor: "pointer", fontFamily: "system-ui, sans-serif", padding: "2px 6px",
  },
  textarea: {
    width: "100%", minHeight: 280, resize: "vertical",
    background: "#0d1117", color: "#c9d1d9",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
    padding: "1rem", fontSize: 14, lineHeight: 1.7,
    fontFamily: "system-ui, 'Segoe UI', sans-serif",
    transition: "border-color 0.2s",
  },
  uploadArea: {
    marginBottom: "1rem",
  },
  uploadBtn: {
    width: "100%", padding: "12px", borderRadius: 8,
    background: "rgba(232,213,163,0.05)",
    border: "2px dashed rgba(232,213,163,0.2)",
    color: "#e8d5a3", cursor: "pointer", fontSize: 13,
    fontFamily: "system-ui, sans-serif", fontWeight: 500,
    transition: "all 0.2s",
  },
  uploadBtnActive: {
    background: "rgba(232,213,163,0.15)",
    border: "2px solid #e8d5a3",
    color: "#fff",
  },
  uploadHint: {
    fontSize: 11, color: "#6e7a8a", marginTop: 6, textAlign: "center",
    fontFamily: "system-ui, sans-serif",
  },
  inputMeta: {
    display: "flex", justifyContent: "space-between", marginTop: 8,
  },
  metaText: { fontSize: 11, color: "#4a5170", fontFamily: "system-ui, sans-serif" },
  sectionLabel: {
    fontSize: 11, fontWeight: 600, color: "#6e7a8a",
    fontFamily: "system-ui, sans-serif", textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 10, marginTop: "1.2rem",
  },
  subjectGrid: { display: "flex", flexWrap: "wrap", gap: 6 },
  subjectBtn: {
    fontSize: 12, padding: "4px 10px", borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
    color: "#8b949e", cursor: "pointer", fontFamily: "system-ui, sans-serif",
    transition: "all 0.15s",
  },
  subjectActive: {
    background: "rgba(232,213,163,0.1)", borderColor: "rgba(232,213,163,0.35)",
    color: "#e8d5a3",
  },
  rightCol: { display: "flex", flexDirection: "column", gap: "1rem" },
  styleCard: {
    background: "#161b22", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)", padding: "1.5rem",
  },
  styleGrid: { display: "flex", flexDirection: "column", gap: 6 },
  styleBtn: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.07)",
    background: "transparent", textAlign: "left",
    transition: "all 0.15s", width: "100%",
  },
  styleActive: {
    background: "rgba(232,213,163,0.08)", borderColor: "rgba(232,213,163,0.3)",
  },
  styleIcon: { fontSize: 18, minWidth: 24, color: "#e8d5a3" },
  styleName: { fontSize: 13, fontWeight: 600, color: "#c9d1d9", fontFamily: "system-ui, sans-serif" },
  styleDesc: { fontSize: 11, color: "#6e7a8a", fontFamily: "system-ui, sans-serif", marginTop: 1 },
  generateBtn: {
    width: "100%", padding: "14px", borderRadius: 10,
    background: "linear-gradient(135deg, #e8d5a3, #c4a96b)",
    border: "none", cursor: "pointer", fontSize: 15,
    fontWeight: 700, color: "#1a1208", letterSpacing: "0.02em",
    transition: "all 0.2s", fontFamily: "system-ui, sans-serif",
  },
  generateDisabled: { opacity: 0.5, cursor: "not-allowed" },
  loadingInner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  spinner: {
    width: 16, height: 16, border: "2px solid rgba(26,18,8,0.3)",
    borderTopColor: "#1a1208", borderRadius: "50%",
    display: "inline-block", animation: "spin 0.7s linear infinite",
  },
  error: {
    background: "rgba(230,80,80,0.1)", border: "1px solid rgba(230,80,80,0.3)",
    borderRadius: 8, padding: "10px 14px", fontSize: 13,
    color: "#f88", fontFamily: "system-ui, sans-serif",
  },
  outputSection: {
    margin: "0 3rem", background: "#161b22", borderRadius: 12,
    border: "1px solid rgba(232,213,163,0.15)",
    overflow: "hidden",
  },
  outputHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(232,213,163,0.04)",
  },
  outputTitleRow: { display: "flex", alignItems: "center", gap: 8 },
  outputIcon: { fontSize: 16 },
  outputTitle: { fontSize: 14, fontWeight: 600, color: "#f0e6c8", fontFamily: "system-ui, sans-serif" },
  outputBadge: {
    fontSize: 11, color: "#e8d5a3", background: "rgba(232,213,163,0.1)",
    border: "1px solid rgba(232,213,163,0.2)", padding: "2px 8px",
    borderRadius: 20, fontFamily: "system-ui, sans-serif",
  },
  copyBtn: {
    fontSize: 12, padding: "6px 14px", borderRadius: 6,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#c9d1d9", cursor: "pointer", fontFamily: "system-ui, sans-serif",
    transition: "all 0.15s",
  },
  outputBody: { padding: "2rem" },
  loadingState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "1rem", padding: "3rem",
  },
  loadingDots: { display: "flex", gap: 8 },
  dot: {
    width: 10, height: 10, borderRadius: "50%",
    background: "#e8d5a3",
    animation: "pulse 1.2s ease-in-out infinite",
    display: "inline-block",
  },
  loadingText: { color: "#6e7a8a", fontFamily: "system-ui, sans-serif", fontSize: 14, margin: 0 },
  notesContent: { maxWidth: 800 },
  h1: { fontSize: 22, color: "#f0e6c8", fontWeight: 700, margin: "0 0 1rem", lineHeight: 1.3 },
  h2: {
    fontSize: 17, color: "#e8d5a3", fontWeight: 600, margin: "1.5rem 0 0.6rem",
    paddingLeft: 10, borderLeft: "3px solid #c4a96b", lineHeight: 1.4,
  },
  h3: {
    fontSize: 14, color: "#a8b6c8", fontWeight: 600, margin: "1rem 0 0.4rem",
    fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em",
  },
  bullet: {
    display: "flex", gap: 10, margin: "4px 0", fontSize: 14,
    color: "#c9d1d9", lineHeight: 1.65, fontFamily: "system-ui, sans-serif",
  },
  bulletDot: { color: "#c4a96b", minWidth: 12, marginTop: 4, fontSize: 8 },
  numbered: {
    display: "flex", gap: 10, margin: "4px 0", fontSize: 14,
    color: "#c9d1d9", lineHeight: 1.65, fontFamily: "system-ui, sans-serif",
  },
  numDot: { color: "#e8d5a3", fontWeight: 600, minWidth: 20 },
  arrow: {
    display: "flex", gap: 10, margin: "3px 0 3px 1rem", fontSize: 14,
    color: "#a8b6c8", lineHeight: 1.65, fontFamily: "system-ui, sans-serif",
  },
  arrowIcon: { color: "#7ecfb3", minWidth: 16 },
  subBullet: {
    display: "flex", gap: 8, margin: "2px 0 2px 1.5rem", fontSize: 13,
    color: "#8b949e", lineHeight: 1.65, fontFamily: "system-ui, sans-serif",
  },
  subDot: { color: "#4a5170", minWidth: 10 },
  question: {
    display: "flex", gap: 10, margin: "6px 0 2px", padding: "8px 12px",
    background: "rgba(126,207,179,0.08)", borderRadius: 6,
    border: "1px solid rgba(126,207,179,0.15)", fontSize: 14,
    color: "#c9d1d9", fontFamily: "system-ui, sans-serif", lineHeight: 1.6,
    alignItems: "flex-start",
  },
  qLabel: {
    background: "rgba(126,207,179,0.2)", color: "#7ecfb3", fontSize: 10,
    fontWeight: 700, padding: "2px 6px", borderRadius: 4, minWidth: 20,
    textAlign: "center", marginTop: 1,
  },
  answer: {
    display: "flex", gap: 10, margin: "2px 0 10px", padding: "8px 12px",
    background: "rgba(232,213,163,0.06)", borderRadius: 6,
    border: "1px solid rgba(232,213,163,0.1)", fontSize: 14,
    color: "#c9d1d9", fontFamily: "system-ui, sans-serif", lineHeight: 1.6,
    alignItems: "flex-start",
  },
  aLabel: {
    background: "rgba(232,213,163,0.15)", color: "#e8d5a3", fontSize: 10,
    fontWeight: 700, padding: "2px 6px", borderRadius: 4, minWidth: 20,
    textAlign: "center", marginTop: 1,
  },
  para: {
    margin: "0.3rem 0", fontSize: 14, lineHeight: 1.7, color: "#c9d1d9",
    fontFamily: "system-ui, sans-serif",
  },
  divider: { border: "none", borderTop: "1px dashed rgba(232,213,163,0.2)", margin: "12px 0" },
  tableHeader: {
    display: "flex", gap: 0, margin: "10px 0 0", background: "rgba(232,213,163,0.1)",
    borderRadius: "6px 6px 0 0", overflow: "hidden",
  },
  tableRow: {
    display: "flex", gap: 0, margin: "0", background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  tableCell: {
    flex: 1, padding: "8px 12px", fontSize: 13, color: "#c9d1d9",
    borderRight: "1px solid rgba(255,255,255,0.05)",
  },
  emptyState: {
    textAlign: "center", padding: "4rem 2rem", color: "#4a5170",
  },
  emptyIcon: { fontSize: 40, marginBottom: "1rem", color: "rgba(232,213,163,0.2)" },
  emptyText: { fontSize: 15, margin: "0 0 2rem", fontFamily: "system-ui, sans-serif" },
  emptyHints: {
    display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap",
  },
  hint: {
    fontSize: 13, color: "#4a5170", fontFamily: "system-ui, sans-serif",
    display: "flex", alignItems: "center", gap: 6,
  },
};
