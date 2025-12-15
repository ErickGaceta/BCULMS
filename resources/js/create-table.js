/**
 * Class managing schema creation for a fresh database.
 */
class DatabaseSchema {
  /**
   * Create all required tables if they do not exist.
   */
  async createDB() {
    db = new SQL.Database();

    db.run(`CREATE TABLE IF NOT EXISTS "archived_books" (
	"archive_id" INTEGER NOT NULL UNIQUE,
	"book_id"	INTEGER NOT NULL UNIQUE,
	"book_title"	TEXT NOT NULL,
  "author" TEXT,
  "publication_date" TEXT,
	"archive_date"	TEXT NOT NULL,
  "due_date" TEXT,
	PRIMARY KEY("archive_id"),
	FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE);`);

    db.run(`CREATE TABLE IF NOT EXISTS "book_copy" (
	"copy_id"	TEXT NOT NULL UNIQUE,
	"book_id"	TEXT NOT NULL,
	"status"	TEXT NOT NULL,
	"condition"	TEXT NOT NULL,
  "borrowed_date" TEXT,
  "returned_date" TEXT,
  "due_date" TEXT,
	PRIMARY KEY("copy_id"),
	FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE);`);

    db.run(`CREATE TABLE IF NOT EXISTS "books" (
	"book_id"	INTEGER NOT NULL UNIQUE,
	"title"	TEXT NOT NULL,
	"author"	TEXT NOT NULL,
	"publication_date"	TEXT NOT NULL,
	"type"	TEXT NOT NULL,
	"department_id"	TEXT NOT NULL,
	"status"	TEXT NOT NULL,
	PRIMARY KEY("book_id" AUTOINCREMENT),
	FOREIGN KEY("department_id") REFERENCES "department"("department_id"));`);

    db.run(`CREATE TABLE IF NOT EXISTS "course" (
	"course_id"	TEXT NOT NULL UNIQUE,
	"name"	TEXT NOT NULL,
	"department_id"	TEXT NOT NULL,
	PRIMARY KEY("course_id"),
	FOREIGN KEY("department_id") REFERENCES "department"("department_id"));`);

    db.run(`CREATE TABLE IF NOT EXISTS "department" (
	"department_id"	TEXT NOT NULL UNIQUE,
	"name"	TEXT NOT NULL,
	PRIMARY KEY("department_id"));`);

    db.run(`CREATE TABLE IF NOT EXISTS "students" (
	"student_id"	TEXT NOT NULL UNIQUE,
	"student_name"	TEXT NOT NULL,
	"course_id"	TEXT NOT NULL,
	"student_year"	INTEGER NOT NULL,
	"contact_number"	NUMERIC NOT NULL,
	"status"	TEXT,
	PRIMARY KEY("student_id"),
	FOREIGN KEY("course_id") REFERENCES "course"("course_id"));`);

    // New normalized transaction tables per updated requirements
    db.run(`CREATE TABLE IF NOT EXISTS "transaction_borrow" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "book_id" INTEGER NOT NULL,
      "copy_id" TEXT,
      "borrower_id" TEXT NOT NULL,
      "transaction_type" TEXT NOT NULL,
      "borrowed_at" TEXT,
      "due_at" TEXT,
      "returned_at" TEXT,
      "staff_id" TEXT NOT NULL,
      FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE,
      FOREIGN KEY("borrower_id") REFERENCES "students"("student_id") ON DELETE CASCADE,
      FOREIGN KEY("copy_id") REFERENCES "book_copy"("copy_id") ON DELETE SET NULL
    );`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_book ON "transaction_borrow"("book_id");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_copy ON "transaction_borrow"("copy_id");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_borrower ON "transaction_borrow"("borrower_id");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_type ON "transaction_borrow"("transaction_type");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_dates ON "transaction_borrow"("borrowed_at", "returned_at", "due_at");`);

    db.run(`CREATE TABLE IF NOT EXISTS "transaction_library" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "book_id" INTEGER NOT NULL,
      "operation_type" TEXT NOT NULL,
      "before_values" TEXT,
      "after_values" TEXT,
      "staff_id" TEXT NOT NULL,
      "timestamp" TEXT NOT NULL,
      FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE
    );`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_library_book ON "transaction_library"("book_id");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_library_type ON "transaction_library"("operation_type");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_library_time ON "transaction_library"("timestamp");`);

