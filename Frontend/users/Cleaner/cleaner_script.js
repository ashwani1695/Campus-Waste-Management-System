const BACKEND_URL = 'http://localhost:5300';
const IMAGE_BASE_URL = 'http://localhost:5300'; // Assuming images served from backend root/uploads

// --- General Cleaner Auth & UI ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    if (!token || !userString) {
        alert('Please log in as a cleaner.');
        window.location.href = '/homepage/login.html'; // Redirect to main login
        return;
    }

    try {
        const user = JSON.parse(userString);
        if (user.role !== 'cleaner') {
            alert('Access denied. Cleaner privileges required.');
            window.location.href = '/homepage/login.html';
            return;
        }
        const cleanerNameDisplay = document.getElementById('cleanerNameDisplay');
        if (cleanerNameDisplay) {
            cleanerNameDisplay.textContent = `Welcome, ${user.name}!`;
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

    // Page-specific initializations
    if (window.location.pathname.endsWith('cleaner_tasks.html')) {
        loadAssignedTasks();
    } else if (window.location.pathname.endsWith('cleaner_attendance.html')) {
        initializeAttendanceButtons();
        loadTodayAttendanceStatus();
        loadAttendanceHistory();
    } else if (window.location.pathname.endsWith('cleaner_report_issue.html')) {
        initializeCleanerIssueForm();
    } else if (window.location.pathname.endsWith('cleaner_my_issues.html')) {
        loadMySubmittedIssues();
    }
});

async function cleanerApiFetch(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    const headers = {
        'Authorization': `Bearer ${token}`
    };
    if (body && !(body instanceof FormData)) {
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
        if (response.status === 401) {
            alert('Session expired or unauthorized. Please log in again.');
            localStorage.clear();
            window.location.href = '/homepage/login.html';
            return null;
        }
        const data = await response.json();
        if (!response.ok) {
            console.error(`API Error on ${method} ${endpoint}:`, response.status, data);
            alert(`Error: ${data.message || response.statusText}`);
            return null;
        }
        return data;
    } catch (err) {
        console.error('Network or parsing error:', err);
        alert('Network error or could not connect to the backend.');
        return null;
    }
}

// --- Cleaner Tasks Page (cleaner_tasks.html) ---
async function loadAssignedTasks() {
    const tasksContainer = document.getElementById('tasksListContainer');
    const noTasksMsg = document.getElementById('noTasksMessage');
    const activeTaskCountSpan = document.getElementById('activeTaskCount');

    if (!tasksContainer || !noTasksMsg || !activeTaskCountSpan) return;

    tasksContainer.innerHTML = '<p>Loading your tasks...</p>';
    noTasksMsg.style.display = 'none';

    const data = await cleanerApiFetch('/cleaner/tasks');
    if (data && Array.isArray(data.reports ? data.reports : data)) { // Handle if API wraps in "reports"
        const tasks = data.reports ? data.reports : data;
        activeTaskCountSpan.textContent = tasks.length;
        if (tasks.length === 0) {
            tasksContainer.innerHTML = '';
            noTasksMsg.style.display = 'block';
            return;
        }

        tasksContainer.innerHTML = ''; // Clear loading
        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            let imageUrl = task.imageUrl ? `${IMAGE_BASE_URL}${task.imageUrl}` : null;

            card.innerHTML = `
                <h3>${task.title} (Status: <span id="status-${task._id}">${task.status}</span>)</h3>
                <p><strong>Location:</strong> ${task.location}</p>
                <p><strong>Description:</strong> ${task.description}</p>
                ${imageUrl ? `<img src="${imageUrl}" alt="Task Image">` : ''}
                <p><small>Reported by: ${task.reportedBy?.name || 'N/A'} on ${new Date(task.createdAt).toLocaleDateString()}</small></p>
                <p><small>Assigned on: ${new Date(task.assignedAt).toLocaleString()}</small></p>
                <div class="task-actions">
                    <label for="status-select-${task._id}">Update Status: </label>
                    <select id="status-select-${task._id}" ${task.status === 'completed' ? 'disabled' : ''}>
                        <option value="assigned" ${task.status === 'assigned' ? 'selected' : ''} disabled>Assigned</option>
                        <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In-Progress</option>
                        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button onclick="updateTaskStatus('${task._id}')" ${task.status === 'completed' ? 'disabled' : ''}>Update</button>
                </div>
            `;
            tasksContainer.appendChild(card);
            // Set the select dropdown to current status correctly
             const statusSelect = document.getElementById(`status-select-${task._id}`);
             if(statusSelect) statusSelect.value = task.status;
        });
    } else {
        tasksContainer.innerHTML = '<p>Failed to load tasks. Please try again.</p>';
        noTasksMsg.style.display = 'none';
        activeTaskCountSpan.textContent = '0';
    }
}

