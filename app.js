const USERS_KEY = "taskflow-ua.users";
const SESSION_KEY = "taskflow-ua.session";
const THEME_KEY = "taskflow-ua.theme";

const priorityLabels = {
  high: "Високий",
  medium: "Середній",
  low: "Низький",
};

const statusLabels = {
  planned: "Заплановано",
  progress: "У процесі",
  done: "Виконано",
};

const authScreen = document.querySelector("#authScreen");
const appScreen = document.querySelector("#appScreen");
const authMessage = document.querySelector("#authMessage");
const loginTab = document.querySelector("#loginTab");
const registerTab = document.querySelector("#registerTab");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");

const loginEmail = document.querySelector("#loginEmail");
const loginPassword = document.querySelector("#loginPassword");
const registerName = document.querySelector("#registerName");
const registerEmail = document.querySelector("#registerEmail");
const registerPassword = document.querySelector("#registerPassword");

const profileName = document.querySelector("#profileName");
const profileEmail = document.querySelector("#profileEmail");
const todayLabel = document.querySelector("#todayLabel");
const focusTask = document.querySelector("#focusTask");
const focusMeta = document.querySelector("#focusMeta");

const activeCount = document.querySelector("#activeCount");
const doneTodayCount = document.querySelector("#doneTodayCount");
const focusScore = document.querySelector("#focusScore");
const completionRate = document.querySelector("#completionRate");
const progressBar = document.querySelector("#progressBar");
const progressText = document.querySelector("#progressText");
const totalTasks = document.querySelector("#totalTasks");
const todayTasks = document.querySelector("#todayTasks");
const inProgressTasks = document.querySelector("#inProgressTasks");
const highPriorityTasks = document.querySelector("#highPriorityTasks");

const views = document.querySelectorAll("[data-view]");
const viewButtons = document.querySelectorAll("[data-view-button]");
const taskForm = document.querySelector("#taskForm");
const titleInput = document.querySelector("#title");
const descriptionInput = document.querySelector("#description");
const categoryInput = document.querySelector("#category");
const priorityInput = document.querySelector("#priority");
const statusInput = document.querySelector("#status");
const durationInput = document.querySelector("#duration");
const dateInput = document.querySelector("#date");
const timeInput = document.querySelector("#time");
const searchInput = document.querySelector("#searchInput");
const filterStatus = document.querySelector("#filterStatus");
const filterPriority = document.querySelector("#filterPriority");
const boardColumns = document.querySelector("#boardColumns");
const timelineList = document.querySelector("#timelineList");
const deadlineList = document.querySelector("#deadlineList");
const habitList = document.querySelector("#habitList");
const notesInput = document.querySelector("#notesInput");
const notesStatus = document.querySelector("#notesStatus");
const themeToggle = document.querySelector("#themeToggle");
const logoutButton = document.querySelector("#logoutButton");

let session = loadSession();
let appState = session ? loadUserState(session.email) : null;

applyTheme(loadTheme());
todayLabel.textContent = formatDate(getTodayDate());
dateInput.value = getTodayDate();
timeInput.value = "09:00";

loginTab.addEventListener("click", () => switchAuthMode("login"));
registerTab.addEventListener("click", () => switchAuthMode("register"));
loginForm.addEventListener("submit", handleLogin);
registerForm.addEventListener("submit", handleRegister);
taskForm.addEventListener("submit", handleCreateTask);
searchInput.addEventListener("input", renderApp);
filterStatus.addEventListener("change", renderApp);
filterPriority.addEventListener("change", renderApp);
boardColumns.addEventListener("click", handleBoardClick);
habitList.addEventListener("click", handleHabitClick);
notesInput.addEventListener("input", handleNotesInput);
themeToggle.addEventListener("click", toggleTheme);
logoutButton.addEventListener("click", logout);

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!appState) {
      return;
    }

    appState.currentView = button.dataset.viewButton;
    saveCurrentUserState();
    renderViews();
  });
});

