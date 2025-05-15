const BACKEND_URL = 'http://localhost:5300';

function getDashboardLink(role) {
  if (role === "admin") return "/users/Admin/adminpage.html";
  if (role === "cleaner") return "/users/Cleaner/cleanerpage.html";
  return "/users/client_user/clientpage.html";
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateNavbarAuthUI();
  window.location.href = '/homepage/homepage.html';
}

function updateNavbarAuthUI() {
  const authLinkContainer = document.getElementById('auth-link-container');
  if (!authLinkContainer) return;

  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');

  if (token && userString) {
    try {
      const user = JSON.parse(userString);
      if (user && user.name && user.role) {
        const dashboardUrl = getDashboardLink(user.role);
        authLinkContainer.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <a href="${dashboardUrl}" class="btn" style="display: flex; align-items: center; gap: 8px; text-decoration: none; padding: 0.3rem 0.8rem;">
              <i class="fas fa-user-circle"></i>
              <span style="color: white;">${user.name}</span>
            </a>
            <button id="logoutButton" class="btn" style="background-color: #c62828; color: white; padding: 0.3rem 0.8rem;">Logout</button>
          </div>
        `;
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) logoutButton.addEventListener('click', handleLogout);
      } else {
        localStorage.clear();
        authLinkContainer.innerHTML = '<a href="/homepage/login.html" class="btn">Login</a>';
      }
    } catch {
      localStorage.clear();
      authLinkContainer.innerHTML = '<a href="/homepage/login.html" class="btn">Login</a>';
    }
  } else {
    authLinkContainer.innerHTML = '<a href="/homepage/login.html" class="btn">Login</a>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateNavbarAuthUI();

  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role: 'user' })
        });

        const data = await res.json();
        if (res.ok) {
          alert("Registration successful! Please login.");
          window.location.href = "/homepage/login.html";
        } else {
          alert(data.message || "Registration failed.");
        }
      } catch {
        alert("Error during registration.");
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      try {
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          const role = data.user.role;
          if (role === "admin") {
            window.location.href = "/users/Admin/adminpage.html";
          } else if (role === "cleaner") {
            window.location.href = "/users/Cleaner/cleanerpage.html";
          } else {
            window.location.href = "/homepage/homepage.html";
          }
        } else {
          alert(data.message || "Login failed.");
        }
      } catch {
        alert("Error during login.");
      }
    });
  }
});