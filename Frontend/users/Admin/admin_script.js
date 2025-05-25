const BACKEND_URL = 'http://localhost:5300'; // or your deployed URL

  document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      alert("Unauthorized: Please log in as admin.");
      return;
    }

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${BACKEND_URL}/admin/create-cleaner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Cleaner account created successfully!");
        document.getElementById("registerForm").reset();
      } else {
        alert(data.message || "Failed to create cleaner.");
      }
    } catch (err) {
      alert("Error connecting to backend.");
      console.error(err);
    }
  });