syncAppVisibility();
if (appState) {
  renderApp();
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function loadUsers() {
  const raw = localStorage.getItem(USERS_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(user) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      email: user.email,
      name: user.name,
    }),
  );
  session = { email: user.email, name: user.name };
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  session = null;
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  themeToggle.textContent =
    theme === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему";
}

function toggleTheme() {
  applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
}

function switchAuthMode(mode) {
  const showLogin = mode === "login";
  loginTab.classList.toggle("active", showLogin);
  registerTab.classList.toggle("active", !showLogin);
  loginForm.classList.toggle("auth-form-hidden", !showLogin);
  registerForm.classList.toggle("auth-form-hidden", showLogin);
  authMessage.textContent = "";
}

function handleRegister(event) {
  event.preventDefault();

  const name = registerName.value.trim();
  const email = registerEmail.value.trim().toLowerCase();
  const password = registerPassword.value.trim();

  if (!name || !email || password.length < 6) {
    authMessage.textContent = "Заповніть усі поля. Пароль має містити щонайменше 6 символів.";
    return;
  }

  const users = loadUsers();

  if (users.some((user) => user.email === email)) {
    authMessage.textContent = "Користувач з такою електронною поштою вже існує.";
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    password,
    state: createDefaultState(name),
  };

  users.push(user);
  saveUsers(users);
  saveSession(user);
  appState = structuredClone(user.state);
  registerForm.reset();
  syncAppVisibility();
  renderApp();
}

function handleLogin(event) {
  event.preventDefault();

  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value.trim();
  const users = loadUsers();
  const user = users.find((item) => item.email === email && item.password === password);

  if (!user) {
    authMessage.textContent = "Невірна електронна пошта або пароль.";
    return;
  }

  saveSession(user);
  appState = loadUserState(user.email);
  loginForm.reset();
  syncAppVisibility();
  renderApp();
}

function logout() {
  clearSession();
  appState = null;
  syncAppVisibility();
  switchAuthMode("login");
}

function syncAppVisibility() {
  const isLoggedIn = Boolean(session);
  authScreen.classList.toggle("app-hidden", isLoggedIn);
  appScreen.classList.toggle("app-hidden", !isLoggedIn);
}

function createDefaultState(name) {
  return {
    currentView: "overview",
    notes: `Поточні нотатки користувача ${name}.\n1. Перевірити головні задачі на день.\n2. Зафіксувати результати роботи.\n3. Спланувати завдання на завтра.`,
    tasks: [
      {
        id: crypto.randomUUID(),
        title: "Підготувати презентацію дипломної роботи",
        description: "Оновити слайди з описом функціональних модулів та додати висновок.",
        category: "Навчання",
        priority: "high",
        status: "progress",
        duration: 90,
        date: getTodayDate(),
        time: "10:00",
        completedAt: null,
      },
      {
        id: crypto.randomUUID(),
        title: "Зустріч з командою проєкту",
        description: "Узгодити дедлайни, ролі та готовність матеріалів.",
        category: "Робота",
        priority: "medium",
        status: "planned",
        duration: 60,
        date: getTodayDate(),
        time: "15:00",
        completedAt: null,
      },
      {
        id: crypto.randomUUID(),
        title: "Вечірня прогулянка",
        description: "Підтримати активність і зробити перерву після навчання.",
        category: "Здоров'я",
        priority: "low",
        status: "done",
        duration: 45,
        date: getTodayDate(),
        time: "19:00",
        completedAt: getTodayDate(),
      },
      {
        id: crypto.randomUUID(),
        title: "Опрацювати наукову статтю",
        description: "Підготувати тези для теоретичної частини пояснювальної записки.",
        category: "Навчання",
        priority: "high",
        status: "planned",
        duration: 60,
        date: shiftDate(1),
        time: "09:30",
        completedAt: null,
      },
    ],
    habits: [
      {
        id: crypto.randomUUID(),
        title: "Ранкове планування",
        description: "Сформувати три головні цілі на день.",
        streak: 6,
        completedDates: [],
      },
      {
        id: crypto.randomUUID(),
        title: "Читання 20 хвилин",
        description: "Виділити час на професійну літературу.",
        streak: 4,
        completedDates: [],
      },
      {
        id: crypto.randomUUID(),
        title: "Фізична активність",
        description: "Коротке тренування або зарядка.",
        streak: 8,
        completedDates: [],
      },
    ],
  };
}

