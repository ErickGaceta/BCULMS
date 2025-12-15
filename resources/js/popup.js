function addBookPopup() {}

function archiveBookPopup() {}

async function addStudentPopup() {
  await renderStudents();

  const params = new URLSearchParams(window.location.search);
  const modalId = params.get("modal");

  if (modalId) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  const addStudentModal = document.getElementById("addStudentContent");
  if (addStudentModal) {
    addStudentModal.addEventListener("show.bs.modal", async function () {
      const courseSelect = document.getElementById("courseSelect");
      const deptSelect = document.getElementById("studentDepartmentSelect");
      try {
        // Load departments
        const deptRes = await getDepartments();
        const departments = deptRes.data || [];
        deptSelect.innerHTML = '<option value="">Select Department</option>';
        departments.forEach((dept) => {
          const opt = document.createElement("option");
          opt.value = dept.department_id;
          opt.textContent = dept.name;
          deptSelect.appendChild(opt);
        });

        // Load courses and filter by department when selected
        const result = await getCourses();
        const courses = result.data || [];
        const renderCourses = (deptId) => {
          courseSelect.innerHTML = '<option value="">Select Course</option>';
          const filtered = deptId ? courses.filter(c => c.department_id === deptId) : [];
          filtered.forEach((course) => {
            const option = document.createElement("option");
            option.value = course.course_id;
            option.textContent = course.name;
            courseSelect.appendChild(option);
          });
          courseSelect.disabled = filtered.length === 0;
        };
        renderCourses(null);
        courseSelect.disabled = true;
        deptSelect.disabled = false;
        deptSelect.addEventListener('change', (e) => {
          renderCourses(e.target.value);
        });
      } catch (error) {
        console.error("Error loading courses:", error);
        courseSelect.innerHTML = '<option value="">Error loading courses</option>';
        deptSelect.innerHTML = '<option value="">Error loading departments</option>';
        courseSelect.disabled = true;
        deptSelect.disabled = true;
      }
    });
  }
}

function addBookPopup() {}

function addBookPopup() {}

