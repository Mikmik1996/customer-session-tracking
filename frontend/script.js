console.log("✅ SCRIPT LOADED");

/* =======================
   ✅ SIDEBAR
======================= */
function showSection(id) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  const el = document.getElementById(id);
  if (el) el.classList.add("active");

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

/* =======================
   ✅ ADD SESSION (FIXED)
======================= */
async function addSession() {
  const name = document.getElementById("name").value;
  const contact = document.getElementById("contact").value;
  const package_id = document.getElementById("package").value;

  try {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_name: name,
        client_contact: contact,
        package_id,
        staff_id: 1
      })
    });

    const data = await res.json();

    if (data.success) {
      console.log("✅ Session saved");

      // ✅ VERY IMPORTANT (MAIN FIX)
      loadSessions();

      const msg = document.getElementById("msg");
      msg.innerText = "✅ Session added!";
      msg.style.opacity = "1";

      document.getElementById("name").value = "";
      document.getElementById("contact").value = "";
      document.getElementById("package").value = "";

      setTimeout(() => {
        msg.style.opacity = "0";
      }, 2000);

    } else {
      alert("❌ Failed to add session");
    }

  } catch (err) {
    console.error("❌ Add session error:", err);
  }
}

/* =======================
   ✅ DASHBOARD
======================= */
async function loadSessions() {
  try {
    const res = await fetch("/api/sessions/active");

    if (!res.ok) {
      console.error("❌ API error:", res.status);
      return;
    }

    const data = await res.json();

    let html = "";

    data.forEach(s => {
      const start = new Date(s.start_time);
      const now = new Date();

      let duration = 30;

      if (s.package_id == 1) duration = 30;
      else if (s.package_id == 2) duration = 60;
      else if (s.package_id == 3) duration = 90;
      else if (s.package_id == 4) duration = 120;
      else if (s.package_id == 5) duration = 999;

      let remain = (duration * 60) - ((now - start) / 1000);
      if (remain < 0) remain = 0;

      const mins = Math.floor(remain / 60);
      const secs = Math.floor(remain % 60);

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

      let color = "normal";
      if (remain <= 0) color = "expired";
      else if (remain <= 300) color = "warning";

      html += `
        <tr>
          <td>${s.client_name}</td>
          <td>${timeIn}</td>
          <td>${timeOut}</td>
          <td class="${color}">
            ${duration >= 999 ? "Unlimited" : `${mins}:${secs.toString().padStart(2, '0')}`}
          </td>
          <td>
            <button class="remove" onclick="removeSession(${s.id})">Remove</button>
          </td>
        </tr>
      `;
    });

    document.getElementById("tableBody").innerHTML = html;

  } catch (err) {
    console.error("❌ Load sessions error:", err);
  }
}

/* =======================
   ✅ REMOVE SESSION
======================= */
async function removeSession(id) {
  await fetch(`/api/sessions/${id}/end`, { method: "POST" });
  loadSessions();
}

/* =======================
   ✅ CHART
======================= */
let chart;

async function loadChart() {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

  const res = await fetch("/api/chart-data");
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) return;

  const labels = data.map(d => d.package_name);
  const values = data.map(d => d.count);

  const ctx = canvas.getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Customers",
        data: values,
        backgroundColor: "#1c7ed6"
      }]
    }
  });
}

/* =======================
   ✅ EXPORT
======================= */
function downloadCSV() {
  window.location.href = "/api/export";
}

/* =======================
   ✅ AUTO LOAD
======================= */
setInterval(loadSessions, 2000);
loadSessions();
