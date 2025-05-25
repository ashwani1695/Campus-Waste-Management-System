const BACKEND_URL = 'http://localhost:5300';

// --- General Admin Auth & UI ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    if (!token || !userString) {
        alert('Please log in as admin.');
        window.location.href = '/homepage/login.html';
        return;
    }

    try {
        const user = JSON.parse(userString);
        if (user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = '/homepage/login.html';
            return;
        }
        const adminNameSpan = document.getElementById('adminName');
        if (adminNameSpan) adminNameSpan.textContent = `Welcome, ${user.name}`;
        
        const welcomeMsg = document.getElementById('welcomeMessage');
        if (welcomeMsg && window.location.pathname.endsWith('adminpage.html')) {
            welcomeMsg.textContent = `${user.name}'s Admin Actions`;
        }


    } catch (e) {
        alert('Session error. Please log in again.');
        localStorage.clear();
        window.location.href = '/homepage/login.html';
        return;
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            alert('Logged out successfully.');
            window.location.href = '/homepage/homepage.html';
        });
    }
    
    // Page specific initializations
    if (window.location.pathname.endsWith('create_cleaner.html')) {
        initializeCreateCleanerForm();
    } else if (window.location.pathname.endsWith('view_cleaners.html')) {
        loadCleanersForView();
    } else if (window.location.pathname.endsWith('view_all_reports.html')) {
        loadAllUserReports();
        document.getElementById('statusFilter')?.addEventListener('change', loadAllUserReports);
    } else if (window.location.pathname.endsWith('assign_task.html')) {
        loadPendingReportsForAssignment();
        initializeTaskAssignmentForm();
    } else if (window.location.pathname.endsWith('view_cleaner_attendance.html')) {
        loadCleanersForAttendanceFilter();
        loadCleanerAttendance(); // Load all initially
    } else if (window.location.pathname.endsWith('view_cleaner_issues_admin.html')) {
        loadCleanerIssuesForAdmin();
    } else if (window.location.pathname.endsWith('report_generate.html')) {
        initializeDownloadButton();
    }
});

async function apiFetch(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    const headers = {
        'Authorization': `Bearer ${token}`
    };
    if (body && !(body instanceof FormData)) { // FormData sets its own Content-Type
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        method: method,
        headers: headers
    };

    if (body) {
        config.body = (body instanceof FormData) ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, config);
        if (response.status === 401) { // Unauthorized
            alert('Session expired or unauthorized. Please log in again.');
            localStorage.clear();
            window.location.href = '/homepage/login.html';
            return null; // Or throw an error
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
            console.error(`API Error on ${method} ${endpoint}:`, response.status, errorData);
            alert(`Error: ${errorData.message || response.statusText}`);
            return null;
        }
        if (response.headers.get("content-type")?.includes("application/pdf")) {
            return response.blob(); // Handle PDF downloads
        }
        return response.json();
    } catch (err) {
        console.error('Network or parsing error:', err);
        alert('Network error or could not connect to the backend.');
        return null;
    }
}


// --- Create Cleaner Page ---
function initializeCreateCleanerForm() {
    const form = document.getElementById('registerForm'); // Ensure ID matches in create_cleaner.html
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const result = await apiFetch('/admin/cleaners', 'POST', { name, email, password });
            if (result) {
                alert('Cleaner account created successfully!');
                form.reset();
            }
        });
    }
}

// --- View Cleaners Page (view_cleaners.html) ---
async function loadCleanersForView() {
    const cleanersList = document.getElementById('cleanersList');
    if (!cleanersList) return;
    cleanersList.innerHTML = '<tr><td colspan="4">Loading cleaners...</td></tr>';

    const data = await apiFetch('/admin/cleaners');
    if (data && Array.isArray(data)) {
        if (data.length === 0) {
            cleanersList.innerHTML = '<tr><td colspan="4">No cleaners found.</td></tr>';
            return;
        }
        cleanersList.innerHTML = ''; // Clear loading
        data.forEach(cleaner => {
            const row = cleanersList.insertRow();
            row.innerHTML = `
                <td>${cleaner.name}</td>
                <td>${cleaner.email}</td>
                <td>${new Date(cleaner.createdAt).toLocaleDateString()}</td>
                <td>
                    <button onclick="viewCleanerTasks('${cleaner._id}', '${cleaner.name}')">View Tasks</button>
                </td>
            `;
        });
    } else {
         cleanersList.innerHTML = '<tr><td colspan="4">Failed to load cleaners.</td></tr>';
    }
}

