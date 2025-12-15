let currentPage = 1;
const rowsPerPage = 25;

function formatDateTime(s) { return s || ''; }

async function changePage(page) {
  currentPage = page;
  await renderBooks(currentPage, rowsPerPage);
}

async function renderBooks(page = 1, rowsPerPage = 25) {
  const bookTBody = document.querySelector("#booksTableBody");
  if (!bookTBody) return console.error("Table body #booksTableBody not found");

  bookTBody.innerHTML = "";

  const books = await getAllBooks();
  const bookCopyNumber = await getBookCopyNumber();

  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = books.slice(start, end);

  if (pageRows.length > 0) {
    pageRows.forEach((book) => {
      const tr = document.createElement("tr");
      const bookId = parseInt(book.book_id, 10);
      const copies = bookCopyNumber[bookId] || 0;
      tr.dataset.bookId = book.book_id;
      tr.innerHTML = `
            <td>${book.title || "&nbsp;"}</td>
            <td>${book.author || "&nbsp;"}</td>
            <td>${book.publication_date || "&nbsp;"}</td>
            <td>${book.department_id || "&nbsp;"}</td>
            <td>${copies}</td>
        `;
      bookTBody.appendChild(tr);
    });
  } else {
    bookTBody.innerHTML = "No books on the record";
  }

  await renderPager(books.length, rowsPerPage, page, "pager-top");
  await renderPager(books.length, rowsPerPage, page, "pager-bottom");
}

async function renderPager(totalRows, rowsPerPage, currentPage, pagerID) {
  const pager = document.getElementById(pagerID);
  if (!pager) return console.error("Pager element #pager not found");

  pager.innerHTML = "";
  const totalPage = Math.ceil(totalRows / rowsPerPage);
  if (totalPage <= 1) return;

  const ul = document.createElement("ul");
  ul.className = "pagination";

  // Previous
  const previous = document.createElement("li");
  previous.className = "page-item" + (currentPage === 1 ? " disabled" : "");
  const prevBtn = document.createElement("button");
  prevBtn.className = "page-link btn me-2";
  prevBtn.innerText = "Previous";
  prevBtn.onclick = () => {
    if (currentPage > 1) changePage(currentPage - 1);
  };
  previous.appendChild(prevBtn);
  ul.appendChild(previous);

  // Page numbers
  for (let i = 1; i <= totalPage; i++) {
    const li = document.createElement("li");
    li.className = "page-item" + (i === currentPage ? " active" : "");
    const link = document.createElement("a");
    link.className = "page-link";
    link.href = "#";
    link.innerText = i;
    link.onclick = (e) => {
      e.preventDefault();
      changePage(i);
    };
    li.appendChild(link);
    ul.appendChild(li);
  }

  // Next
  const next = document.createElement("li");
  next.className = "page-item" + (currentPage === totalPage ? " disabled" : "");
  const nextBtn = document.createElement("button");
  nextBtn.className = "page-link btn ms-2";
  nextBtn.innerText = "Next";
  nextBtn.onclick = () => {
    if (currentPage < totalPage) changePage(currentPage + 1);
  };
  next.appendChild(nextBtn);
  ul.appendChild(next);

  pager.appendChild(ul);
}