async function bookContentLoader() {
  const tbody = document.getElementById("booksTableBody");

  // Create proper Bootstrap modal
  const modalHTML = `
    <div class="modal fade" id="bookContextModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-info text-white">
            <h5 class="modal-title">Book Options for <span style="color: #00ff15" id="bookContextTitle"></span></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0">
            <ul class="list-group list-group-flush mb-0">
              <li class="list-group-item list-group-item-action" id="editBook">Edit Details</li>
              <li class="list-group-item list-group-item-action text-danger" id="deleteBook">Archive</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modalElement = document.getElementById("bookContextModal");
  const modalInstance = new bootstrap.Modal(modalElement);
  let selectedRow = null;

  tbody.addEventListener("contextmenu", (e) => {
    const row = e.target.closest("tr[data-book-id]");
    if (!row) return;
    e.preventDefault();
    selectedRow = row;

    const titleCell = selectedRow.querySelector("td:first-child");
    document.getElementById("bookContextTitle").textContent = titleCell
      ? titleCell.textContent.trim()
      : "";
    modalInstance.show();
  });

  // Menu actions
  modalElement.querySelector("#editBook").onclick = () =>
    showBookPopup("edit", selectedRow.dataset.bookId);
  modalElement.querySelector("#deleteBook").onclick = () =>
    showBookPopup("delete", selectedRow.dataset.bookId);
}

async function bookCopyModalLoader() {
  const tbody = document.getElementById("bookCopiesTableBody");

  // Create proper Bootstrap modal
  const modalHTML = `
    <div class="modal fade" id="bookCopyContextModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-info text-white">
            <h5 class="modal-title">Book Copy Options for <span style="color: #00ff15" id="bookCopyContextTitle"></span></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0">
            <ul class="list-group list-group-flush mb-0">
              <li class="list-group-item list-group-item-action" id="setBorrowedBook">Set as Borrowed</li>
              <li class="list-group-item list-group-item-action" id="setReturnedBook">Set as Returned</li>
              <li class="list-group-item list-group-item-action" id="bookCopyDetails">Details</li>
              <li class="list-group-item list-group-item-action text-danger" id="deleteBookCopy">Delete</li>
            </ul>
          </div> 
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modalElement = document.getElementById("bookCopyContextModal");
  const modalInstance = new bootstrap.Modal(modalElement);
  let selectedRow = null;

  tbody.addEventListener("contextmenu", async (e) => {
    const row = e.target.closest("tr[data-copy-id]");
    if (!row) return;
    e.preventDefault();

    selectedRow = row;

    const firstCell = selectedRow.querySelector("td:first-child");
    const thirdCell = selectedRow.querySelector("td:nth-child(3)");

    const titleText = [
      firstCell?.textContent.trim(),
      thirdCell?.textContent.trim(),
    ]
      .filter(Boolean)
      .join(" - ");

    document.getElementById("bookCopyContextTitle").textContent = titleText;

    const copyId = selectedRow.dataset.copyId;
    const setBorrowedEl = modalElement.querySelector("#setBorrowedBook");
    const setReturnedEl = modalElement.querySelector("#setReturnedBook");
    try {
      const res = await insertDB("select", "book_copy", "status", { copy_id: copyId });
      const st = (res.data?.[0]?.status || "").toLowerCase();
      if (st === "borrowed") {
        setBorrowedEl.style.display = "none";
        setReturnedEl.style.display = "";
      } else {
        setBorrowedEl.style.display = "";
        setReturnedEl.style.display = "none";
      }
    } catch (err) {
      setBorrowedEl.style.display = "";
      setReturnedEl.style.display = "none";
    }

    modalInstance.show();
  });

  // Menu actions
  modalElement.querySelector("#setBorrowedBook").onclick = () => {
    const copyId = selectedRow.dataset.copyId;
    (async () => {
      const copyResult = await insertDB("select", "book_copy", "*", { copy_id: copyId });
      const copy = copyResult.data?.[0];
      if (!copy) {
        showModalAlert("Book copy not found.", "danger");
        return;
      }
      if ((copy.status || "").toLowerCase() !== "available") {
        showModalAlert("Copy is not available.", "warning");
        return;
      }
      // Status check (Available) already ensures no active borrow
      const studentsResult = await getStudents();
      const students = studentsResult.data || [];
      const modal = document.createElement("div");
      modal.className = "modal fade";
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title">Assign Borrower</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Student</label>
                <select class="form-control" id="borrowStudentSelect">
                  ${students
                    .map(
                      (s) => `<option value="${s.student_id}">${s.student_name} (${s.student_id})</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Due Date</label>
                <input type="date" class="form-control" id="borrowDueDate">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="confirmBorrowBtn">Confirm</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      const dueInput = modal.querySelector("#borrowDueDate");
      const today = new Date();
      const defaultDue = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dueInput.value = fmt(defaultDue);
      modal.querySelector("#confirmBorrowBtn").addEventListener("click", async () => {
        const studentId = modal.querySelector("#borrowStudentSelect").value;
        const dueDate = modal.querySelector("#borrowDueDate").value;
        const borrowedDate = fmt(today);
        const formatPHT12 = (date) => {
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
        };
        const borrowedAtStr = formatPHT12(new Date());
        const dueAtStr = `${dueDate} 12:00:00 AM`;
        if (new Date(dueDate) < new Date(fmt(today))) {
          showModalAlert("Due date cannot be before today.", "warning");
          return;
        }
        try {
          const copyRow = await insertDB("select", "book_copy", "*", { copy_id: copyId });
          const copyData = copyRow?.data?.[0];
          const bookId = copyData?.book_id;
          const user = await requireRole(["Admin", "Librarian"]);
          await runDBTransaction(async () => {
            await insertDB("insert", "transaction_borrow", {
              book_id: bookId,
              copy_id: copyId,
              borrower_id: studentId,
              transaction_type: "Borrow",
              borrowed_at: borrowedAtStr,
              due_at: dueAtStr,
              returned_at: null,
              staff_id: user.id,
            });
            await insertDB("update", "book_copy", {
              status: "Borrowed",
              borrowed_date: borrowedAtStr,
              returned_date: null,
              due_date: dueAtStr,
            }, { copy_id: copyId });
          });
          bsModal.hide();
          modal.remove();
          const cells = selectedRow.querySelectorAll("td");
          const studentsMap = {};
          students.forEach((s) => { studentsMap[s.student_id] = s.student_name; });
          if (cells[3]) cells[3].textContent = "Borrowed";
          if (cells[4]) cells[4].textContent = studentsMap[studentId] || studentId;
          showModalAlert("Borrow recorded successfully.", "success");
        } catch (error) {
          showModalAlert("Failed to record borrow: " + error.message, "danger");
        }
      });
      modal.addEventListener("hidden.bs.modal", () => modal.remove());
    })();
    modalInstance.hide();
  };

  modalElement.querySelector("#setReturnedBook").onclick = () => {
    const copyId = selectedRow.dataset.copyId;
    (async () => {
      const copyResult = await insertDB("select", "book_copy", "*", { copy_id: copyId });
      const copy = copyResult.data?.[0];
      if (!copy) {
        showModalAlert("Book copy not found.", "danger");
        return;
      }
      if ((copy.status || "").toLowerCase() !== "borrowed") {
        showModalAlert("Copy is not currently borrowed.", "warning");
        return;
      }
      const modal = document.createElement("div");
      modal.className = "modal fade";
      modal.innerHTML = `
        <div class=\"modal-dialog modal-dialog-centered\">
          <div class=\"modal-content\">
            <div class=\"modal-header bg-info text-white\">
              <h5 class=\"modal-title\">Set as Returned</h5>
              <button type=\"button\" class=\"btn-close btn-close-white\" data-bs-dismiss=\"modal\"></button>
            </div>
            <div class=\"modal-body\">
              <div class=\"mb-3\">
                <label class=\"form-label\">Condition</label>
                <select class=\"form-control\" id=\"returnConditionSelect\">
                  <option value=\"New\">New</option>
                  <option value=\"Good\" selected>Good</option>
                  <option value=\"Fair\">Fair</option>
                  <option value=\"Damaged\">Damaged</option>
                </select>
              </div>
              <div class=\"mb-3\">
                <label class=\"form-label\">Return Date</label>
                <input type=\"date\" class=\"form-control\" id=\"returnDateInput\">
              </div>
            </div>
            <div class=\"modal-footer\">
              <button type=\"button\" class=\"btn btn-secondary\" data-bs-dismiss=\"modal\">Cancel</button>
              <button type=\"button\" class=\"btn btn-primary\" id=\"confirmReturnBtn\">Confirm Return</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      const today = new Date();
      const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      modal.querySelector("#returnDateInput").value = fmt(today);
      modal.querySelector("#confirmReturnBtn").addEventListener("click", async () => {
        const condition = modal.querySelector("#returnConditionSelect").value;
        const returnDate = modal.querySelector("#returnDateInput").value || fmt(today);
        const formatPHT12 = (date) => {
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
        };
        const returnedAtStr = formatPHT12(new Date());
        try {
          const copyRow = await insertDB("select", "book_copy", "*", { copy_id: copyId });
          const copyData = copyRow?.data?.[0];
          const bookId = copyData?.book_id;
          const txRes = await insertDB("select", "transaction_borrow", "copy_id, borrower_id, transaction_type, borrowed_at, returned_at, due_at", { copy_id: copyId });
          const txs = txRes?.data || [];
          let borrowerId = null;
          txs.forEach(t => {
            const ts = t.transaction_type === 'Return' ? (t.returned_at || '') : (t.borrowed_at || t.due_at || '');
            const time = ts ? Date.parse(ts.replace(/ AM| PM/, '')) : 0;
            t._time = time;
          });
          txs.sort((a,b)=> (b._time||0)-(a._time||0));
          for (const t of txs) {
            if (t.transaction_type === 'Borrow') { borrowerId = t.borrower_id; break; }
          }
          const user = await requireRole(["Admin", "Librarian"]);
          await runDBTransaction(async () => {
            await insertDB("insert", "transaction_borrow", {
              book_id: bookId,
              copy_id: copyId,
              borrower_id: borrowerId,
              transaction_type: "Return",
              borrowed_at: null,
              due_at: null,
              returned_at: returnedAtStr,
              staff_id: user.id,
            });
            await insertDB("update", "book_copy", { status: "Available", condition: condition, returned_date: returnedAtStr, borrowed_date: null, due_date: null }, { copy_id: copyId });
          });
          const bookRow = await insertDB("select", "books", "status", { book_id: bookId });
          const bookStatus = bookRow?.data?.[0]?.status || "";
          if ((bookStatus || "").toLowerCase() === "archived") {
            const nowStr = returnedAtStr;
            const copyRow2 = await insertDB("select", "book_copy", "*", { copy_id: copyId });
            const copyData2 = copyRow2?.data?.[0];
            const txRes2 = await insertDB("select", "transaction_borrow", "*", { copy_id: copyId });
            const txs2 = txRes2?.data || [];
            await runDBTransaction(async () => {
              for (const t of txs2) {
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
              for (const t of txs2) {
                if (t.returned_at) {
                  await insertDB("delete", "transaction_borrow", null, { id: t.id });
                }
              }
              await insertDB("insert", "archived_book_copy", {
                copy_id: copyData2.copy_id,
                book_id: copyData2.book_id,
                status: copyData2.status,
                condition: copyData2.condition,
                borrowed_date: copyData2.borrowed_date || null,
                returned_date: copyData2.returned_date || null,
                due_date: copyData2.due_date || null,
                archived_at: nowStr,
              });
              await insertDB("delete", "book_copy", null, { copy_id: copyId });
            });
          }
          bsModal.hide();
          modal.remove();
          const cells = selectedRow.querySelectorAll("td");
          const bookArchived = (bookStatus || "").toLowerCase() === "archived";
          if (bookArchived) {
            selectedRow.remove();
            showModalAlert("Copy returned and archived.", "success");
            if (typeof renderBookCopies === 'function') { await renderBookCopies(1); }
          } else {
            if (cells[3]) cells[3].textContent = "Available";
            if (cells[4]) cells[4].textContent = "—";
            if (cells[5]) cells[5].textContent = condition;
            showModalAlert("Copy set as returned.", "success");
          }
        } catch (error) {
          showModalAlert("Failed to set returned: " + error.message, "danger");
        }
      });
      modal.addEventListener("hidden.bs.modal", () => modal.remove());
    })();
    modalInstance.hide();
  };

  modalElement.querySelector("#bookCopyDetails").onclick = async () => {
    const copyId = selectedRow.dataset.copyId;
    try {
      const res = await insertDB("select", "book_copy", "*", { copy_id: copyId });
      const copy = res.data?.[0];
      if (!copy) {
        showModalAlert("Book copy not found.", "danger");
        return;
      }
      const txRes = await insertDB(
        "select",
        "transaction_borrow",
        "borrower_id, transaction_type, borrowed_at, returned_at, due_at",
        { copy_id: copyId }
      );
      const txs = txRes?.data || [];
      txs.forEach(t => {
        const ts = t.transaction_type === "Return" ? (t.returned_at || "") : (t.borrowed_at || t.due_at || "");
        const time = ts ? Date.parse(ts.replace(/ AM| PM/, "")) : 0;
        t._time = time;
      });
      txs.sort((a,b)=> (b._time||0)-(a._time||0));
      let lastBorrowerId = null;
      for (const t of txs) {
        if (t.transaction_type === "Borrow") { lastBorrowerId = t.borrower_id; break; }
      }
      const studentsResult = await getStudents();
      const students = studentsResult.data || [];
      const studentsMap = {};
      students.forEach(s => { studentsMap[s.student_id] = s.student_name; });
      const lastBorrowerName = lastBorrowerId ? (studentsMap[lastBorrowerId] || String(lastBorrowerId)) : "—";
      const returnedDate = copy.returned_date || (txs.find(t => t.transaction_type === "Return" && t.returned_at)?.returned_at) || "—";
      const detailsHTML = `
        <div class="mb-2"><strong>Book Copy ID:</strong> ${copyId}</div>
        <div class="mb-2"><strong>Status:</strong> ${copy.status || "—"}</div>
        <div class="mb-2"><strong>Condition:</strong> ${copy.condition || "—"}</div>
        <div class="mb-2"><strong>Last Borrowed by:</strong> ${lastBorrowerName}</div>
        <div class="mb-2"><strong>Returned date:</strong> ${returnedDate}</div>
      `;
      showPopup("Copy Details", detailsHTML);
      modalInstance.hide();
    } catch (err) {
      showModalAlert("Failed to load copy details: " + err.message, "danger");
    }
  };

  modalElement.querySelector("#deleteBookCopy").onclick = async () => {
    const copyId = selectedRow.dataset.copyId;
    const titleText = document.getElementById(
      "bookCopyContextTitle"
    ).textContent;

    modalInstance.hide();

    try {
      // Check if copy exists and get its status
      const copyResult = await insertDB("select", "book_copy", "*", {
        copy_id: copyId,
      });
      const copyData = copyResult.data?.[0];

      if (!copyData) {
        showModalAlert("Book copy not found.", "danger");
        return;
      }

      // Check if copy is available (not borrowed)
      if (copyData.status !== "Available") {
        showModalAlert(
          `Cannot delete copy "${titleText}". This copy is currently ${copyData.status.toLowerCase()}.`,
          "danger"
        );
        return;
      }

      // Show confirmation modal
      showDeleteConfirmationModal(
        "Delete Book Copy",
        `Are you sure you want to delete copy "${titleText}"? This action cannot be undone.`,
        async () => {
          try {
            await insertDB("delete", "book_copy", null, { copy_id: copyId });

            selectedRow.remove();

            showModalAlert(
              `Copy "${titleText}" has been successfully deleted.`,
              "success"
            );
            if (typeof renderBookCopies === 'function') {
              await renderBookCopies(1);
            }
          } catch (error) {
            console.error("Error deleting book copy:", error);
            showModalAlert(
              "Error deleting book copy: " + error.message,
              "danger"
            );
          }
        }
      );
    } catch (error) {
      console.error("Error checking book copy:", error);
      showModalAlert("Error checking book copy: " + error.message, "danger");
    }
  };
}

async function showBookPopup(action, id) {
  switch (action) {
    case "edit":
      const row = document.querySelector(`tr[data-book-id="${id}"]`);
      if (!row) {
        alert("Book record not found on the page.");
        return;
      }

      const cells = row.querySelectorAll("td");
      const currentTitle = cells[0]?.textContent.trim() || "";
      const currentAuthor = cells[1]?.textContent.trim() || "";

      const existingCopies = await getBookCopies({ book_id: id });
      const currentCopies = existingCopies.length;

      openModal(
        "Edit Book",
        `
        <form id="editBookForm">
          <div class="mb-3">
            <label class="form-label">Book Title</label>
            <input type="text" class="form-control" id="editTitle" value="${currentTitle}">
          </div>
          <div class="mb-3">
            <label class="form-label">Author</label>
            <input type="text" class="form-control" id="editAuthor" value="${currentAuthor}">
          </div>
          <div class="mb-3">
            <label class="form-label">Number of Copies</label>
            <input type="number" class="form-control" id="editCopies" value="${currentCopies}" min="0">
          </div>
          <div class="mb-3">
            <p class="fs-6 text-warning-emphasis">
              <span class="text-danger">*</span> Leave fields blank if no changes necessary.
            </p>
          </div>
          <button type="submit" class="btn btn-primary w-100">Update Book</button>
        </form>
        `
      );

      const form = document.getElementById("editBookForm");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("editTitle").value.trim();
        const author = document.getElementById("editAuthor").value.trim();
        const newCopies = parseInt(
          document.getElementById("editCopies").value.trim(),
          10
        );

        console.log("=== DEBUG INFO ===");
        console.log("Current title:", currentTitle);
        console.log("New title:", title);
        console.log("Current author:", currentAuthor);
        console.log("New author:", author);
        console.log("Current copies:", currentCopies);
        console.log("New copies:", newCopies);
        console.log(
          "newCopies !== currentCopies:",
          newCopies !== currentCopies
        );
        console.log("!isNaN(newCopies):", !isNaN(newCopies));

        const bookData = {};
        if (title && title !== currentTitle) bookData.title = title;
        if (author && author !== currentAuthor) bookData.author = author;

        const newNumberOfCopies =
          !isNaN(newCopies) && newCopies !== currentCopies ? newCopies : null;

        console.log("bookData:", bookData);
        console.log("newNumberOfCopies:", newNumberOfCopies);
        console.log(
          "Object.keys(bookData).length:",
          Object.keys(bookData).length
        );

        if (Object.keys(bookData).length === 0 && newNumberOfCopies === null) {
          alert("Must update one field to proceed.");
          return;
        }

        try {
          let bookChanged = false;
          let copiesChanged = false;

          // Update book data if changed
          if (Object.keys(bookData).length > 0) {
            console.log("Updating book data...");
            const bookResult = await updateBook(bookData, id);
            console.log("Book result:", bookResult);
            bookChanged = bookResult.changes > 0;
          }

          // Update copies if changed
          if (newNumberOfCopies !== null) {
            console.log("Updating copies...");
            const copyResult = await updateBookCopies(id, newNumberOfCopies);
            console.log("Copy result:", copyResult);
            copiesChanged = copyResult.copiesChanged;
          }

          if (bookChanged || copiesChanged) {
            closeModal();
            openModal(
              "Success",
              `
              <p>Book updated successfully!</p>
              <button class="btn btn-primary mt-2" onclick="closeModal();">OK</button>
              `
            );

            // Reflect updates in frontend table
            if (bookData.title && cells[0])
              cells[0].textContent = bookData.title;
            if (bookData.author && cells[1])
              cells[1].textContent = bookData.author;
            if (newNumberOfCopies !== null && cells[6]) {
              cells[6].textContent = newNumberOfCopies;
            }
          } else {
            alert("No changes detected or record unchanged.");
          }
        } catch (err) {
          alert("Error updating book: " + err.message);
          console.error("Update error:", err);
        }
      });
      break;

    case "delete":
      closeModal();
      const deleteRow = document.querySelector(`tr[data-book-id="${id}"]`);
      if (!deleteRow) {
        alert("Book record not found on the page.");
        return;
      }

      const rowTitle = deleteRow
        .querySelector("td:first-child")
        .textContent.trim();

      openModal(
        "Archive Book",
        `
        <p>Archive book <strong>${rowTitle}</strong>? Copies that are not borrowed will be archived. Borrowed copies remain until returned.</p>
        <button id="confirmArchive" class="btn btn-danger mt-2">Yes, archive it</button>
        <button id="cancelArchive" class="btn btn-secondary mt-2" data-bs-dismiss="modal">Cancel</button>
      `
      );

      document.getElementById("confirmArchive").onclick = async () => {
        try {
          await archiveBook(id);
          deleteRow.remove();
          closeModal();
          showPopup(
            "Book Archived",
            `Book "${rowTitle}" has been archived. Borrowed copies will archive upon return.`
          );
        } catch (err) {
          closeModal();
          showPopup("Archive Failed", err.message);
        }
      };
      const cancelBtn = document.getElementById("cancelArchive");
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          closeModal();
        };
      }
      break;

    default:
      console.warn("Unknown popup action:", action);
  }
}

