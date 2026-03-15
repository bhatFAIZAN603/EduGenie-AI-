import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("edugenie.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    student_class TEXT,
    avatar TEXT,
    daily_credits INTEGER DEFAULT 300,
    monthly_credits INTEGER DEFAULT 1000000,
    last_reset_12h INTEGER,
    last_reset_5d INTEGER
  );

  CREATE TABLE IF NOT EXISTS quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    topic TEXT,
    score INTEGER,
    total INTEGER,
    date TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS study_planner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    task TEXT,
    due_date TEXT,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    content TEXT,
    date TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migration: Add columns if they don't exist (better than dropping for this environment)
try { db.exec("ALTER TABLE users ADD COLUMN avatar TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN last_reset_12h INTEGER"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN last_reset_5d INTEGER"); } catch(e) {}

// Ensure we have at least one user for this demo (since no auth)
const user = db.prepare("SELECT * FROM users LIMIT 1").get();
if (!user) {
  const now = Date.now();
  db.prepare("INSERT INTO users (name, student_class, last_reset_12h, last_reset_5d) VALUES (?, ?, ?, ?)").run(
    "Student",
    "10th Grade",
    now,
    now
  );
}

interface UserRow {
  id: number;
  name: string;
  student_class: string;
  avatar: string | null;
  daily_credits: number;
  monthly_credits: number;
  last_reset_12h: number | null;
  last_reset_5d: number | null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/user", (req, res) => {
    const user = db.prepare("SELECT * FROM users LIMIT 1").get() as UserRow;
    
    // Check for credit resets
    const now = Date.now();
    let updates = [];
    let params = [];
    
    // 12h reset for daily credits
    if (!user.last_reset_12h || now - user.last_reset_12h >= 12 * 60 * 60 * 1000) {
      updates.push("daily_credits = 300", "last_reset_12h = ?");
      params.push(now);
    }
    
    // 5d reset for monthly credits
    if (!user.last_reset_5d || now - user.last_reset_5d >= 5 * 24 * 60 * 60 * 1000) {
      updates.push("monthly_credits = 1000000", "last_reset_5d = ?");
      params.push(now);
    }
    
    if (updates.length > 0) {
      db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params, user.id);
      res.json(db.prepare("SELECT * FROM users LIMIT 1").get());
    } else {
      res.json(user);
    }
  });

  app.post("/api/user", (req, res) => {
    const { name, student_class } = req.body;
    db.prepare("UPDATE users SET name = ?, student_class = ? WHERE id = (SELECT id FROM users LIMIT 1)").run(name, student_class);
    res.json({ success: true });
  });

  app.post("/api/user/avatar", (req, res) => {
    const { avatar } = req.body;
    const user = db.prepare("SELECT * FROM users LIMIT 1").get() as UserRow;
    
    if (user.daily_credits >= 10 && user.monthly_credits >= 10) {
      db.prepare("UPDATE users SET avatar = ?, daily_credits = daily_credits - 10, monthly_credits = monthly_credits - 10 WHERE id = ?")
        .run(avatar, user.id);
      res.json({ success: true, remaining: user.daily_credits - 10 });
    } else {
      res.status(403).json({ error: "Insufficient credits" });
    }
  });

  app.post("/api/use-credits", (req, res) => {
    const { amount } = req.body;
    const user = db.prepare("SELECT * FROM users LIMIT 1").get() as UserRow;
    
    if (user.daily_credits >= amount && user.monthly_credits >= amount) {
      db.prepare("UPDATE users SET daily_credits = daily_credits - ?, monthly_credits = monthly_credits - ? WHERE id = ?")
        .run(amount, amount, user.id);
      res.json({ success: true, remaining: user.daily_credits - amount });
    } else {
      res.status(403).json({ error: "Insufficient credits" });
    }
  });

  app.get("/api/quiz-results", (req, res) => {
    const results = db.prepare("SELECT * FROM quiz_results ORDER BY date DESC").all();
    res.json(results);
  });

  app.post("/api/quiz-results", (req, res) => {
    const { topic, score, total } = req.body;
    const user = db.prepare("SELECT id FROM users LIMIT 1").get() as { id: number };
    db.prepare("INSERT INTO quiz_results (user_id, topic, score, total, date) VALUES (?, ?, ?, ?, ?)")
      .run(user.id, topic, score, total, new Date().toISOString());
    res.json({ success: true });
  });

  app.delete("/api/quiz-results", (req, res) => {
    db.prepare("DELETE FROM quiz_results").run();
    res.json({ success: true });
  });

  app.delete("/api/quiz-results/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM quiz_results WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Study Planner Routes
  app.get("/api/study-planner", (req, res) => {
    const tasks = db.prepare("SELECT * FROM study_planner ORDER BY due_date ASC").all();
    res.json(tasks);
  });

  app.post("/api/study-planner", (req, res) => {
    const { task, due_date } = req.body;
    const user = db.prepare("SELECT id FROM users LIMIT 1").get() as { id: number };
    db.prepare("INSERT INTO study_planner (user_id, task, due_date) VALUES (?, ?, ?)")
      .run(user.id, task, due_date);
    res.json({ success: true });
  });

  app.put("/api/study-planner/:id", (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    db.prepare("UPDATE study_planner SET completed = ? WHERE id = ?").run(completed ? 1 : 0, id);
    res.json({ success: true });
  });

  app.delete("/api/study-planner/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM study_planner WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Quick Notes Routes
  app.get("/api/notes", (req, res) => {
    const notes = db.prepare("SELECT * FROM notes ORDER BY date DESC").all();
    res.json(notes);
  });

  app.post("/api/notes", (req, res) => {
    const { title, content } = req.body;
    const user = db.prepare("SELECT id FROM users LIMIT 1").get() as { id: number };
    db.prepare("INSERT INTO notes (user_id, title, content, date) VALUES (?, ?, ?, ?)")
      .run(user.id, title, content, new Date().toLocaleDateString());
    res.json({ success: true });
  });

  app.delete("/api/notes/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
