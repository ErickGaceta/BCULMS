let currentDepartmentFilter = null;
let allArchivedStudents = [];
let filteredArchivedStudents = [];

async function loadArchivedStudents() {
  try {
    const tbody = document.getElementById('archivedStudentsTableBody');
    const noResults = document.getElementById('noResults');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          <i class="bi bi-person-x me-2" aria-hidden="true"></i>
          Loading archived students...
        </td>
      </tr>
    `;

    const studentsRes = await getStudents({ status: 'Archived' });
    const students = studentsRes?.data || [];
    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            <i class="bi bi-person-x me-2" aria-hidden="true"></i>
            No archived students found.
          </td>
        </tr>
      `;
      allArchivedStudents = [];
      filteredArchivedStudents = [];
      if (noResults) noResults.style.display = 'none';
      return;
    }

    const coursesRes = await getCourses();
    const courses = coursesRes?.data || [];
    const courseMap = {};
    courses.forEach(c => { courseMap[c.course_id] = { name: c.name, department_id: c.department_id }; });

    const departmentsRes = await getDepartments();
    const departments = departmentsRes?.data || [];
    const deptMap = {};
    departments.forEach(d => { deptMap[d.department_id] = d.name; });

    const rows = students.map(stu => {
      const courseInfo = courseMap[stu.course_id] || { name: 'Unknown', department_id: '' };
      const deptName = deptMap[courseInfo.department_id] || 'Unknown';
      return {
        student_id: stu.student_id,
        student_name: stu.student_name,
        student_year: stu.student_year,
        course_name: courseInfo.name,
        department_id: courseInfo.department_id,
        department_name: deptName,
        status: stu.status || 'Archived'
      };
    });

    allArchivedStudents = rows;
    filteredArchivedStudents = [...rows];
    renderArchivedStudentsTable(filteredArchivedStudents);
  } catch (error) {
    console.error('Error loading archived students:', error);
    const tbody = document.getElementById('archivedStudentsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger">
            <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
            Error loading archived students. Please try again.
          </td>
        </tr>
      `;
    }
  }
}

function renderArchivedStudentsTable(rows) {
  const tbody = document.getElementById('archivedStudentsTableBody');
  const noResults = document.getElementById('noResults');
  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    return;
  }
  if (noResults) noResults.style.display = 'none';

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.student_id}</td>
      <td>${r.student_name}</td>
      <td>${r.student_year}</td>
      <td>${r.course_name}</td>
      <td>${r.department_name}</td>
      <td><span class="badge bg-secondary">${r.status}</span></td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button type="button" class="btn btn-outline-primary" onclick="showRestoreStudentModal('${r.student_id}', '${r.student_name}')" title="Restore Student">
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function searchArchivedStudents() {
  const input = document.getElementById('searchArchivedStudents');
  const q = (input?.value || '').toLowerCase();
  let rows = [...allArchivedStudents];
  if (q) {
    rows = rows.filter(r => [
      r.student_id,
      r.student_name,
      String(r.student_year || ''),
      r.course_name,
      r.department_name,
      r.status
    ].map(s => (s || '').toLowerCase()).some(s => s.includes(q)));
  }
  if (currentDepartmentFilter) {
    rows = rows.filter(r => r.department_id === currentDepartmentFilter);
  }
  filteredArchivedStudents = rows;
  renderArchivedStudentsTable(filteredArchivedStudents);
}

async function filterArchivedStudentsByDepartment(departmentId, departmentName) {
  currentDepartmentFilter = departmentId;
  const label = document.getElementById('filterButtonText');
  if (label) label.textContent = departmentName || 'Filter';
  searchArchivedStudents();
}

async function loadDepartmentsForFilter() {
  try {
    const result = await handleSelect('department');
    const departments = result?.data || [];
    const menu = document.getElementById('departmentFilter');
    if (!menu) return;
    menu.innerHTML = '';

    const allLi = document.createElement('li');
    const allA = document.createElement('a');
    allA.className = 'dropdown-item';
    allA.href = '#';
    allA.textContent = 'All Departments';
    allA.addEventListener('click', (e) => { e.preventDefault(); filterArchivedStudentsByDepartment(null, 'Filter'); });
    allLi.appendChild(allA);
    menu.appendChild(allLi);

    const sep = document.createElement('li');
    sep.innerHTML = '<hr class="dropdown-divider">';
    menu.appendChild(sep);

    departments.forEach(dept => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'dropdown-item';
      a.href = '#';
      a.textContent = dept.name;
      a.addEventListener('click', (e) => { e.preventDefault(); filterArchivedStudentsByDepartment(dept.department_id, dept.name); });
      li.appendChild(a);
      menu.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading departments:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await waitForDBReady();
  await loadArchivedStudents();
  await loadDepartmentsForFilter();
  const searchInput = document.getElementById('searchArchivedStudents');
  if (searchInput) searchInput.addEventListener('input', searchArchivedStudents);
});

window.loadArchivedStudents = loadArchivedStudents;
window.searchArchivedStudents = searchArchivedStudents;
function showRestoreStudentModal(studentId, studentName) {
  const nameEl = document.getElementById('restoreStudentName');
  const idEl = document.getElementById('restoreStudentId');
  if (nameEl) nameEl.textContent = studentName;
  if (idEl) idEl.textContent = studentId;
  const modal = new bootstrap.Modal(document.getElementById('restoreStudentModal'));
  modal.show();
  const btn = document.getElementById('confirmRestoreStudentBtn');
  btn.onclick = async () => {
    try {
      const user = await requireRole(["Admin", "Librarian"]);
      const result = await libraryOperations.restoreArchivedStudent(studentId);
      if (result && result.success) {
        showModalAlert('Student restored successfully!', 'success');
        await loadArchivedStudents();
      } else {
        showModalAlert('Error restoring student', 'danger');
      }
    } catch (error) {
      showModalAlert('Error restoring student', 'danger');
    }
    modal.hide();
  };
}
