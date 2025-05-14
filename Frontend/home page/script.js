document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");
    const profileForm = document.getElementById("profileForm");
    const taskList = document.getElementById("taskList");
  
    if (registerForm) {
      registerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        // Send data to backend to create user
        alert("Registered successfully!");
      });
    }
  
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        // Validate login and redirect based on role
        alert("Login successful!");
        // You can redirect to dashboard.html and render based on role
      });
    }
  
    if (profileForm) {
      profileForm.addEventListener("submit", (e) => {
        e.preventDefault();
        alert("Profile updated!");
      });
    }
  
    if (taskList) {
      // Dummy example of tasks
      const tasks = [
        { id: 1, title: "Clean Bin A-1", status: "Pending" },
        { id: 2, title: "Inspect Recycling Point", status: "Pending" }
      ];
  
      tasks.forEach(task => {
        const li = document.createElement("li");
        li.innerHTML = `
          ${task.title} - <button onclick="markDone(${task.id})">Mark as Done</button>
        `;
        taskList.appendChild(li);
      });
    }
  });
  
  function markDone(taskId) {
    alert(`Task ${taskId} marked as completed.`);
    // Update task status in backend
  }
  