async function renderStudents(page = 1, rowsPerPage = 25) {
  const studentTBody = document.querySelector("#studentsTableBody");
  if (!studentTBody) return console.error("Table body not found");

  studentTBody.innerHTML = ""; // Clear existing rows

  try {
    // Get all students and exclude archived
    const studentsResult = await getStudents();
    console.log("Students result:", studentsResult);
    let students = (studentsResult?.data || []).filter(stu => (stu.status || '').toLowerCase() !== 'archived');

    // Get all courses and create a map
    const coursesResult = await getCourses();
    const courses = coursesResult?.data || [];
    const courseMap = {};
    courses.forEach(course => {
      courseMap[course.course_id] = { 
        name: course.name, 
        department_id: course.department_id 
      };
    });

    // Get all departments and create a map
    const departmentsResult = await getDepartments();
    const departments = departmentsResult?.data || [];
    const departmentMap = {};
    departments.forEach(dept => {
      departmentMap[dept.department_id] = dept.name;
    });

    // Apply department filter if set
    const selectedDept = (typeof getCurrentDepartmentFilter === 'function') ? getCurrentDepartmentFilter() : null;
    if (selectedDept) {
      students = students.filter(stu => {
        const courseInfo = courseMap[stu.course_id];
        return courseInfo && courseInfo.department_id === selectedDept;
      });
    }

    const search = (typeof getCurrentSearchQuery === 'function') ? (getCurrentSearchQuery() || '') : '';
    let filtered = students;
    if (search) {
      const q = search.toLowerCase();
      filtered = students.filter(stu => {
        const courseInfo = courseMap[stu.course_id] || { name: '', department_id: '' };
        const departmentName = departmentMap[courseInfo.department_id] || '';
        const fields = [
          (stu.student_id || ''),
          (stu.student_name || ''),
          String(stu.student_year || ''),
          (courseInfo.name || ''),
          (departmentName || ''),
          (stu.status || '')
        ].map(s => s.toLowerCase());
        return fields.some(s => s.includes(q));
      });
    }
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageRows = filtered.slice(start, end);

    if (pageRows.length > 0) {
      pageRows.forEach(student => {
        const tr = document.createElement("tr");
        tr.dataset.studentId = student.student_id;
        const courseInfo = courseMap[student.course_id] || { name: 'Unknown', department_id: '?' };
        const departmentName = departmentMap[courseInfo.department_id] || 'Unknown';
        const st = (student.status || '').toLowerCase();
        const isArchived = st === 'archived';

        tr.innerHTML = `
          <td>${student.student_id}</td>
          <td>${student.student_name}</td>
          <td>${student.student_year}</td>
          <td>${courseInfo.name}</td>
          <td>${departmentName}</td>
          <td><span class="badge ${isArchived ? 'bg-secondary' : 'bg-success'}">${student.status || ''}</span></td>
        `;
        studentTBody.appendChild(tr);
      });
    } else {
      studentTBody.innerHTML = '<tr><td colspan="6">No students on record</td></tr>';
    }

    // Render pagination
    await renderPager(filtered.length, rowsPerPage, page, "pager-top");
    await renderPager(filtered.length, rowsPerPage, page, "pager-bottom");

  } catch (error) {
    console.error("Failed to render students:", error);
    studentTBody.innerHTML = '<tr><td colspan="6">Error loading students</td></tr>';
  }
}

// Actions moved to right-click context menu modal in popup.js