function loadUserState(email) {
  const users = loadUsers();
  const user = users.find((item) => item.email === email);
  return user ? structuredClone(user.state) : null;
}

function saveCurrentUserState() {
  if (!session || !appState) {
    return;
  }

  const users = loadUsers().map((user) =>
    user.email === session.email ? { ...user, state: appState } : user,
  );

  saveUsers(users);
}

function handleCreateTask(event) {
  event.preventDefault();

  if (!appState) {
    return;
  }

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const category = categoryInput.value;
  const priority = priorityInput.value;
  const status = statusInput.value;
  const duration = Number(durationInput.value);
  const date = dateInput.value;
  const time = timeInput.value;

  if (!title || !date || !time) {
    return;
  }

  appState.tasks.unshift({
    id: crypto.randomUUID(),
    title,
    description,
    category,
    priority,
    status,
    duration,
    date,
    time,
    completedAt: status === "done" ? getTodayDate() : null,
  });

  saveCurrentUserState();
  taskForm.reset();
  categoryInput.value = "Навчання";
  priorityInput.value = "medium";
  statusInput.value = "planned";
  durationInput.value = "60";
  dateInput.value = getTodayDate();
  timeInput.value = "09:00";
  renderApp();
}

function handleBoardClick(event) {
  if (!appState) {
    return;
  }

  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const taskId = button.dataset.id;
  const action = button.dataset.action;

  if (action === "delete") {
    appState.tasks = appState.tasks.filter((task) => task.id !== taskId);
  }

  if (action === "next") {
    appState.tasks = appState.tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      if (task.status === "planned") {
        return { ...task, status: "progress" };
      }

      if (task.status === "progress") {
        return { ...task, status: "done", completedAt: getTodayDate() };
      }

      return task;
    });
  }

  if (action === "reset") {
    appState.tasks = appState.tasks.map((task) =>
      task.id === taskId ? { ...task, status: "planned", completedAt: null } : task,
    );
  }

  saveCurrentUserState();
  renderApp();
}

function handleHabitClick(event) {
  if (!appState) {
    return;
  }

  const button = event.target.closest("button[data-habit-id]");

  if (!button) {
    return;
  }

  const today = getTodayDate();
  const habitId = button.dataset.habitId;

  appState.habits = appState.habits.map((habit) => {
    if (habit.id !== habitId) {
      return habit;
    }

    const completed = habit.completedDates.includes(today);

    if (completed) {
      return {
        ...habit,
        completedDates: habit.completedDates.filter((date) => date !== today),
        streak: Math.max(0, habit.streak - 1),
      };
    }

    return {
      ...habit,
      completedDates: [...habit.completedDates, today],
      streak: habit.streak + 1,
    };
  });

  saveCurrentUserState();
  renderHabits();
  renderStats();
}

function handleNotesInput() {
  if (!appState) {
    return;
  }

  appState.notes = notesInput.value;
  notesStatus.textContent = "Збереження...";
  saveCurrentUserState();

  window.clearTimeout(handleNotesInput.timer);
  handleNotesInput.timer = window.setTimeout(() => {
    notesStatus.textContent = "Збережено";
  }, 220);
}

function renderApp() {
  if (!appState || !session) {
    return;
  }

  profileName.textContent = session.name;
  profileEmail.textContent = session.email;
  todayLabel.textContent = formatDate(getTodayDate());
  renderViews();
  renderStats();
  renderBoard();
  renderTimeline();
  renderDeadlines();
  renderHabits();
  renderNotes();
  renderFocusCard();
}