function openModal(title, bodyHtml) {
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">${title}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();

  modal.addEventListener("hidden.bs.modal", () => modal.remove());
}

function closeModal() {
  const openModal = document.querySelector(".modal.show");
  if (openModal) {
    const modalInstance = bootstrap.Modal.getInstance(openModal);
    modalInstance.hide();
  }
}

function showPopup(title, message) {
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-info text-white">
          <h5 class="modal-title">${title}</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
  modal.addEventListener("hidden.bs.modal", () => modal.remove());
}

function showDeleteConfirmationModal(title, message, onConfirm) {
  const confirmModal = document.createElement("div");
  confirmModal.className = "modal fade";
  confirmModal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-danger text-white">
          <h5 class="modal-title">${title}</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancelDeleteBtn">Cancel</button>
          <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModal);
  const bsModal = new bootstrap.Modal(confirmModal);

  confirmModal
    .querySelector("#confirmDeleteBtn")
    .addEventListener("click", () => {
      bsModal.hide();
      if (onConfirm) onConfirm();
    });

  confirmModal
    .querySelector("#cancelDeleteBtn")
    .addEventListener("click", () => {
      bsModal.hide();
    });

  bsModal.show();
  confirmModal.addEventListener("hidden.bs.modal", () => confirmModal.remove());
}
async function studentContextModalLoader() {
  const tbody = document.getElementById("studentsTableBody");
  const modalHTML = `
    <div class="modal fade" id="studentContextModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-info text-white">
            <h5 class="modal-title">Student Options for <span style="color: #00ff15" id="studentContextTitle"></span></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0">
          <ul class="list-group list-group-flush mb-0">
            <li class="list-group-item list-group-item-action" id="viewStudentDetails">View Details</li>
            <li class="list-group-item list-group-item-action" id="viewStudentBorrowed">View Borrowed Books</li>
            <li class="list-group-item list-group-item-action text-warning" id="archiveStudent">Archive Student</li>
          </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  const modalElement = document.getElementById("studentContextModal");
  const modalInstance = new bootstrap.Modal(modalElement);
  let selectedRow = null;

  tbody.addEventListener("contextmenu", (e) => {
    const row = e.target.closest("tr[data-student-id]");
    if (!row) return;
    e.preventDefault();
    selectedRow = row;
    const nameCell = selectedRow.querySelector("td:nth-child(2)");
    document.getElementById("studentContextTitle").textContent = nameCell ? nameCell.textContent.trim() : "";
    const statusCell = selectedRow.querySelector("td:nth-child(6)");
    const statusText = (statusCell ? statusCell.textContent : "").trim().toLowerCase();
    const archiveEl = modalElement.querySelector('#archiveStudent');
    if (archiveEl) {
      archiveEl.style.display = statusText === 'archived' ? 'none' : '';
    }
    modalInstance.show();
  });

  modalElement.querySelector("#viewStudentDetails").onclick = async () => {
    const id = selectedRow.dataset.studentId;
    await showStudentDetails(id);
    modalInstance.hide();
  };
  modalElement.querySelector("#viewStudentBorrowed").onclick = async () => {
    const id = selectedRow.dataset.studentId;
    await showStudentBorrowedBooks(id);
    modalInstance.hide();
  };

  modalElement.querySelector('#archiveStudent').onclick = async () => {
    const id = selectedRow.dataset.studentId;
    const nameCell = selectedRow.querySelector('td:nth-child(2)');
    const name = nameCell ? nameCell.textContent.trim() : id;
    modalInstance.hide();
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal fade';
    confirmModal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-warning">
            <h5 class="modal-title">
              <i class="bi bi-archive me-2" aria-hidden="true"></i>
              Archive Student
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to archive this student?</p>
            <div class="alert alert-info">
              <strong>Student:</strong> ${name} (${id})<br>
              <small>Completed borrow transactions will be archived and the student's status will be set to <em>Archived</em>.</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-warning" id="confirmArchiveStudentBtn">Archive Student</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(confirmModal);
    const bsConfirm = new bootstrap.Modal(confirmModal);
    bsConfirm.show();
    confirmModal.querySelector('#confirmArchiveStudentBtn').addEventListener('click', async () => {
      try {
        await waitForDBReady();
        try { await applyAdditionalSchema(); } catch (_) {}
        const res = await archiveStudent(id);
        bsConfirm.hide();
        if (res && res.success) {
          showModalAlert(`Student \"${name}\" archived successfully.`, 'success');
          if (typeof renderStudents === 'function') {
            await renderStudents(1);
          } else {
            const badge = selectedRow.querySelector('td:nth-child(6) .badge');
            if (badge) { badge.className = 'badge bg-secondary'; badge.textContent = 'Archived'; }
          }
        } else {
          showModalAlert(`Failed to archive student: ${res?.message || 'Unknown error'}`, 'danger');
        }
      } catch (e) {
        bsConfirm.hide();
        showModalAlert(`Failed to archive student: ${e.message}`, 'danger');
      }
    });
    confirmModal.addEventListener('hidden.bs.modal', () => confirmModal.remove());
  };
}