async function viewCleanerTasks(cleanerId, cleanerName) {
    const tasksContainer = document.getElementById('cleanerTasksContainer');
    const tasksListDiv = document.getElementById('tasksForCleanerList');
    const cleanerNameSpan = document.getElementById('selectedCleanerName');

    if (!tasksContainer || !tasksListDiv || !cleanerNameSpan) return;

    cleanerNameSpan.textContent = cleanerName;
    tasksListDiv.innerHTML = '<p>Loading tasks...</p>';
    tasksContainer.style.display = 'block';

    const tasks = await apiFetch(`/admin/cleaners/${cleanerId}/tasks`);
    if (tasks && Array.isArray(tasks)) {
        if (tasks.length === 0) {
            tasksListDiv.innerHTML = '<p>No tasks assigned to this cleaner currently.</p>';
            return;
        }
        tasksListDiv.innerHTML = tasks.map(task => `
            <div class="task-item">
                <strong>${task.title}</strong> (Status: ${task.status})<br>
                Location: ${task.location}<br>
                Reported by: ${task.reportedBy?.name || 'N/A'} on ${new Date(task.createdAt).toLocaleDateString()}
            </div>
        `).join('');
    } else {
        tasksListDiv.innerHTML = '<p>Failed to load tasks for this cleaner.</p>';
    }
}

function closeTasksView() {
    const tasksContainer = document.getElementById('cleanerTasksContainer');
    if (tasksContainer) tasksContainer.style.display = 'none';
}

// --- View All User Reports Page (view_all_reports.html) ---
let allReportsData = []; // Cache for filtering

async function loadAllUserReports() {
    const reportsContainer = document.getElementById('reportsContainer');
    const statusFilter = document.getElementById('statusFilter').value;
    if (!reportsContainer) return;
    reportsContainer.innerHTML = '<p>Loading reports...</p>';

    const data = await apiFetch('/admin/reports'); // Fetch all once
    if (data && Array.isArray(data)) {
        allReportsData = data; // Cache the full list
        renderReports(allReportsData, statusFilter);
    } else {
        reportsContainer.innerHTML = '<p>Failed to load reports.</p>';
    }
}

function renderReports(reports, statusFilter) {
    const reportsContainer = document.getElementById('reportsContainer');
    reportsContainer.innerHTML = '';

    const filteredReports = statusFilter ? reports.filter(r => r.status === statusFilter) : reports;

    if (filteredReports.length === 0) {
        reportsContainer.innerHTML = `<p>No reports found${statusFilter ? ` with status: ${statusFilter}` : ''}.</p>`;
        return;
    }

    filteredReports.forEach(report => {
        const card = document.createElement('div');
        card.className = 'report-card';
        card.innerHTML = `
            <h3>${report.title}</h3>
            <p class="meta">Report ID: ${report._id}</p>
            <p><strong>Location:</strong> ${report.location}</p>
            <p><strong>Description:</strong> ${report.description}</p>
            ${report.imageUrl ? `<img src="${BACKEND_URL}${report.imageUrl}" alt="Report Image" onclick="openImageModal('${BACKEND_URL}${report.imageUrl}')">` : ''}
            <p class="meta"><strong>Reported by:</strong> ${report.reportedBy?.name || 'N/A'} (${report.reportedBy?.email || 'N/A'}) on ${new Date(report.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span id="status-${report._id}">${report.status}</span></p>
            ${report.assignedTo ? `<p class="meta"><strong>Assigned to:</strong> ${report.assignedTo.name} by ${report.assignedBy?.name || 'Admin'} on ${new Date(report.assignedAt).toLocaleDateString()}</p>` : '<p class="meta">Not assigned</p>'}
            ${report.status === 'completed' && report.completedAt ? `<p class="meta"><strong>Completed on:</strong> ${new Date(report.completedAt).toLocaleDateString()}</p>` : ''}
            <div class="actions">
                ${(report.status === 'completed' || report.status === 'rejected') ? `<button class="delete-btn" onclick="deleteUserReport('${report._id}')">Delete</button>` : ''}
                <select class="status-select" id="status-select-${report._id}" onchange="updateUserReportStatus('${report._id}', this.value)">
                    <option value="pending" ${report.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="assigned" ${report.status === 'assigned' ? 'selected' : ''} disabled>Assigned (via Assign Task page)</option>
                    <option value="in-progress" ${report.status === 'in-progress' ? 'selected' : ''}>In-Progress</option>
                    <option value="completed" ${report.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="rejected" ${report.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
                 ${(report.status === 'pending' || report.status === 'rejected') ? `<button class="assign-btn" onclick="goToAssignPage('${report._id}')">Assign Task</button>` : ''}
            </div>
        `;
        reportsContainer.appendChild(card);
        // Ensure the dropdown reflects the current status and disables itself for 'assigned' if we want to enforce assignment via assign_task.html
         const currentStatusSelect = document.getElementById(`status-select-${report._id}`);
         if(currentStatusSelect) currentStatusSelect.value = report.status;

    });
}
function goToAssignPage(reportId){
    window.location.href = `assign_task.html?reportId=${reportId}`;
}

function openImageModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    if(modal && modalImg) {
        modalImg.src = imageUrl;
        modal.style.display = "block";
    }
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if(modal) {
        modal.style.display = "none";
    }
}

async function deleteUserReport(reportId) {
    if (confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
        const result = await apiFetch(`/admin/reports/${reportId}`, 'DELETE');
        if (result) {
            alert('Report deleted successfully.');
            loadAllUserReports(); // Refresh the list
        }
    }
}

async function updateUserReportStatus(reportId, newStatus) {
    if (!newStatus) {
        alert("No status selected.");
        // Revert select to current status if possible (might need to fetch current status again or store it)
        loadAllUserReports(); // Simplest way to refresh
        return;
    }
     if (newStatus === "assigned") {
        alert("Please use the 'Assign Task' page or button to assign tasks.");
        loadAllUserReports(); // Re-render to reset the select
        return;
    }

    const result = await apiFetch(`/admin/reports/${reportId}/status`, 'PUT', { status: newStatus });
    if (result) {
        alert(`Report status updated to ${newStatus}.`);
        // Update status directly in the UI for responsiveness or reload all
        const statusSpan = document.getElementById(`status-${reportId}`);
        if (statusSpan) statusSpan.textContent = newStatus;
        loadAllUserReports(); // Refresh to ensure consistency and correct action buttons
    } else {
        // If update failed, refresh to show original state
        loadAllUserReports();
    }
}


// --- Assign Task Page (assign_task.html) ---
let availableCleaners = [];

async function loadPendingReportsForAssignment() {
    const pendingReportsList = document.getElementById('pendingReportsList');
    const noPendingMsg = document.getElementById('noPendingReportsMsg');
    if (!pendingReportsList || !noPendingMsg) return;

    pendingReportsList.innerHTML = '<tr><td colspan="5">Loading pending reports...</td></tr>';
    
    const allReports = await apiFetch('/admin/reports'); // Fetch all reports
    if (allReports && Array.isArray(allReports)) {
        const pendingReports = allReports.filter(r => r.status === 'pending' || r.status === 'rejected'); // Also allow re-assigning rejected

        if (pendingReports.length === 0) {
            pendingReportsList.innerHTML = '';
            noPendingMsg.style.display = 'block';
            return;
        }
        noPendingMsg.style.display = 'none';
        pendingReportsList.innerHTML = '';
        pendingReports.forEach(report => {
            const row = pendingReportsList.insertRow();
            row.innerHTML = `
                <td>${report.title}</td>
                <td>${report.location}</td>
                <td>${report.reportedBy?.name || 'N/A'}</td>
                <td>${new Date(report.createdAt).toLocaleDateString()}</td>
                <td><button onclick="showAssignForm('${report._id}', '${report.title.replace(/'/g, "\\'")}')">Assign</button></td>
            `;
        });
    } else {
        pendingReportsList.innerHTML = '<tr><td colspan="5">Failed to load pending reports.</td></tr>';
        noPendingMsg.style.display = 'none';
    }
     // Check for reportId in URL for direct assignment
    const urlParams = new URLSearchParams(window.location.search);
    const reportIdFromUrl = urlParams.get('reportId');
    const reportToAssign = allReports.find(r => r._id === reportIdFromUrl);
    if (reportIdFromUrl && reportToAssign) {
        showAssignForm(reportIdFromUrl, reportToAssign.title);
    }
}