function renderViews() {
  views.forEach((view) => {
    view.classList.toggle("view-active", view.dataset.view === appState.currentView);
  });

  viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewButton === appState.currentView);
  });
}

function renderStats() {
  const today = getTodayDate();
  const total = appState.tasks.length;
  const active = appState.tasks.filter((task) => task.status !== "done").length;
  const done = appState.tasks.filter((task) => task.status === "done").length;
  const doneToday = appState.tasks.filter((task) => task.completedAt === today).length;
  const todayItems = appState.tasks.filter((task) => task.date === today).length;
  const inProgress = appState.tasks.filter((task) => task.status === "progress").length;
  const highPriority = appState.tasks.filter((task) => task.priority === "high").length;
  const completion = total ? Math.round((done / total) * 100) : 0;
  const habitsDone = appState.habits.filter((habit) => habit.completedDates.includes(today)).length;
  const focus = Math.min(100, Math.round(completion * 0.7 + habitsDone * 9 + inProgress * 6));

  activeCount.textContent = String(active);
  doneTodayCount.textContent = String(doneToday);
  focusScore.textContent = `${focus}%`;
  completionRate.textContent = `${completion}%`;
  progressBar.style.width = `${completion}%`;
  progressText.textContent = total
    ? `Виконано ${done} із ${total} завдань. Активних позицій зараз ${active}.`
    : "Додайте перше завдання, щоб активувати аналітику.";

  totalTasks.textContent = String(total);
  todayTasks.textContent = String(todayItems);
  inProgressTasks.textContent = String(inProgress);
  highPriorityTasks.textContent = String(highPriority);
}

function renderFocusCard() {
  const topTask = [...appState.tasks]
    .filter((task) => task.status !== "done")
    .sort((firstTask, secondTask) => {
      const order = { high: 0, medium: 1, low: 2 };
      const gap = order[firstTask.priority] - order[secondTask.priority];

      if (gap !== 0) {
        return gap;
      }

      return `${firstTask.date}T${firstTask.time}`.localeCompare(
        `${secondTask.date}T${secondTask.time}`,
      );
    })[0];

  if (!topTask) {
    focusTask.textContent = "Усі завдання завершені";
    focusMeta.textContent = "Можна створити нову ціль або запланувати наступний день.";
    return;
  }

  focusTask.textContent = topTask.title;
  focusMeta.textContent = `${priorityLabels[topTask.priority]} пріоритет • ${formatDate(topTask.date)} о ${topTask.time}`;
}

