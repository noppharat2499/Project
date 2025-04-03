const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

let conn;


const initMySQL = async () => {
  try {
    conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "root",
      database: "webproject",
      port: 3306
    });
    console.log("✅ Connected to MySQL database");
  } catch (err) {
    console.error("❌ Failed to connect to MySQL:", err.message);
  }
};


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.get("/projects", async (req, res) => {
  try {
    const [rows] = await conn.query("SELECT * FROM project");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});


app.post("/projects", upload.single("file"), async (req, res) => {
  try {
    const { firstname, lastname, description, approver } = req.body;
    if (!req.file) return res.status(400).json({ message: "ไฟล์ไม่ถูกอัปโหลด" });

    const file = req.file.filename;
    const sql = "INSERT INTO project (firstname, lastname, file, description, approver) VALUES (?, ?, ?, ?, ?)";
    const [result] = await conn.query(sql, [firstname, lastname, file, description, approver]);

    res.json({ message: "เพิ่มโปรเจกต์เรียบร้อย", insertId: result.insertId });
  } catch (err) {
    console.error("❌ Error inserting project:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
  }
});

app.put("/projects/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await conn.query(
      "UPDATE project SET status = 'approved' WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบเอกสาร ID นี้" });
    }

    res.json({ message: `✅ อนุมัติเอกสาร ID ${id} แล้ว` });
  } catch (err) {
    console.error("❌ Error approving project:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอนุมัติเอกสาร" });
  }
});

app.delete("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await conn.query("DELETE FROM project WHERE id = ?", [id]);
    res.json({ message: "ลบเรียบร้อย" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
  }
});

app.listen(port, async () => {
  await initMySQL();
  console.log(`🚀 Server running on http://localhost:${port}`);
});