async function loadCleanersForAssignmentDropdown() {
    const cleanerSelect = document.getElementById('cleanerSelect');
    if (!cleanerSelect) return;
    
    cleanerSelect.innerHTML = '<option value="">Loading cleaners...</option>';
    const cleaners = await apiFetch('/admin/cleaners');
    if (cleaners && Array.isArray(cleaners)) {
        availableCleaners = cleaners; // Store for later use if needed
        if (cleaners.length === 0) {
            cleanerSelect.innerHTML = '<option value="">No cleaners available</option>';
            return;
        }
        cleanerSelect.innerHTML = '<option value="">-- Select a Cleaner --</option>';
        cleaners.forEach(cleaner => {
            const option = new Option(`${cleaner.name} (${cleaner.email})`, cleaner._id);
            cleanerSelect.add(option);
        });
    } else {
        cleanerSelect.innerHTML = '<option value="">Failed to load cleaners</option>';
    }
}

function showAssignForm(reportId, reportTitle) {
    document.getElementById('reportIdToAssign').value = reportId;
    document.getElementById('reportToAssignTitle').textContent = reportTitle;
    document.getElementById('assignFormContainer').classList.remove('hidden');
    loadCleanersForAssignmentDropdown(); // Populate/refresh cleaner list
}

function cancelAssignment() {
    document.getElementById('assignFormContainer').classList.add('hidden');
    document.getElementById('taskAssignmentForm').reset();
     // Clear reportId from URL if present
    const url = new URL(window.location);
    url.searchParams.delete('reportId');
    window.history.pushState({}, '', url);
}

function initializeTaskAssignmentForm() {
    const form = document.getElementById('taskAssignmentForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reportId = document.getElementById('reportIdToAssign').value;
            const cleanerId = document.getElementById('cleanerSelect').value;

            if (!cleanerId) {
                alert('Please select a cleaner.');
                return;
            }
            const result = await apiFetch(`/admin/reports/${reportId}/assign`, 'PUT', { cleanerId });
            if (result) {
                alert('Task assigned successfully!');
                cancelAssignment(); // Hide form and reset
                loadPendingReportsForAssignment(); // Refresh pending reports list
            }
        });
    }
}


// --- View Cleaner Attendance Page (view_cleaner_attendance.html) ---
let allAttendanceData = []; // Cache for filtering

async function loadCleanersForAttendanceFilter() {
    const cleanerFilterSelect = document.getElementById('cleanerFilter');
    if (!cleanerFilterSelect) return;

    const cleaners = await apiFetch('/admin/cleaners');
    if (cleaners && Array.isArray(cleaners)) {
        cleaners.forEach(cleaner => {
            const option = new Option(cleaner.name, cleaner._id);
            cleanerFilterSelect.add(option);
        });
    }
}

async function loadCleanerAttendance() {
    const attendanceList = document.getElementById('attendanceList');
    const noAttendanceMsg = document.getElementById('noAttendanceMsg');
    if (!attendanceList || !noAttendanceMsg) return;

    attendanceList.innerHTML = '<tr><td colspan="6">Loading attendance records...</td></tr>';

    const data = await apiFetch('/admin/attendance');
    if (data && Array.isArray(data)) {
        allAttendanceData = data;
        applyAttendanceFilters(); // Render with current filter (initially all)
    } else {
        attendanceList.innerHTML = '<tr><td colspan="6">Failed to load attendance records.</td></tr>';
        noAttendanceMsg.style.display = 'none';
    }
}

