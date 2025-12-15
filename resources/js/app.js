let __appInitialized = false;

async function initializeApp() {
  if (__appInitialized) return;
  __appInitialized = true;
  try {
    await initPath();
    await initDB();

    const path = window.location.pathname;

    if (path.endsWith("index.html")) {
      await dashboardTotalBooks();
      await dashboardBorrowedBooks();
      await dashboardOverdueBooks();
      await dashboardTotalStudents();
      await dashboardNotifications();
      await dashboardRecentActivity();
      const archiveBookBtn = document.querySelector("#archiveBookBtn");
      if (archiveBookBtn) {
        archiveBookBtn.addEventListener("click", () => {
          window.location.href = "./archived-books.html";
        });
      }
      const openDbFolderBtn = document.querySelector("#openDbFolderBtn");
      if (openDbFolderBtn) {
        openDbFolderBtn.addEventListener("click", async () => {
          try {
            const dbPathStr = (window.DB_PATH || "").replace(/\\/g, "/");
            const dir = dbPathStr.substring(0, dbPathStr.lastIndexOf("/"));
            if (!dir) return;
            try {
              await Neutralino.os.open(dir);
            } catch (_) {
              const dirWin = dir.replace(/\//g, "\\");
              await Neutralino.os.execCommand(`explorer.exe "${dirWin}"`);
            }
          } catch (err) {
            console.error("Failed to open database folder:", err);
          }
        });
      }

    } else if (path.endsWith("bookshelf-books.html")) {
      await renderBooks();
      await bookContentLoader();
      await selectDepartments();
      await loadDepartments();

      const saveBookBtn = document.querySelector("#saveBookBtn");
      if (saveBookBtn) {
        saveBookBtn.addEventListener("click", async () => {
          await addBookToDB();
        });
      }

    } else if (path.endsWith("bookshelf-copies.html")) {
      await renderBookCopies();
      await bookCopyModalLoader();

    } else if (path.endsWith("transactions_borrow.html")) {
      await renderBorrowTransactions();

    } else if (path.endsWith("transaction_library.html")) {
      await renderLibraryTransactions();

    } else if (path.endsWith("students.html")) {
      await renderStudents();
      await selectDepartments();
      await loadCourses();
      await addStudentPopup();
      await studentContextModalLoader();
    }

    document.addEventListener('hidden.bs.modal', () => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.paddingRight = '';
    });

  } catch (err) {
    console.error("App initialization error:", err);
  }
}

Neutralino.events.on("ready", initializeApp);
initializeApp();