function renderTimeline() {
  const todayTasksData = [...appState.tasks]
    .filter((task) => task.date === getTodayDate())
    .sort((firstTask, secondTask) =>
      `${firstTask.date}T${firstTask.time}`.localeCompare(`${secondTask.date}T${secondTask.time}`),
    );

  if (!todayTasksData.length) {
    timelineList.innerHTML = '<div class="empty-state">На сьогодні ще немає запланованих подій.</div>';
    return;
  }

  timelineList.innerHTML = todayTasksData
    .map(
      (task) => `
        <article class="item-card">
          <span class="status-pill ${task.status}">${statusLabels[task.status]}</span>
          <strong>${escapeHtml(task.title)}</strong>
          <p>${escapeHtml(task.description || "Опис не вказано.")}</p>
          <div class="task-meta">
            <span>${task.time}</span>
            <span>${task.duration} хв</span>
            <span>${escapeHtml(task.category)}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderDeadlines() {
  const items = [...appState.tasks]
    .filter((task) => task.status !== "done")
    .sort((firstTask, secondTask) =>
      `${firstTask.date}T${firstTask.time}`.localeCompare(`${secondTask.date}T${secondTask.time}`),
    )
    .slice(0, 4);

  if (!items.length) {
    deadlineList.innerHTML = '<div class="empty-state">Немає активних дедлайнів для відображення.</div>';
    return;
  }

  deadlineList.innerHTML = items
    .map(
      (task) => `
        <article class="item-card">
          <span class="status-chip ${task.priority}">${priorityLabels[task.priority]}</span>
          <strong>${escapeHtml(task.title)}</strong>
          <p>${formatDate(task.date)} о ${task.time}</p>
        </article>
      `,
    )
    .join("");
}

function renderBoard() {
  const query = searchInput.value.trim().toLowerCase();
  const statusFilterValue = filterStatus.value;
  const priorityFilterValue = filterPriority.value;

  const filteredTasks = appState.tasks.filter((task) => {
    const searchableText = [task.title, task.description, task.category].join(" ").toLowerCase();

    return (
      searchableText.includes(query) &&
      (statusFilterValue === "all" || task.status === statusFilterValue) &&
      (priorityFilterValue === "all" || task.priority === priorityFilterValue)
    );
  });

  const columns = [
    { key: "planned", title: "Заплановано" },
    { key: "progress", title: "У процесі" },
    { key: "done", title: "Виконано" },
  ];

  boardColumns.innerHTML = columns
    .map((column) => {
      const columnTasks = filteredTasks
        .filter((task) => task.status === column.key)
        .sort((firstTask, secondTask) =>
          `${firstTask.date}T${firstTask.time}`.localeCompare(`${secondTask.date}T${secondTask.time}`),
        );

      return `
        <section class="board-column">
          <div class="column-head">
            <h3>${column.title}</h3>
            <span>${columnTasks.length} шт.</span>
          </div>
          <div class="task-list">
            ${
              columnTasks.length
                ? columnTasks.map((task) => renderTaskCard(task)).join("")
                : '<div class="empty-state">Немає завдань у цій колонці.</div>'
            }
          </div>
        </section>
      `;
    })
    .join("");
}

function renderTaskCard(task) {
  return `
    <article class="task-card">
      <div class="task-header">
        <h3>${escapeHtml(task.title)}</h3>
        <div class="task-meta">
          <span class="status-chip ${task.priority}">${priorityLabels[task.priority]}</span>
          <span class="status-pill ${task.status}">${statusLabels[task.status]}</span>
        </div>
      </div>
      <p>${escapeHtml(task.description || "Опис завдання відсутній.")}</p>
      <div class="task-meta">
        <span>${escapeHtml(task.category)}</span>
        <span>${formatDate(task.date)} о ${task.time}</span>
        <span>${task.duration} хв</span>
      </div>
      <div class="task-footer">
        <div class="task-meta">
          <span>ID задачі</span>
        </div>
        <div class="task-meta">
          ${
            task.status === "done"
              ? `<button class="task-action" type="button" data-action="reset" data-id="${task.id}">Повернути</button>`
              : `<button class="task-action" type="button" data-action="next" data-id="${task.id}">${
                  task.status === "planned" ? "Взяти в роботу" : "Завершити"
                }</button>`
          }
          <button class="task-action delete" type="button" data-action="delete" data-id="${task.id}">Видалити</button>
        </div>
      </div>
    </article>
  `;
}

function renderHabits() {
  const today = getTodayDate();

  habitList.innerHTML = appState.habits
    .map((habit) => {
      const completed = habit.completedDates.includes(today);

      return `
        <article class="habit-card ${completed ? "done" : ""}">
          <div class="habit-top">
            <div>
              <strong>${escapeHtml(habit.title)}</strong>
              <p>${escapeHtml(habit.description)}</p>
            </div>
            <span class="status-chip neutral">${habit.streak} днів поспіль</span>
          </div>
          <button class="habit-action" type="button" data-habit-id="${habit.id}">
            ${completed ? "Скасувати відмітку за сьогодні" : "Позначити виконаною"}
          </button>
        </article>
      `;
    })
    .join("");
}

function renderNotes() {
  notesInput.value = appState.notes;
  notesStatus.textContent = "Збережено";
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