function applyAttendanceFilters() {
    const attendanceList = document.getElementById('attendanceList');
    const noAttendanceMsg = document.getElementById('noAttendanceMsg');
    const cleanerFilter = document.getElementById('cleanerFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;

    let filteredData = allAttendanceData;

    if (cleanerFilter) {
        filteredData = filteredData.filter(record => record.cleaner?._id === cleanerFilter);
    }
    if (dateFilter) { // Dates are tricky with timezones. Assuming YYYY-MM-DD matches.
        filteredData = filteredData.filter(record => record.date && new Date(record.date).toISOString().slice(0,10) === dateFilter);
    }
    
    if (filteredData.length === 0) {
        attendanceList.innerHTML = '';
        noAttendanceMsg.style.display = 'block';
        return;
    }
    noAttendanceMsg.style.display = 'none';
    attendanceList.innerHTML = ''; // Clear previous records or loading message
    filteredData.forEach(record => {
        const row = attendanceList.insertRow();
        row.innerHTML = `
            <td>${record.cleaner?.name || 'N/A'}</td>
            <td>${record.cleaner?.email || 'N/A'}</td>
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td>${record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'Not recorded'}</td>
            <td>${record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'Not recorded'}</td>
            <td>${record.remarks || ''}</td>
        `;
    });
}
function resetAttendanceFilters() {
    document.getElementById('cleanerFilter').value = '';
    document.getElementById('dateFilter').value = '';
    applyAttendanceFilters();
}


// --- View Cleaner Issues Page (view_cleaner_issues_admin.html) ---
async function loadCleanerIssuesForAdmin() {
    const issuesContainer = document.getElementById('cleanerIssuesContainer');
    const noIssuesMsg = document.getElementById('noCleanerIssuesMsg');
    if (!issuesContainer || !noIssuesMsg) return;

    issuesContainer.innerHTML = '<p>Loading cleaner issues...</p>';
    
    const issues = await apiFetch('/admin/cleaner-issues');
    if (issues && Array.isArray(issues)) {
        if (issues.length === 0) {
            issuesContainer.innerHTML = '';
            noIssuesMsg.style.display = 'block';
            return;
        }
        noIssuesMsg.style.display = 'none';
        issuesContainer.innerHTML = ''; // Clear loading message
        issues.forEach(issue => {
            const card = document.createElement('div');
            card.className = 'issue-card';
            card.innerHTML = `
                <h3>${issue.subject} (Status: ${issue.status})</h3>
                <p class="meta">Reported by: ${issue.cleaner?.name || 'N/A'} (${issue.cleaner?.email || 'N/A'})</p>
                <p class="meta">Reported on: ${new Date(issue.createdAt).toLocaleString()}</p>
                <p><strong>Message:</strong> ${issue.message}</p>
                <div class="actions">
                    ${issue.status === 'pending' ? `<button onclick="resolveCleanerIssue('${issue._id}')">Mark as Resolved</button>` : '<button class="resolved" disabled>Resolved</button>'}
                </div>
            `;
            issuesContainer.appendChild(card);
        });
    } else {
        issuesContainer.innerHTML = '<p>Failed to load cleaner issues.</p>';
        noIssuesMsg.style.display = 'none';
    }
}

async function resolveCleanerIssue(issueId) {
    if (confirm('Are you sure you want to mark this issue as resolved?')) {
        const result = await apiFetch(`/admin/cleaner-issues/${issueId}/resolve`, 'PUT');
        if (result) {
            alert('Cleaner issue marked as resolved.');
            loadCleanerIssuesForAdmin(); // Refresh list
        }
    }
}

// --- Download Reports Page (report_generate.html) ---
function initializeDownloadButton() {
    const downloadBtn = document.getElementById('downloadPdfButton');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            downloadBtn.textContent = 'Generating...';
            downloadBtn.disabled = true;
            
            const blob = await apiFetch('/admin/reports/download-pdf'); // Expecting blob
            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `campus_waste_reports_${Date.now()}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                alert('PDF download initiated.');
            } else {
                alert('Failed to download PDF.');
            }
            downloadBtn.textContent = 'Download All User Reports (PDF)';
            downloadBtn.disabled = false;
        });
    }
}