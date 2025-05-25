

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('form');
  const logoutBtn = document.getElementById('logoutBtn');
  const container = document.getElementById('issuesContainer');

  // Handle report form submission
  if (form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const formData = new FormData(form);

      try {
        const response = await fetch('/user/report', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          alert(result.message || 'Report submitted successfully!');
          form.reset();
        } else {
          const error = await response.json();
          alert('Error: ' + (error.error || 'Submission failed.'));
        }
      } catch (err) {
        console.error('Submission error:', err);
        alert('Something went wrong. Please try again later.');
      }
    });
  }

  // Handle logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/auth/logout', {
          method: 'GET',
          credentials: 'include'
        });

        if (res.ok) {
          alert('Logged out successfully.');
          window.location.href = 'login.html';
        } else {
          alert('Logout failed.');
        }
      } catch (err) {
        console.error('Logout error:', err);
        alert('Something went wrong.');
      }
    });
  }

  // Load reports if container exists
  if (container) {
    try {
      const res = await fetch('/user/myreports', {
        method: 'GET',
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to fetch reports');

      const reports = await res.json();
      console.log(reports);

      if (reports.length === 0) {
        container.innerHTML = '<p>No reports found.</p>';
        return;
      }

      container.innerHTML = ''; // Clear loading text

      reports.forEach(report => {
        const card = document.createElement('div');
        card.className = 'report-card';

        card.innerHTML = `
          <h3>${report.title}</h3>
          <p><strong>Location:</strong> ${report.location}</p>
          <p>${report.description || ''}</p>
          ${report.imageUrl ? `<img src="${report.imageUrl}" alt="Issue Image">` : ''}
          <p class="status">Status: ${report.status}</p>
        `;

        container.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p>Failed to load reports. Please try again later.</p>';
    }
  }
});
