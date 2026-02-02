Baguio Central University Library Management System (BCULMS)

Desktop application for managing library books, copies, students, and transactions.
Built with PHPDesktop and Laravel, using an embedded SQLite database.

Features

Books management: add, edit, archive, and restore.

Book copies management with automatic copy ID generation.

Borrow/return tracking (transaction_borrow) and library change log (transaction_library).

Students management with department and course linkage.

Archived books view, including archived copies and historical transactions.

Tech Stack

PHPDesktop runtime with embedded Chromium for the UI.

Laravel 11+ for backend routing, database operations, and templating.

SQLite database (local file storage).

Blade templates, Vanilla JavaScript, Bootstrap for frontend UI.

Project Structure
app/                 Laravel backend logic (controllers, models, services)
    Http/
        Controllers/     BooksController.php, StudentsController.php, TransactionsController.php
    Models/             Book.php, BookCopy.php, TransactionBorrow.php, ArchivedBook.php, etc.
database/            Migrations and seeders for creating schema and seeding initial data
resources/
    views/            Blade templates (dashboard.blade.php, books.blade.php, archived-books.blade.php)
    js/               Frontend scripts (frontend-operations.js, library-operations.js, popup.js)
public/              Static assets (CSS, JS, images, favicon.ico)
storage/             SQLite database (library.db), logs, and backups


app/Http/Controllers/: Handles domain logic (books, copies, transactions).

app/Models/: Laravel Eloquent models mapping to database tables.

database/migrations/: Schema creation and migration scripts.

resources/views/: Blade templates for UI pages.

resources/js/: JavaScript helpers and page-specific logic.

public/: Assets served to the embedded browser.

storage/: Database files and backups.

Database

Location: storage/library.db (created automatically on first run).

Integrity: Checked on app startup; if corrupt, a timestamped backup is saved and DB rebuilt.

Seeding: Departments and courses are created automatically if missing.

Schema highlights:

books holds active metadata and status.

book_copy holds physical copies.

transaction_borrow records borrow/return per copy.

transaction_library records library operations (Add, Edit, Archive, Restore, Delete).

archived_books holds archived book records, including author and publication date.

archived_book_copy holds archived copies.

archived_transaction_borrow keeps historical borrow transactions after archiving.

Archiving Flow

Triggered via LibraryOperations::archiveBook($bookId) (PHP service class).

Updates books.status to Archived.

Inserts into archived_books including book_title, author, publication_date, and archive_date.

Migrates non-borrowed copies from book_copy to archived_book_copy.

Moves completed borrow transactions into archived_transaction_borrow and cleans up.

Logs an Archive operation in transaction_library.

Restoring uses LibraryOperations::restoreArchivedBook($bookId) which reverses the above steps and logs Restore.

Running

Packaged app: Launch the executable under dist/BCULMS/.

Development (optional):

Install PHPDesktop for Windows.

Place Laravel project inside www/ folder of PHPDesktop.

Ensure storage/library.db is writable.

Run php artisan serve --host=127.0.0.1 --port=8000 if needed.

Troubleshooting

DB not ready on page load: Ensure queries occur only after Laravel services initialize.

SQLite errors or corruption: On startup, PRAGMA integrity_check is performed; auto-recover if needed via backup and rebuild.

Contributing

Follow existing code style and patterns in app/ and resources/js/.

Use Eloquent models and DB wrapper methods for operations.

Avoid committing secrets; all data is stored locally in SQLite.

Credits

PHPDesktop: https://github.com/cztomczak/phpdesktop

Laravel Framework: https://laravel.com

If thou wishest, I can also rewrite the folder structure diagram as it would exist in PHPDesktop + Laravel specifically, showing where the HTML, JS, CSS, and SQLite files go for the desktop package.

Dost thou wish me to do that?

can you style it?

Aye, I shall craft it in clean, styled Markdown fit for documentation or README display, with headings, code blocks, lists, and subtle emphasis for clarity. Here is the polished version:

Baguio Central University Library Management System (BCULMS)

Desktop application for managing library books, copies, students, and transactions.
Built with PHPDesktop and Laravel, using an embedded SQLite database.

Features

Books management: Add, edit, archive, and restore.

Book copies management: Automatic copy ID generation.

Borrow/return tracking (transaction_borrow) and library change log (transaction_library).

Students management: Department and course linkage.

Archived books view: Archived copies and historical transactions.

Tech Stack

Runtime: PHPDesktop with embedded Chromium.

Backend: Laravel 11+.

Database: SQLite (local file storage).

Frontend: Blade templates, Vanilla JavaScript, Bootstrap.

Project Structure
BCULMS/
├─ app/
│  ├─ Http/Controllers/    # Controllers (BooksController, StudentsController, TransactionsController)
│  └─ Models/              # Eloquent models (Book, BookCopy, TransactionBorrow, ArchivedBook, etc.)
├─ database/
│  ├─ migrations/          # Schema creation and migration scripts
│  └─ seeders/             # Initial seeding of departments/courses
├─ resources/
│  ├─ views/               # Blade templates (dashboard.blade.php, books.blade.php, archived-books.blade.php)
│  └─ js/                  # Frontend scripts (frontend-operations.js, library-operations.js, popup.js)
├─ public/                 # Static assets (CSS, JS, images, favicon.ico)
├─ storage/                # SQLite database (library.db), logs, backups
└─ dist/                   # Packaged PHPDesktop app

Database

Location: storage/library.db (auto-created on first run).

Integrity: Checked at startup; corrupt DB triggers backup and rebuild.

Seeding: Departments and courses are automatically seeded if missing.

Schema Highlights:

Table	Purpose
books	Active book metadata and status
book_copy	Physical copies of books
transaction_borrow	Borrow/return transactions
transaction_library	Log of library operations (Add/Edit/Archive/Restore/Delete)
archived_books	Archived book records (title, author, publication_date, archive_date)
archived_book_copy	Archived copies
archived_transaction_borrow	Historical borrow transactions
Archiving & Restoring Flow

Archiving:

LibraryOperations::archiveBook($bookId) updates books.status to Archived.

Inserts data into archived_books.

Migrates non-borrowed copies from book_copy → archived_book_copy.

Moves completed borrow transactions → archived_transaction_borrow.

Logs operation in transaction_library.

Restoring:

LibraryOperations::restoreArchivedBook($bookId) reverses the above and logs Restore.

Running the Application

Packaged App:

Launch the executable under dist/BCULMS/.

Development Mode:

Install PHPDesktop.

Place Laravel project in PHPDesktop www/ folder.

Ensure storage/library.db is writable.

Run Laravel locally if needed:

php artisan serve --host=127.0.0.1 --port=8000

Troubleshooting

DB not ready on page load: Ensure queries occur only after Laravel initializes services.

SQLite errors or corruption: Integrity is checked at startup. Backup is saved and DB rebuilt automatically.

Contributing

Follow the existing code style in app/ and resources/js/.

Use Eloquent models and database wrapper methods.

Avoid committing secrets; DB is local.

Credits

PHPDesktop: https://github.com/cztomczak/phpdesktop

Laravel Framework: https://laravel.com