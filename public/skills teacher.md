:root {
  --primary: #8B5CF6;
  --primary-dark: #7C3AED;
  --primary-light: #F3E8FF;

  --background: #FAFAFC;
  --surface: #FFFFFF;
  --border: rgba(229, 231, 235, 0.7);

  --text-primary: #111827;
  --text-secondary: #6B7280;
  --text-muted: #9CA3AF;

  --blue-soft: #F5F9FF;
  --blue-border: rgba(199, 223, 255, 0.7);
  --blue-icon: #3B82F6;

  --purple-soft: #FBF7FF;
  --purple-border: rgba(230, 211, 255, 0.7);
  --purple-icon: #8B5CF6;

  --yellow-soft: #FFFDF4;
  --yellow-border: rgba(253, 230, 138, 0.7);
  --yellow-icon: #F59E0B;

  --green-soft: #F5FCF8;
  --green-border: rgba(187, 247, 208, 0.7);
  --green-icon: #22C55E;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--text-primary);
  font-family: Inter, Poppins, sans-serif;
}

/* Sidebar */
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
}

.sidebar-item {
  color: var(--text-secondary);
  border-radius: 12px;
}

.sidebar-item.active {
  background: var(--primary-light);
  color: var(--primary-dark);
}

/* Cards */
.card,
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.035);
  transition: all 0.2s ease;
}

.card:hover,
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.055);
}

/* Stat Cards */
.stat-card {
  padding: 24px;
}

.stat-blue {
  background: var(--blue-soft);
  border-color: var(--blue-border);
}

.stat-purple {
  background: var(--purple-soft);
  border-color: var(--purple-border);
}

.stat-yellow {
  background: var(--yellow-soft);
  border-color: var(--yellow-border);
}

.stat-green {
  background: var(--green-soft);
  border-color: var(--green-border);
}

.icon-circle {
  opacity: 0.9;
}

/* Buttons */
.btn-primary {
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.18);
  cursor: pointer;
}

.btn-secondary {
  background: white;
  color: var(--primary-dark);
  border: 1px solid var(--primary);
  border-radius: 10px;
  padding: 12px 16px;
  font-weight: 600;
  cursor: pointer;
}

/* Inputs */
input,
select,
textarea {
  width: 100%;
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  color: var(--text-primary);
  font-family: inherit;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
}

/* Page Wrapper */
.page,
.main-content,
.dashboard-content {
  background: var(--background);
}