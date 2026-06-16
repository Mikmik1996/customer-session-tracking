console.log("✅ SCRIPT LOADED");

/* ==========================================
   ⏰ TIME FORMAT (HH:MM:SS)
========================================== */
function formatRemainingTime(totalSeconds) {
  if (totalSeconds <= 0) return "00:00:00";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
}

/* ==========================================
   📁 SIDEBAR VIEW SWITCHER
========================================== */
function showSection(id) {
  // Hide all sections dynamically
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  // Activate chosen target section panel template
  const el = document.getElementById(id);
  if (el) el.classList.add("active");

  // Automatically refresh analytical canvas charts if entering Reports page
  if (id === "reports") {
    setTimeout(loadChart, 100);
  }
}

function setActive(btn) {
  document.querySelectorAll(".menu button").forEach(b => {
    b.classList.remove("active");
  });
  btn.classList.add("active");
}

function logout() {
  window.location.href = "/";
}

/* ==========================================
   ➕ ADD SESSION (INSTANT UI REFRESH)
========================================== */
async function addSession() {
  const name = document.getElementById("name").value;
  const contact = document.getElementById("contact").value;
  const package_id = document.getElementById("package").value;

  if (!name || !package_id) {
    alert("⚠️ Please fill out the customer name and select a package.");
    return;
  }

  try {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: name,
        client_contact: contact,
        package_id: parseInt(package_id),
        staff_id: 1
      })
    });

    const data = await res.json();

    if (data.success) {
      console.log("✅ Session saved successfully.");

      // Clear layout fields instantly
      document.getElementById("name").value = "";
      document.getElementById("contact").value = "";
      document.getElementById("package").value = "";

      // Force instant data engine synchronizer reload execution pass
      await loadSessions();

      // Trigger temporary floating confirmation notification label element
      const msg = document.getElementById("msg");
      if (msg) {
        msg.innerText = "✅ Session added!";
        msg.style.opacity = "1";
        setTimeout(() => { msg.style.opacity = "0"; }, 2000);
      }
    } else {
      alert("❌ Failed to add session");
    }
  } catch (err) {
    console.error("❌ Add session execution error:", err);
  }
}

/* ==========================================
   📊 DASHBOARD DATA RENDERING & TIMERS
========================================== */
async function loadSessions() {
  try {
    const res = await fetch("/api/sessions/active");
    if (!res.ok) {
      console.error("❌ API session data pipeline dropped error code:", res.status);
      return;
    }

    const data = await res.json();
    const tableBody = document.getElementById("tableBody");
    if (!tableBody) return;

    let html = "";

    data.forEach(s => {
      const start = new Date(s.start_time);
      const now = new Date();

      // Explicit type casting to safe-guard switch evaluations
      const packageId = Number(s.package_id);
      let duration = 30;

      switch (packageId) {
        case 1: duration = 30;  break;
        case 2: duration = 60;  break;
        case 3: duration = 90;  break;
        case 4: duration = 120; break;
        case 5: duration = 999; break; // Unlimited package tracking assignment
        default: duration = 30;  break;
      }

      // Calculate real-time dynamic remaining time metric values
      let remain = (duration * 60) - ((now - start) / 1000);
      if (remain < 0) remain = 0;

      const timeIn = start.toLocaleTimeString("en-PH", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      let timeOut = "-";
      if (duration < 999) {
        const end = new Date(start.getTime() + duration * 60000);
        timeOut = end.toLocaleTimeString("en-PH", {
          timeZone: "Asia/Manila",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        });
      } else {
        timeOut = "Unlimited";
      }

      // Style flags assignment mapping metrics
      let color = "normal";
      if (remain <= 0) color = "expired";
      else if (remain <= 300) color = "warning"; // Under 5 minutes remaining status flags

      html += `
        <tr>
          <td><strong>${s.client_name}</strong></td>
          <td>${timeIn}</td>
          <td>${timeOut}</td>
          <td class="${color}">
            ${duration >= 999 ? '<span class="badge unlimited">Unlimited</span>' : formatRemainingTime(remain)}
          </td>
          <td>
            <button class="remove" onclick="removeSession(${s.id})">Remove</button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  } catch (err) {
    console.error("❌ UI Render sync execution failure loop dropped:", err);
  }
}

/* ==========================================
   🛑 TERMINATE TRACKING SESSIONS
========================================== */
async function removeSession(id) {
  if (confirm("Are you sure you want to end this customer tracking session?")) {
    await fetch(`/api/sessions/${id}/end`, { method: "POST" });
    loadSessions();
  }
}

/* ==========================================
   📈 ANALYTICS REVENUE METRIC CHART ENGINE
========================================== */
let chart; 

async function loadChart() {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

  const startVal = document.getElementById("startDate").value;
  const endVal = document.getElementById("endDate").value;

  let url = "/api/chart-data";
  if (startVal && endVal) {
    url += `?start=${startVal}&end=${endVal}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    const labels = data.map(d => d.package_name);
    const values = data.map(d => d.count);

    const ctx = canvas.getContext("2d");

    if (chart) {
      chart.destroy();
    }

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Registered Customers By Package",
          data: values,
          backgroundColor: "#1c7ed6",
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  } catch (err) {
    console.error("❌ Analytics chart visualization refresh error caught:", err);
  }
}

/* ==========================================
   📥 EXPORT LOGS ENGINE TO SPREADSHEETS
========================================== */
function downloadCSV() {
  const startVal = document.getElementById("startDate").value;
  const endVal = document.getElementById("endDate").value;

  let url = "/api/export";
  if (startVal && endVal) {
    url += `?start=${startVal}&end=${endVal}`;
  }
  window.location.href = url;
}

/* ==========================================
   🚦 ROUTER BOOTSTRAPPING ENGINE ON LOAD
========================================== */
// Background real-time table sync loop ticker (every 2 seconds)
setInterval(loadSessions, 2000);

function initializeDashboardRouting() {
  console.log("🚦 Initializing application view routing router systems...");
  
  // Fire off initial operational dashboard sync query pass
  loadSessions();

  // Read current address window location reference hash tag parsing routing elements
  const currentHash = window.location.hash; // e.g., "#dashboard", "#reports"
  
  if (currentHash) {
    const sectionTargetId = currentHash.replace("#", "");
    
    // Unhide the target UI view canvas block pane
    showSection(sectionTargetId);

    // Auto-highlight matching active layout sidebar navigation link buttons
    const linkedMenuButton = document.querySelector(`.sidebar .menu button[onclick*="${sectionTargetId}"]`);
    if (linkedMenuButton) {
      setActive(linkedMenuButton);
    }
    console.log(`🔓 Workspace interface mapped successfully to view path section item: [${sectionTargetId}]`);
  } else {
    // Normal structural default system fallback placement maps
    showSection("registration");
  }
}

// ✅ DOM WRAPPER GUARD: Holds execution securely until HTML nodes are rendered completely!
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed. Safe to boot interface elements.");
  initializeDashboardRouting();
});

// ✅ Run this immediately when the dashboard template page mounts into view
document.addEventListener("DOMContentLoaded", () => {
  // Check if your helper layout management system exists, then default to registration view
  if (typeof showSection === "function") {
    showSection("registration");
  }
});