async function updateTaskStatus(taskId) {
    const selectElement = document.getElementById(`status-select-${taskId}`);
    const newStatus = selectElement.value;

    if (!newStatus) {
        alert("Please select a valid status.");
        return;
    }
     const currentStatusSpan = document.getElementById(`status-${taskId}`);
    if (currentStatusSpan && currentStatusSpan.textContent === newStatus) {
        alert(`Task is already ${newStatus}.`);
        return;
    }


    const result = await cleanerApiFetch(`/cleaner/tasks/${taskId}/status`, 'PUT', { status: newStatus });
    if (result && result.report) {
        alert(`Task status updated to ${result.report.status}.`);
        // Update UI directly or reload all tasks
        const statusSpan = document.getElementById(`status-${taskId}`);
        if(statusSpan) statusSpan.textContent = result.report.status;
        
        // If completed, disable further updates on this card
        if (result.report.status === 'completed') {
            selectElement.disabled = true;
            const updateButton = selectElement.nextElementSibling; // Assuming button is next sibling
            if (updateButton && updateButton.tagName === 'BUTTON') {
                updateButton.disabled = true;
            }
        }
         loadAssignedTasks(); // Refresh the list to update counts and appearances
    } else {
      // If update failed, revert the select to its original value
      // This is a bit tricky without storing original value, so a reload is safer
      loadAssignedTasks();
    }
}

// --- Cleaner Attendance Page (cleaner_attendance.html) ---
function initializeAttendanceButtons() {
    const checkInBtn = document.getElementById('checkInButton');
    const checkOutBtn = document.getElementById('checkOutButton');

    if (checkInBtn) {
        checkInBtn.addEventListener('click', async () => {
            const result = await cleanerApiFetch('/cleaner/attendance/check-in', 'POST');
            displayAttendanceMessage(result ? result.message : "Check-in failed.", !result);
            if (result) {
                checkInBtn.disabled = true;
                checkOutBtn.disabled = false; // Enable check-out
                loadAttendanceHistory(); // Refresh history
            }
        });
    }
    if (checkOutBtn) {
        checkOutBtn.addEventListener('click', async () => {
            const result = await cleanerApiFetch('/cleaner/attendance/check-out', 'POST');
            displayAttendanceMessage(result ? result.message : "Check-out failed.", !result);
            if (result) {
                checkOutBtn.disabled = true;
                loadAttendanceHistory(); // Refresh history
            }
        });
    }
}

async function loadTodayAttendanceStatus() {
    // Try to get "my attendance" and check the latest record for today
    // This can inform button states (e.g., if already checked in/out)
    const checkInBtn = document.getElementById('checkInButton');
    const checkOutBtn = document.getElementById('checkOutButton');
    if(!checkInBtn || !checkOutBtn) return;

    const data = await cleanerApiFetch('/cleaner/attendance'); // Gets all personal attendance
    if (data && Array.isArray(data)) {
        const todayStr = new Date().toISOString().slice(0,10);
        const todayRecord = data.find(rec => rec.date && new Date(rec.date).toISOString().slice(0,10) === todayStr);

        if (todayRecord) {
            if (todayRecord.checkIn && !todayRecord.checkOut) {
                displayAttendanceMessage(`Checked in at ${new Date(todayRecord.checkIn).toLocaleTimeString()}. Pending check-out.`);
                checkInBtn.disabled = true;
                checkOutBtn.disabled = false;
            } else if (todayRecord.checkIn && todayRecord.checkOut) {
                displayAttendanceMessage(`Checked in at ${new Date(todayRecord.checkIn).toLocaleTimeString()} and checked out at ${new Date(todayRecord.checkOut).toLocaleTimeString()} today.`);
                checkInBtn.disabled = true;
                checkOutBtn.disabled = true;
            }
        } else {
             // No record for today means can check-in
            checkInBtn.disabled = false;
            checkOutBtn.disabled = true; // Can't check out before check-in
            displayAttendanceMessage("Ready to check-in for today.");
        }
    } else {
         checkInBtn.disabled = false;
         checkOutBtn.disabled = true;
    }
}