async function showStudentDetails(studentId) {
  try {
    const stuRes = await insertDB("select", "students", "*", { student_id: studentId });
    const student = stuRes?.data?.[0];
    if (!student) {
      showModalAlert("Student not found.", "danger");
      return;
    }
    let courseName = "";
    let departmentName = "";
    if (student.course_id) {
      const courseRes = await insertDB("select", "course", "*", { course_id: student.course_id });
      const course = courseRes?.data?.[0];
      courseName = course?.name || "";
      if (course?.department_id) {
        const deptRes = await insertDB("select", "department", "*", { department_id: course.department_id });
        const dept = deptRes?.data?.[0];
        departmentName = dept?.name || "";
      }
    }
    const body = `
      <div class="mb-2"><strong>ID:</strong> ${student.student_id || ""}</div>
      <div class="mb-2"><strong>Name:</strong> ${student.student_name || ""}</div>
      <div class="mb-2"><strong>Year:</strong> ${student.student_year || ""}</div>
      <div class="mb-2"><strong>Course:</strong> ${courseName || student.course_id || ""}</div>
      <div class="mb-2"><strong>Department:</strong> ${departmentName || ""}</div>
      <div class="mb-2"><strong>Status:</strong> ${student.status || ""}</div>
      <div class="mb-2"><strong>Contact:</strong> ${student.contact_number || ""}</div>
    `;
    openModal("Student Details", body);
  } catch (error) {
    showModalAlert("Failed to load student details: " + error.message, "danger");
  }
}

