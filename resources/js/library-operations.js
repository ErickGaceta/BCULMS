/**
 * Class encapsulating library domain operations while preserving global function APIs.
 */
class LibraryOperations {
  formatPHT12(date) {
    const base = (date instanceof Date) ? date : new Date(date);
    const d = new Date(base.getTime() + 8 * 60 * 60 * 1000);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    let h = d.getUTCHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    const hh = String(h).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    const sec = String(d.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec} ${ampm}`;
  }
  async archiveBook(bookId) {
    const user = await requireRole(["Admin", "Librarian"]);
    const booksRes = await insertDB("select", "books", "*", { book_id: bookId });
    const books = booksRes?.data || [];
    if (books.length === 0) {
      throw new Error(`Book with ID ${bookId} not found.`);
    }
    const book = books[0];

    const existingArchiveRes = await insertDB("select", "archived_books", "*", { book_id: bookId });
    const existingArchive = existingArchiveRes?.data || [];
    if (existingArchive.length > 0) {
      return { success: true, message: "Book already archived." };
    }
    const copiesRes = await insertDB("select", "book_copy", "*", { book_id: bookId });
    const copies = copiesRes?.data || [];
    const nowStr = this.formatPHT12(new Date());
    const archiveData = {
      archive_id: await this.generateArchiveId(),
      book_id: book.book_id,
      book_title: book.title,
      author: book.author,
      publication_date: book.publication_date,
      archive_date: nowStr,
    };
    await runDBTransaction(async () => {
      await insertDB("update", "books", { status: "Archived" }, { book_id: bookId });
      await insertDB("insert", "archived_books", archiveData);
      for (const copy of copies) {
        const status = (copy.status || "").toString();
        if (status.toLowerCase() === "borrowed") {
          continue;
        }
        await insertDB("insert", "archived_book_copy", {
          copy_id: copy.copy_id,
          book_id: copy.book_id,
          status: copy.status,
          condition: copy.condition,
          borrowed_date: copy.borrowed_date || null,
          returned_date: copy.returned_date || null,
          due_date: copy.due_date || null,
          archived_at: nowStr,
        });
        await insertDB("delete", "book_copy", null, { copy_id: copy.copy_id });
      }
      const txRes = await insertDB("select", "transaction_borrow", "*", { book_id: bookId });
      const txs = txRes?.data || [];
      for (const t of txs) {
        if (t.returned_at) {
          await insertDB("insert", "archived_transaction_borrow", {
            book_id: t.book_id,
            copy_id: t.copy_id,
            borrower_id: t.borrower_id,
            transaction_type: t.transaction_type,
            borrowed_at: t.borrowed_at,
            due_at: t.due_at,
            returned_at: t.returned_at,
            staff_id: t.staff_id,
            archived_at: nowStr,
            archive_reason: "Book Archived",
          });
        }
      }
      for (const t of txs) {
        if (t.returned_at) {
          await insertDB("delete", "transaction_borrow", null, { id: t.id });
        }
      }
      await insertDB("insert", "transaction_library", {
        book_id: bookId,
        operation_type: "Archive",
        before_values: JSON.stringify({ title: book.title, author: book.author }),
        after_values: JSON.stringify({ reason: "Archived" }),
        staff_id: user.id,
        timestamp: nowStr,
      });
    });
    return { success: true, archive_id: archiveData.archive_id, book_id: bookId };
  }

  /**
   * Insert a generic library transaction record.
   * @param {object} transactionData Transaction fields
   */
  async insertTransaction(transactionData) {
    return await insertDB("insert", "transaction_library", transactionData);
  }

  /**
   * Update a library transaction by id.
   * @param {object} transactionData Transaction fields
   * @param {number} transactionId Transaction identifier
   */
  async updateTransaction(transactionData, transactionId) {
    return await insertDB("update", "transaction_library", transactionData, { id: transactionId });
  }

  /**
   * Insert a book and create initial copies.
   * @param {object} bookData Book fields
   * @param {number} numberOfCopies Number of copies to create
   */
  async insertBook(bookData, numberOfCopies = 1) {
    const user = await requireRole(["Admin", "Librarian"]);
    const bookInsert = {};
    ["book_id", "title", "author", "publication_date", "type", "department_id", "status"].forEach((k) => {
      if (bookData[k] !== undefined && bookData[k] !== null) bookInsert[k] = bookData[k];
    });
    return await runDBTransaction(async () => {
      const bookResult = await insertDB("insert", "books", bookInsert);
      const newBookId = bookResult.lastInsertRowid || bookResult.insertId;
      if (!newBookId) {
        throw new Error("No book_id returned from insertDB");
      }
      if (numberOfCopies > 0) {
        for (let i = 1; i <= numberOfCopies; i++) {
          const copyData = {
            copy_id: this.generateCopyId(bookData.department_id, newBookId, i),
            book_id: newBookId,
            status: "Available",
            condition: "New",
          };
          await insertDB("insert", "book_copy", copyData);
        }
      }
      await insertDB("insert", "transaction_library", {
        book_id: newBookId,
        operation_type: "Add",
        before_values: null,
        after_values: JSON.stringify({ title: bookData.title, author: bookData.author, quantity: numberOfCopies }),
        staff_id: user.id,
        timestamp: this.formatPHT12(new Date()),
      });
      return bookResult;
    });
  }

  /**
   * Update a book by id.
   * @param {object} bookData Book fields to update
   * @param {number|string} bookId Book identifier
   */
  async updateBook(bookData, bookId) {
    const user = await requireRole(["Admin", "Librarian"]);
    let bookResult = { changes: 0 };
    if (Object.keys(bookData).length > 0) {
      const beforeRes = await insertDB("select", "books", "*", { book_id: bookId });
      const before = beforeRes?.data?.[0] || null;
      bookResult = await runDBTransaction(async () => {
        const res = await insertDB("update", "books", bookData, { book_id: bookId });
        await insertDB("insert", "transaction_library", {
          book_id: bookId,
          operation_type: "Edit",
          before_values: before ? JSON.stringify(before) : null,
          after_values: JSON.stringify(bookData),
          staff_id: user.id,
          timestamp: this.formatPHT12(new Date()),
        });
        return res;
      });
    }
    return bookResult;
  }

  /**
   * Adjust number of copies for a book.
   * @param {number|string} bookId Book identifier
   * @param {number} newNumberOfCopies Desired copies count
   */
  async updateBookCopies(bookId, newNumberOfCopies) {
    const user = await requireRole(["Admin", "Librarian"]);
    const existingCopies = await getBookCopies({ book_id: bookId });
    const currentCount = existingCopies.length;
    if (newNumberOfCopies === currentCount) {
      return { copiesChanged: false };
    }

    const bookQuery = db.prepare("SELECT department_id FROM books WHERE book_id = ?");
    bookQuery.bind([bookId]);
    let department = "UNKNOWN";
    if (bookQuery.step()) {
      const row = bookQuery.getAsObject();
      department = row.department_id || "UNKNOWN";
    }
    bookQuery.free();

    let copiesChanged = false;
    if (newNumberOfCopies > currentCount) {
      const copiesToAdd = newNumberOfCopies - currentCount;
      for (let i = 0; i < copiesToAdd; i++) {
        const copyNumber = currentCount + i + 1;
        const copyId = this.generateCopyId(department, bookId, copyNumber);
        const copyData = {
          copy_id: copyId,
          book_id: bookId,
          status: "Available",
          condition: "Good",
          borrowed_date: null,
          returned_date: null,
          due_date: null,
        };
        await insertDB("insert", "book_copy", copyData);
      }
      copiesChanged = true;
    } else if (newNumberOfCopies < currentCount) {
      const copiesToRemove = currentCount - newNumberOfCopies;
      const sortedCopies = existingCopies.sort((a, b) => {
        const numA = parseInt(a.copy_id.split('-C')[1]);
        const numB = parseInt(b.copy_id.split('-C')[1]);
        return numB - numA;
      });
      for (let i = 0; i < copiesToRemove; i++) {
        await insertDB("delete", "book_copy", null, { copy_id: sortedCopies[i].copy_id });
      }
      copiesChanged = true;
    }
    if (copiesChanged) {
      await insertDB("insert", "transaction_library", {
        book_id: bookId,
        operation_type: "Edit",
        before_values: JSON.stringify({ copies: currentCount }),
        after_values: JSON.stringify({ copies: newNumberOfCopies }),
        staff_id: user.id,
        timestamp: this.formatPHT12(new Date()),
      });
    }
    return { copiesChanged };
  }

  /**
   * Delete a book if none of its copies are borrowed.
   * @param {number|string} bookId Book identifier
   */
  async deleteBook(bookId) {
    return await this.archiveBook(bookId);
  }

  /**
   * Generate deterministic copy id.
   * @param {string} department Department code
   * @param {number|string} bookId Book id
   * @param {number} copyNumber Sequential copy number
   */
  generateCopyId(department, bookId, copyNumber) {
    return `${department}-${bookId}-C${String(copyNumber).padStart(5, "0")}`;
  }

  /**
   * Update a student by id.
   * @param {object} studentData Student fields
   * @param {string} studentId Student identifier
   */
  async updateStudent(studentData, studentId) {
    return await insertDB("update", "students", studentData, { student_id: studentId });
  }

  /**
   * Delete a student by id.
   * @param {string} studentId Student identifier
   */
  async deleteStudent(studentId) {
    return await this.archiveStudent(studentId);
  }

  /**
   * Generate next archive id.
   */
  async generateArchiveId() {
    const archivesRes = await insertDB("select", "archived_books", "*", null);
    const archives = archivesRes?.data || [];
    if (archives.length === 0) {
      return 1;
    }
    const maxId = Math.max(...archives.map((archive) => Number(archive.archive_id) || 0));
    return maxId + 1;
  }

  /**
   * Restore an archived book back to the active collection.
   * @param {number|string} bookId Book identifier
   */
  async restoreArchivedBook(bookId) {
    const user = await requireRole(["Admin", "Librarian"]);
    
    // Get archived book details
    const archivedBookRes = await insertDB("select", "archived_books", "*", { book_id: bookId });
    const archivedBooks = archivedBookRes?.data || [];
    
    if (archivedBooks.length === 0) {
      return { success: false, message: "Archived book not found." };
    }
    
    const archivedBook = archivedBooks[0];
    
    // Check if book already exists in active collection
    const existingBookRes = await insertDB("select", "books", "*", { book_id: bookId });
    const existingBooks = existingBookRes?.data || [];
    
    if (existingBooks.length > 0 && existingBooks[0].status !== "Archived") {
      return { success: false, message: "Book already exists in active collection." };
    }
    
    const nowStr = this.formatPHT12(new Date());
    
    await runDBTransaction(async () => {
      // Restore book status
      await insertDB("update", "books", { status: "In Library" }, { book_id: bookId });
      
      // Get archived copies
      const archivedCopiesRes = await insertDB("select", "archived_book_copy", "*", { book_id: bookId });
      const archivedCopies = archivedCopiesRes?.data || [];
      
      // Restore archived copies
      for (const archivedCopy of archivedCopies) {
        await insertDB("insert", "book_copy", {
          copy_id: archivedCopy.copy_id,
          book_id: archivedCopy.book_id,
          status: archivedCopy.status || "Available",
          condition: archivedCopy.condition || "Good",
          borrowed_date: archivedCopy.borrowed_date || null,
          returned_date: archivedCopy.returned_date || null,
          due_date: archivedCopy.due_date || null,
        });
        
        // Delete from archived_book_copy
        await insertDB("delete", "archived_book_copy", null, { archive_copy_id: archivedCopy.archive_copy_id });
      }
      
      // Get archived transactions
      const archivedTxRes = await insertDB("select", "archived_transaction_borrow", "*", { book_id: bookId });
      const archivedTxs = archivedTxRes?.data || [];
      
      // Restore archived transactions
      for (const archivedTx of archivedTxs) {
        await insertDB("insert", "transaction_borrow", {
          book_id: archivedTx.book_id,
          copy_id: archivedTx.copy_id,
          borrower_id: archivedTx.borrower_id,
          transaction_type: archivedTx.transaction_type,
          borrowed_at: archivedTx.borrowed_at,
          due_at: archivedTx.due_at,
          returned_at: archivedTx.returned_at,
          staff_id: archivedTx.staff_id,
        });
        
        // Delete from archived_transaction_borrow
        await insertDB("delete", "archived_transaction_borrow", null, { id: archivedTx.id });
      }
      
      // Delete from archived_books
      await insertDB("delete", "archived_books", null, { book_id: bookId });
      
      // Log the restoration
      await insertDB("insert", "transaction_library", {
        book_id: bookId,
        operation_type: "Restore",
        before_values: JSON.stringify({ title: archivedBook.book_title, status: "Archived" }),
        after_values: JSON.stringify({ status: "In Library" }),
        staff_id: user.id,
        timestamp: nowStr,
      });
    });
    
    return { success: true, book_id: bookId, book_title: archivedBook.book_title };
  }

  /**
   * Insert a new student.
   * @param {object} studentData Student fields
   */
  async insertStudent(studentData) {
    return await insertDB("insert", "students", studentData);
  }

  async archiveStudent(studentId) {
    const user = await requireRole(["Admin", "Librarian"]);
    const nowStr = this.formatPHT12(new Date());
    const stuRes = await insertDB("select", "students", "*", { student_id: studentId });
    const student = stuRes?.data?.[0];
    if (!student) { throw new Error(`Student with ID ${studentId} not found.`); }
    await runDBTransaction(async () => {
      await insertDB("update", "students", { status: "Archived" }, { student_id: studentId });
      const txRes = await insertDB("select", "transaction_borrow", "*", { borrower_id: studentId });
      const txs = txRes?.data || [];
      for (const t of txs) {
        if (t.returned_at) {
          await insertDB("insert", "archived_transaction_borrow", {
            book_id: t.book_id,
            copy_id: t.copy_id,
            borrower_id: t.borrower_id,
            transaction_type: t.transaction_type,
            borrowed_at: t.borrowed_at,
            due_at: t.due_at,
            returned_at: t.returned_at,
            staff_id: t.staff_id,
            archived_at: nowStr,
            archive_reason: "Student Archived",
          });
        }
      }
      for (const t of txs) {
        if (t.returned_at) {
          await insertDB("delete", "transaction_borrow", null, { id: t.id });
        }
      }
      await insertDB("insert", "transaction_library", {
        book_id: null,
        operation_type: "ArchiveStudent",
        before_values: JSON.stringify({ student_id: student.student_id, student_name: student.student_name }),
        after_values: JSON.stringify({ status: "Archived" }),
        staff_id: user.id,
        timestamp: nowStr,
      });
    });
    return { success: true, student_id: studentId };
  }

  async restoreArchivedStudent(studentId) {
    const user = await requireRole(["Admin", "Librarian"]);
    const nowStr = this.formatPHT12(new Date());
    const stuRes = await insertDB("select", "students", "*", { student_id: studentId });
    const student = stuRes?.data?.[0];
    if (!student) { throw new Error(`Student with ID ${studentId} not found.`); }
    await runDBTransaction(async () => {
      await insertDB("update", "students", { status: "Active" }, { student_id: studentId });
      const archTxRes = await insertDB("select", "archived_transaction_borrow", "*", { borrower_id: studentId });
      const archTxs = archTxRes?.data || [];
      for (const t of archTxs) {
        await insertDB("insert", "transaction_borrow", {
          book_id: t.book_id,
          copy_id: t.copy_id,
          borrower_id: t.borrower_id,
          transaction_type: t.transaction_type,
          borrowed_at: t.borrowed_at,
          due_at: t.due_at,
          returned_at: t.returned_at,
          staff_id: t.staff_id,
        });
        await insertDB("delete", "archived_transaction_borrow", null, { id: t.id });
      }
      await insertDB("insert", "transaction_library", {
        book_id: null,
        operation_type: "RestoreStudent",
        before_values: JSON.stringify({ student_id: student.student_id, student_name: student.student_name, status: "Archived" }),
        after_values: JSON.stringify({ status: "Active" }),
        staff_id: user.id,
        timestamp: nowStr,
      });
    });
    return { success: true, student_id: studentId };
  }
}

const libraryOperations = new LibraryOperations();

async function archiveBook(bookId) { return libraryOperations.archiveBook(bookId); }
async function insertTransaction(transactionData) { return libraryOperations.insertTransaction(transactionData); }
async function updateTransaction(transactionData, transactionId) { return libraryOperations.updateTransaction(transactionData, transactionId); }
async function insertBook(bookData, numberOfCopies = 1) { return libraryOperations.insertBook(bookData, numberOfCopies); }
async function updateBook(bookData, bookId) { return libraryOperations.updateBook(bookData, bookId); }
async function updateBookCopies(bookId, newNumberOfCopies) { return libraryOperations.updateBookCopies(bookId, newNumberOfCopies); }
async function deleteBook(bookId) { return libraryOperations.deleteBook(bookId); }
function generateCopyId(department, bookId, copyNumber) { return libraryOperations.generateCopyId(department, bookId, copyNumber); }
async function updateStudent(studentData, studentId) { return libraryOperations.updateStudent(studentData, studentId); }
async function deleteStudent(studentId) { return libraryOperations.deleteStudent(studentId); }
async function archiveStudent(studentId) { return libraryOperations.archiveStudent(studentId); }
async function restoreArchivedStudent(studentId) { return libraryOperations.restoreArchivedStudent(studentId); }
async function generateArchiveId() { return libraryOperations.generateArchiveId(); }
async function insertStudent(studentData) { return libraryOperations.insertStudent(studentData); }
async function restoreArchivedBook(bookId) { return libraryOperations.restoreArchivedBook(bookId); }
if (typeof window !== "undefined") {
  window.BCULMS = window.BCULMS || {};
  window.BCULMS.LibraryOperations = LibraryOperations;
  window.BCULMS.libraryOperations = libraryOperations;
}