function displayAttendanceMessage(message, isError = false) {
    const msgDiv = document.getElementById('attendanceStatusMessage');
    if (msgDiv) {
        msgDiv.textContent = message;
        msgDiv.className = 'status-message'; // Reset classes
        if (isError) {
            msgDiv.classList.add('error-message');
        }
        msgDiv.style.display = 'block';
    }
}

async function loadAttendanceHistory() {
    const historyBody = document.getElementById('attendanceHistoryBody');
    const noHistoryMsg = document.getElementById('noHistoryMsg');
    if (!historyBody || !noHistoryMsg) return;

    const records = await cleanerApiFetch('/cleaner/attendance'); // Endpoint for cleaner's own attendance
    historyBody.innerHTML = ''; // Clear previous
    
    if (records && Array.isArray(records) && records.length > 0) {
        noHistoryMsg.style.display = 'none';
        // Show last 7 days for brevity, or paginate in a real app
        records.slice(0, 7).forEach(rec => {
            const row = historyBody.insertRow();
            row.innerHTML = `
                <td>${new Date(rec.date).toLocaleDateString()}</td>
                <td>${rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString() : 'N/A'}</td>
                <td>${rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString() : 'N/A'}</td>
            `;
        });
    } else {
        noHistoryMsg.style.display = 'block';
    }
}


// --- Cleaner Report Issue Page (cleaner_report_issue.html) ---
function initializeCleanerIssueForm() {
    const form = document.getElementById('cleanerIssueForm');
    const messageArea = document.getElementById('formMessageArea');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(messageArea) messageArea.textContent = '';

            const subject = document.getElementById('issueSubject').value;
            const message = document.getElementById('issueMessage').value;

            const result = await cleanerApiFetch('/cleaner/issues', 'POST', { subject, message });
            if (result && result.issue) {
                if(messageArea) {
                    messageArea.textContent = 'Issue reported successfully!';
                    messageArea.className = 'message-area success';
                }
                form.reset();
            } else {
                 if(messageArea) {
                    messageArea.textContent = result?.message || 'Failed to report issue.';
                    messageArea.className = 'message-area error';
                }
            }
        });
    }
}

// --- My Submitted Issues Page (cleaner_my_issues.html) ---
async function loadMySubmittedIssues() {
    const issuesContainer = document.getElementById('myIssuesListContainer');
    const noIssuesMsg = document.getElementById('noMyIssuesMessage');

    if (!issuesContainer || !noIssuesMsg) return;

    issuesContainer.innerHTML = '<p>Loading your submitted issues...</p>';
    noIssuesMsg.style.display = 'none';

    const data = await cleanerApiFetch('/cleaner/issues'); // Endpoint for cleaner's own issues
    if (data && Array.isArray(data)) {
        if (data.length === 0) {
            issuesContainer.innerHTML = '';
            noIssuesMsg.style.display = 'block';
            return;
        }
        issuesContainer.innerHTML = ''; // Clear loading
        data.forEach(issue => {
            const entry = document.createElement('div');
            entry.className = 'issue-entry';
            entry.innerHTML = `
                <h3>${issue.subject}</h3>
                <p><strong>Message:</strong> ${issue.message}</p>
                <p><strong>Status:</strong> <span class="status-${issue.status}">${issue.status}</span></p>
                <p><small>Reported on: ${new Date(issue.createdAt).toLocaleString()}</small></p>
            `;
            issuesContainer.appendChild(entry);
        });
    } else {
        issuesContainer.innerHTML = '<p>Failed to load your submitted issues.</p>';
    }
}