async function showStudentBorrowedBooks(studentId) {
  try {
    const txRes = await insertDB("select", "transaction_borrow", "copy_id, borrower_id, transaction_type, borrowed_at, due_at, returned_at", { borrower_id: studentId });
    const txs = txRes?.data || [];
    const copiesRes = await insertDB("select", "book_copy", "copy_id, book_id, status", null);
    const booksRes = await insertDB("select", "books", "book_id, title", null);
    const copyToBook = {};
    (copiesRes?.data || []).forEach(c => { copyToBook[c.copy_id] = { book_id: c.book_id, status: c.status }; });
    const bookTitles = {};
    (booksRes?.data || []).forEach(b => { bookTitles[b.book_id] = b.title; });
    const rowsHtml = txs.map(t => {
      const info = copyToBook[t.copy_id] || {};
      const title = bookTitles[info.book_id] || "Unknown";
      const status = t.transaction_type === 'Return' ? `Returned (${t.returned_at || ''})` : 'Borrowed';
      const fmt12 = (s) => s || '';
      return `
        <tr>
          <td>${t.copy_id}</td>
          <td>${info.book_id || ""}</td>
          <td>${title}</td>
          <td>${fmt12(t.borrowed_at) || ""}</td>
          <td>${fmt12(t.due_at) || ""}</td>
          <td>${status}</td>
        </tr>`;
    }).join("");
    const body = `
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>Copy ID</th>
              <th>Book ID</th>
              <th>Title</th>
              <th>Date Borrowed</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6">No borrow records</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
    openModal("Borrowed Books", body);
  } catch (error) {
    showModalAlert("Failed to load borrowed books: " + error.message, "danger");
  }
}