async function renderBookCopies(page = 1, rowsPerPage = 25) {
  const bookCopyTBody = document.querySelector("#bookCopiesTableBody");
  if (!bookCopyTBody)
    return console.error("Table body #bookCopiesTableBody not found");

  bookCopyTBody.innerHTML = "";

  try {
    // Get all book copies
    const copiesResult = await insertDB(
      "select",
      "book_copy",
      "copy_id, book_id, status, condition",
      null
    );

    const copies = copiesResult?.data || [];

    // Get all books to map book titles
    const booksResult = await insertDB(
      "select",
      "books",
      "book_id, title",
      null
    );

    const books = booksResult?.data || [];

    // Create a map of book_id to title
    const bookTitles = {};
    books.forEach((book) => {
      bookTitles[book.book_id] = book.title;
    });

    const txBorrowRes = await insertDB(
      "select",
      "transaction_borrow",
      "copy_id, borrower_id, transaction_type, borrowed_at, returned_at, due_at",
      null
    );
    const txs = txBorrowRes?.data || [];
    const latestByCopy = {};
    const parse12 = (s) => {
      if (!s) return 0;
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})\s(AM|PM)$/);
      if (!m) return 0;
      let [_, Y, M, D, H, I, S, A] = m;
      let h = parseInt(H, 10);
      if (A === 'AM' && h === 12) h = 0; else if (A === 'PM' && h !== 12) h += 12;
      const date = new Date(Date.UTC(parseInt(Y,10), parseInt(M,10)-1, parseInt(D,10), h-8, parseInt(I,10), parseInt(S,10)));
      return date.getTime();
    };
    txs.forEach((t) => {
      const key = t.copy_id;
      if (!key) return;
      const ts = t.transaction_type === 'Return' ? (t.returned_at || '') : (t.borrowed_at || t.due_at || '');
      const time = parse12(ts);
      const prev = latestByCopy[key];
      if (!prev || time > prev.time) {
        latestByCopy[key] = { type: t.transaction_type, borrower_id: t.borrower_id, time };
      }
    });
    const copyToStudent = {};
    Object.keys(latestByCopy).forEach((cid) => {
      const info = latestByCopy[cid];
      if (info.type === 'Borrow') copyToStudent[cid] = info.borrower_id;
    });

    // Get all students
    const studentsResult = await insertDB(
      "select",
      "students",
      "student_id, student_name",
      null
    );

    const students = studentsResult?.data || [];

    // Create a map of student_id to student_name
    const studentNames = {};
    students.forEach((student) => {
      studentNames[student.student_id] = student.student_name;
    });

    const search = (typeof getCurrentSearchQuery === 'function') ? (getCurrentSearchQuery() || '') : '';
    let filtered = copies;
    if (search) {
      const q = search.toLowerCase();
      filtered = copies.filter(copy => {
        const title = bookTitles[parseInt(copy.book_id, 10)] || '';
        const studentId = copyToStudent[copy.copy_id];
        const borrower = studentId ? (studentNames[studentId] || studentId) : '';
        const fields = [
          (copy.copy_id || ''),
          String(copy.book_id || ''),
          (title || ''),
          (copy.status || ''),
          (borrower || ''),
          (copy.condition || '')
        ].map(s => s.toLowerCase());
        return fields.some(s => s.includes(q));
      });
    }
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageRows = filtered.slice(start, end);

    if (pageRows.length > 0) {
      pageRows.forEach((copy) => {
        const tr = document.createElement("tr");
        const bookId = parseInt(copy.book_id, 10);
        const title = bookTitles[bookId] || "Unknown";

        const studentId = copyToStudent[copy.copy_id];
        const borrowedBy = studentId
          ? studentNames[studentId] || "Unknown Student"
          : "—";

        tr.dataset.copyId = copy.copy_id;
        tr.innerHTML = `
          <td>${copy.copy_id || "&nbsp;"}</td>
          <td>${copy.book_id || "&nbsp;"}</td>
          <td>${title}</td>
          <td>${copy.status || "&nbsp;"}</td>
          <td>${borrowedBy}</td>
          <td>${copy.condition || "&nbsp;"}</td>
        `;
        bookCopyTBody.appendChild(tr);
      });
    } else {
      bookCopyTBody.innerHTML =
        '<tr><td colspan="6">No book copies on record</td></tr>';
    }

    await renderPager(filtered.length, rowsPerPage, page, "pager-top");
    await renderPager(filtered.length, rowsPerPage, page, "pager-bottom");
  } catch (error) {
    console.error("Failed to render book copies:", error);
    bookCopyTBody.innerHTML =
      '<tr><td colspan="6">Error loading book copies</td></tr>';
  }
}

