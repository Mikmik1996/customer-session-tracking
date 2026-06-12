// API Base URL (adjust if needed)
const API_URL = 'http://localhost:3000/api';

let currentStaff = null;

// Initialize
document.getElementById('loginForm').addEventListener('submit', handleLogin);
document.getElementById('sessionForm').addEventListener('submit', handleCreateSession);

// Load packages on page load
window.addEventListener('load', () => {
  loadPackages();
  // Check if user is already logged in
  const staff = JSON.parse(localStorage.getItem('currentStaff'));
  if (staff) {
    currentStaff = staff;
    showMainPage();
    startAutoRefresh();
  }
});

// Login Handler
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      currentStaff = data.staff;
      localStorage.setItem('currentStaff', JSON.stringify(currentStaff));
      showMainPage();
      startAutoRefresh();
    } else {
      alert('Invalid credentials. Try: staff / 123456');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Connection error. Make sure backend is running on http://localhost:3000');
  }
}

// Show Main Page
function showMainPage() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainPage').style.display = 'block';
  document.getElementById('staffName').textContent = `👤 ${currentStaff.name}`;
}

// Logout
function logout() {
  localStorage.removeItem('currentStaff');
  currentStaff = null;
  document.getElementById('loginPage').style.display = 'block';
  document.getElementById('mainPage').style.display = 'none';
  document.getElementById('loginForm').reset();
  stopAutoRefresh();
}

// Load Packages
async function loadPackages() {
  try {
    const response = await fetch(`${API_URL}/packages`);
    const packages = await response.json();
    const select = document.getElementById('packageSelect');
    
    packages.forEach(pkg => {
      const option = document.createElement('option');
      option.value = pkg.id;
      option.textContent = `${pkg.name} - ₱${pkg.price}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading packages:', error);
  }
}

// Create Session
async function handleCreateSession(e) {
  e.preventDefault();
  
  if (!currentStaff) {
    alert('Please login first');
    return;
  }

  const client_name = document.getElementById('clientName').value;
  const client_contact = document.getElementById('clientContact').value;
  const package_id = document.getElementById('packageSelect').value;

  try {
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name,
        client_contact,
        package_id: parseInt(package_id),
        staff_id: currentStaff.id
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Session started successfully!');
      document.getElementById('sessionForm').reset();
      loadActiveSessions();
    } else {
      alert('❌ Error creating session');
    }
  } catch (error) {
    console.error('Error creating session:', error);
    alert('Error: ' + error.message);
  }
}

// Load Active Sessions
async function loadActiveSessions() {
  try {
    const response = await fetch(`${API_URL}/sessions/active`);
    const sessions = await response.json();
    displayActiveSessions(sessions);
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
}

// Display Active Sessions
function displayActiveSessions(sessions) {
  const container = document.getElementById('activeSesionsList');
  container.innerHTML = '';

  if (sessions.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No active sessions</p>';
    return;
  }

  sessions.forEach(session => {
    const isExpired = session.remaining_minutes <= 0;
    const isWarning = session.remaining_minutes <= 5 && session.remaining_minutes > 0;

    const card = document.createElement('div');
    card.className = `session-card ${isExpired ? 'expired' : ''}`;
    
    const timeClass = isExpired ? 'expired' : isWarning ? 'warning' : '';
    const timeText = isExpired 
      ? '⏱️ TIME\'S UP!' 
      : `⏱️ ${Math.max(0, session.remaining_minutes)} mins`;

    card.innerHTML = `
      <h4>👤 ${session.client_name}</h4>
      <div class="session-info">
        <strong>📱 Contact:</strong> ${session.client_contact}
      </div>
      <div class="session-info">
        <strong>📦 Package:</strong> ${session.package_name}
      </div>
      <div class="session-info">
        <strong>👨‍💼 Staff:</strong> ${session.staff_name}
      </div>
      <div class="session-info">
        <strong>🕐 Started:</strong> ${new Date(session.start_time).toLocaleString()}
      </div>
      <div class="session-time ${timeClass}">${timeText}</div>
      <div class="session-actions">
        <button onclick="endSession(${session.id})" class="btn btn-success">✓ End Session</button>
      </div>
    `;
    
    container.appendChild(card);
  });

  updateStats();
}

// Load All Sessions
async function loadAllSessions() {
  try {
    const response = await fetch(`${API_URL}/sessions`);
    const sessions = await response.json();
    displayAllSessions(sessions);
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
}

// Display All Sessions
function displayAllSessions(sessions) {
  const container = document.getElementById('allSessionsList');
  container.innerHTML = '';

  if (sessions.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No sessions yet</p>';
    return;
  }

  sessions.forEach(session => {
    const card = document.createElement('div');
    card.className = `session-card ${session.status === 'completed' ? 'completed' : ''}`;
    
    const statusEmoji = session.status === 'active' ? '🟢' : session.status === 'completed' ? '✅' : '❌';
    const endedTime = session.end_time ? new Date(session.end_time).toLocaleString() : 'Ongoing';

    card.innerHTML = `
      <h4>${statusEmoji} ${session.client_name}</h4>
      <div class="session-info">
        <strong>📱 Contact:</strong> ${session.client_contact}
      </div>
      <div class="session-info">
        <strong>📦 Package:</strong> ${session.package_name}
      </div>
      <div class="session-info">
        <strong>👨‍💼 Staff:</strong> ${session.staff_name}
      </div>
      <div class="session-info">
        <strong>🕐 Started:</strong> ${new Date(session.start_time).toLocaleString()}
      </div>
      <div class="session-info">
        <strong>🏁 Ended:</strong> ${endedTime}
      </div>
      <div class="session-info">
        <strong>📊 Status:</strong> <span style="text-transform: uppercase; font-weight: 700;">${session.status}</span>
      </div>
    `;
    
    container.appendChild(card);
  });
}

// End Session
async function endSession(sessionId) {
  if (!confirm('Are you sure you want to end this session?')) return;

  try {
    const response = await fetch(`${API_URL}/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Session ended successfully!');
      loadActiveSessions();
      loadAllSessions();
    }
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

// Update Statistics
async function updateStats() {
  try {
    const statsResponse = await fetch(`${API_URL}/statistics`);
    const stats = await statsResponse.json();
    
    document.getElementById('peopleInside').textContent = stats.active;
    document.getElementById('activeSessions').textContent = stats.active;
    document.getElementById('totalSessions').textContent = stats.total;
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Switch Tabs
function switchTab(tab) {
  // Hide all tabs
  document.getElementById('activeTab').classList.remove('active');
  document.getElementById('activeTab').style.display = 'none';
  document.getElementById('allTab').classList.remove('active');
  document.getElementById('allTab').style.display = 'none';

  // Remove active class from buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  // Show selected tab
  if (tab === 'active') {
    document.getElementById('activeTab').classList.add('active');
    document.getElementById('activeTab').style.display = 'block';
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    loadActiveSessions();
  } else {
    document.getElementById('allTab').classList.add('active');
    document.getElementById('allTab').style.display = 'block';
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    loadAllSessions();
  }
}

// Auto Refresh
let refreshInterval;

function startAutoRefresh() {
  // Initial load
  loadActiveSessions();
  loadAllSessions();
  updateStats();

  // Refresh every 5 seconds
  refreshInterval = setInterval(() => {
    loadActiveSessions();
    updateStats();
  }, 5000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
}