    db.run(`CREATE TABLE IF NOT EXISTS "archived_book_copy" (
      "archive_copy_id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "copy_id" TEXT NOT NULL UNIQUE,
      "book_id" INTEGER NOT NULL,
      "status" TEXT,
      "condition" TEXT,
      "borrowed_date" TEXT,
      "returned_date" TEXT,
      "due_date" TEXT,
      "archived_at" TEXT NOT NULL,
      FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE
    );`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_archived_book_copy_book ON "archived_book_copy"("book_id");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_archived_book_copy_copy ON "archived_book_copy"("copy_id");`);

    db.run(`CREATE TABLE IF NOT EXISTS "archived_transaction_borrow" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "book_id" INTEGER NOT NULL,
      "copy_id" TEXT,
      "borrower_id" TEXT,
      "transaction_type" TEXT NOT NULL,
      "borrowed_at" TEXT,
      "due_at" TEXT,
      "returned_at" TEXT,
      "staff_id" TEXT,
      "archived_at" TEXT NOT NULL,
      "archive_reason" TEXT NOT NULL,
      FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE,
      FOREIGN KEY("borrower_id") REFERENCES "students"("student_id") ON DELETE SET NULL,
      FOREIGN KEY("copy_id") REFERENCES "book_copy"("copy_id") ON DELETE SET NULL
    );`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_arch_tx_borrow_book ON "archived_transaction_borrow"("book_id");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_arch_tx_borrow_copy ON "archived_transaction_borrow"("copy_id");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_arch_tx_borrow_borrower ON "archived_transaction_borrow"("borrower_id");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_arch_tx_borrow_type ON "archived_transaction_borrow"("transaction_type");`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_arch_tx_borrow_dates ON "archived_transaction_borrow"("borrowed_at", "returned_at", "due_at");`);
  }
}

const databaseSchema = new DatabaseSchema();

async function createDB() { return databaseSchema.createDB(); }
async function applyAdditionalSchema() {
  // Ensure new normalized transaction tables exist for existing databases
  db.run(`CREATE TABLE IF NOT EXISTS "transaction_borrow" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "book_id" INTEGER NOT NULL,
    "copy_id" TEXT,
    "borrower_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "borrowed_at" TEXT,
    "due_at" TEXT,
    "returned_at" TEXT,
    "staff_id" TEXT NOT NULL,
    FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE,
    FOREIGN KEY("borrower_id") REFERENCES "students"("student_id") ON DELETE CASCADE,
    FOREIGN KEY("copy_id") REFERENCES "book_copy"("copy_id") ON DELETE SET NULL
  );`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_book ON "transaction_borrow"("book_id");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_copy ON "transaction_borrow"("copy_id");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_borrower ON "transaction_borrow"("borrower_id");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_type ON "transaction_borrow"("transaction_type");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_dates ON "transaction_borrow"("borrowed_at", "returned_at", "due_at");`);

  let stmt = db.prepare("PRAGMA table_info(transaction_borrow)");
  let hasCopyId = false;
  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.name === 'copy_id') hasCopyId = true;
  }
  stmt.free();
  if (!hasCopyId) {
    try { db.run(`ALTER TABLE transaction_borrow ADD COLUMN copy_id TEXT;`); } catch (_) {}
  }
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_borrow_copy ON "transaction_borrow"("copy_id");`); } catch (_) {}

  db.run(`CREATE TABLE IF NOT EXISTS "transaction_library" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "book_id" INTEGER NOT NULL,
    "operation_type" TEXT NOT NULL,
    "before_values" TEXT,
    "after_values" TEXT,
    "staff_id" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE
  );`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_library_book ON "transaction_library"("book_id");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_library_type ON "transaction_library"("operation_type");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_library_time ON "transaction_library"("timestamp");`);

    try {
    let stmtTl = db.prepare("PRAGMA table_info(transaction_library)");
    let bookIsNotNull = false;
    while (stmtTl.step()) {
      const row = stmtTl.getAsObject();
      if (row.name === 'book_id') bookIsNotNull = (row.notnull === 1);
    }
    stmtTl.free();
    if (bookIsNotNull) {
      try {
        db.run(`CREATE TABLE IF NOT EXISTS "transaction_library_new" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "book_id" INTEGER,
          "operation_type" TEXT NOT NULL,
          "before_values" TEXT,
          "after_values" TEXT,
          "staff_id" TEXT NOT NULL,
          "timestamp" TEXT NOT NULL,
          FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE
        );`);
        db.run(`INSERT INTO transaction_library_new (id, book_id, operation_type, before_values, after_values, staff_id, timestamp)
                SELECT id, book_id, operation_type, before_values, after_values, staff_id, timestamp FROM transaction_library;`);
        db.run(`DROP TABLE transaction_library;`);
        db.run(`ALTER TABLE transaction_library_new RENAME TO transaction_library;`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_library_book ON "transaction_library"("book_id");`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_library_type ON "transaction_library"("operation_type");`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_library_time ON "transaction_library"("timestamp");`);
      } catch (_) {}
    }
  } catch (_) {}

  db.run(`CREATE TABLE IF NOT EXISTS "archived_book_copy" (
    "archive_copy_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "copy_id" TEXT NOT NULL UNIQUE,
    "book_id" INTEGER NOT NULL,
    "status" TEXT,
    "condition" TEXT,
    "borrowed_date" TEXT,
    "returned_date" TEXT,
    "due_date" TEXT,
    "archived_at" TEXT NOT NULL,
    FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE
  );`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_archived_book_copy_book ON "archived_book_copy"("book_id");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_archived_book_copy_copy ON "archived_book_copy"("copy_id");`);

  db.run(`CREATE TABLE IF NOT EXISTS "archived_transaction_borrow" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "book_id" INTEGER NOT NULL,
    "copy_id" TEXT,
    "borrower_id" TEXT,
    "transaction_type" TEXT NOT NULL,
    "borrowed_at" TEXT,
    "due_at" TEXT,
    "returned_at" TEXT,
    "staff_id" TEXT,
    "archived_at" TEXT NOT NULL,
    "archive_reason" TEXT NOT NULL,
    FOREIGN KEY("book_id") REFERENCES "books"("book_id") ON DELETE CASCADE,
    FOREIGN KEY("borrower_id") REFERENCES "students"("student_id") ON DELETE SET NULL,
    FOREIGN KEY("copy_id") REFERENCES "book_copy"("copy_id") ON DELETE SET NULL
  );`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_arch_tx_borrow_book ON "archived_transaction_borrow"("book_id");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_arch_tx_borrow_copy ON "archived_transaction_borrow"("copy_id");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_arch_tx_borrow_borrower ON "archived_transaction_borrow"("borrower_id");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_arch_tx_borrow_type ON "archived_transaction_borrow"("transaction_type");`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_arch_tx_borrow_dates ON "archived_transaction_borrow"("borrowed_at", "returned_at", "due_at");`);

  // Ensure archived_books has author and publication_date columns
  try {
    let stmtAb = db.prepare("PRAGMA table_info(archived_books)");
    let hasAuthor = false;
    let hasPubDate = false;
    while (stmtAb.step()) {
      const row = stmtAb.getAsObject();
      if (row.name === 'author') hasAuthor = true;
      if (row.name === 'publication_date') hasPubDate = true;
    }
    stmtAb.free();
    if (!hasAuthor) {
      try { db.run(`ALTER TABLE archived_books ADD COLUMN author TEXT;`); } catch (_) {}
    }
    if (!hasPubDate) {
      try { db.run(`ALTER TABLE archived_books ADD COLUMN publication_date TEXT;`); } catch (_) {}
    }
    // Backfill from books table where missing
    try {
      db.run(`UPDATE archived_books SET author = (SELECT author FROM books WHERE books.book_id = archived_books.book_id) WHERE author IS NULL OR author = ''`);
    } catch (_) {}
    try {
      db.run(`UPDATE archived_books SET publication_date = (SELECT publication_date FROM books WHERE books.book_id = archived_books.book_id) WHERE publication_date IS NULL OR publication_date = ''`);
    } catch (_) {}
  } catch (_) {}
}
if (typeof window !== "undefined") {
  window.BCULMS = window.BCULMS || {};
  window.BCULMS.DatabaseSchema = DatabaseSchema;
  window.BCULMS.databaseSchema = databaseSchema;
  window.applyAdditionalSchema = applyAdditionalSchema;
}