async function renderBorrowTransactions() {
  const tbody = document.querySelector('#borrowTransactionsTableBody');
  if (!tbody) return console.error('Table body #borrowTransactionsTableBody not found');
  tbody.innerHTML = '';
  try {
    const filterEl = document.getElementById('borrowTypeFilter');
    const selectedType = filterEl ? filterEl.value : '';
    const txRes = await insertDB('select', 'transaction_borrow', '*', null);
    let txs = txRes?.data || [];
    if (selectedType) {
      txs = txs.filter(t => (t.transaction_type || '') === selectedType);
    }
    const search = (typeof getCurrentSearchQuery === 'function') ? (getCurrentSearchQuery() || '') : '';
    const booksRes = await insertDB('select', 'books', 'book_id, title', null);
    const studentsRes = await insertDB('select', 'students', 'student_id, student_name', null);
    const bookTitles = {}; (booksRes?.data || []).forEach(b => { bookTitles[b.book_id] = b.title; });
    const studentNames = {}; (studentsRes?.data || []).forEach(s => { studentNames[s.student_id] = s.student_name; });
    if (search) {
      const q = search.toLowerCase();
      txs = txs.filter(t => {
        const fields = [
          (t.transaction_type || ''),
          (bookTitles[t.book_id] || ''),
          (t.isbn || ''),
          (studentNames[t.borrower_id] || ''),
          (t.borrower_id || ''),
          (t.staff_id || ''),
          (t.borrowed_at || ''),
          (t.due_at || ''),
          (t.returned_at || '')
        ].map(s => s.toLowerCase());
        return fields.some(s => s.includes(q));
      });
    }
    txs.sort((a, b) => {
      const ka = (a.transaction_type === 'Return' ? a.returned_at : a.borrowed_at) || a.due_at || '';
      const kb = (b.transaction_type === 'Return' ? b.returned_at : b.borrowed_at) || b.due_at || '';
      const ta = ka ? Date.parse(ka) : 0;
      const tb = kb ? Date.parse(kb) : 0;
      return tb - ta;
    });
    txs.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.transaction_type}</td>
        <td>${bookTitles[t.book_id] || ''}</td>
        <td>${(t.isbn || '')}</td>
        <td>${studentNames[t.borrower_id] || ''}</td>
        <td>${t.borrower_id}</td>
        <td>${formatDateTime(t.borrowed_at) || ''}</td>
        <td>${formatDateTime(t.due_at) || ''}</td>
        <td>${formatDateTime(t.returned_at) || ''}</td>
        <td>${t.staff_id || ''}</td>
      `;
      tbody.appendChild(tr);
    });
    if (txs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9">No borrow/return transactions</td></tr>';
    }
    if (filterEl && !filterEl.dataset.bound) {
      filterEl.addEventListener('change', () => renderBorrowTransactions());
      filterEl.dataset.bound = '1';
    }
  } catch (error) {
    console.error('Failed to render borrow transactions:', error);
    tbody.innerHTML = '<tr><td colspan="9">Error loading borrow transactions</td></tr>';
  }
}

async function renderLibraryTransactions() {
  const tbody = document.querySelector('#libraryTransactionsTableBody');
  if (!tbody) return console.error('Table body #libraryTransactionsTableBody not found');
  tbody.innerHTML = '';
  try {
    const txRes = await insertDB('select', 'transaction_library', '*', null);
    let txs = (txRes?.data || []).slice();
    const search = (typeof getCurrentSearchQuery === 'function') ? (getCurrentSearchQuery() || '') : '';
    if (search) {
      const q = search.toLowerCase();
      txs = txs.filter(t => {
        const fields = [
          (t.operation_type || ''),
          (t.before_values || ''),
          (t.after_values || ''),
          (t.staff_id || ''),
          (t.timestamp || '')
        ].map(s => s.toLowerCase());
        return fields.some(s => s.includes(q));
      });
    }
    txs = txs.sort((a, b) => {
      const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
      const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
      return tb - ta;
    });
    const booksRes = await insertDB('select', 'books', 'book_id, title, author', null);
    const bookInfo = {}; (booksRes?.data || []).forEach(b => { bookInfo[b.book_id] = { title: b.title, author: b.author }; });
    txs.forEach(t => {
      let details = '';
      const info = bookInfo[t.book_id] || { title: '', author: '' };
      try {
        const before = t.before_values ? JSON.parse(t.before_values) : null;
        const after = t.after_values ? JSON.parse(t.after_values) : null;
        if (t.operation_type === 'Add') {
          details = `Added: ${after?.title || info.title} by ${after?.author || info.author}`;
          if (after?.quantity) details += ` • Quantity: ${after.quantity}`;
          if (after?.isbn) details += ` • ISBN: ${after.isbn}`;
        } else if (t.operation_type === 'Edit') {
          details = `Edited: ${info.title} by ${info.author}`;
          const beforeStr = before ? JSON.stringify(before) : '';
          const afterStr = after ? JSON.stringify(after) : '';
          details += ` • Before: ${beforeStr} • After: ${afterStr}`;
        } else if (t.operation_type === 'Archive' || t.operation_type === 'Delete') {
          details = `${t.operation_type}: ${info.title} by ${info.author}`;
          if (after?.reason) details += ` • Reason: ${after.reason}`;
        } else if (t.operation_type === 'ArchiveStudent') {
          const sid = before?.student_id || '';
          const sname = before?.student_name || '';
          details = `ArchiveStudent: ${sname}${sname && sid ? ` (${sid})` : sid ? sid : ''}`;
        } else {
          details = `${t.operation_type}: ${info.title}`;
        }
      } catch (_) {
        details = `${t.operation_type}: ${info.title}`;
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.operation_type}</td>
        <td>${details}</td>
        <td>${t.staff_id || ''}</td>
        <td>${formatDateTime(t.timestamp) || ''}</td>
      `;
      tbody.appendChild(tr);
    });
    if (txs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No library operations</td></tr>';
    }
  } catch (error) {
    console.error('Failed to render library transactions:', error);
    tbody.innerHTML = '<tr><td colspan="4">Error loading library operations</td></tr>';
  }
}
