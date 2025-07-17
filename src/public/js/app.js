// Kiro Calendar Assistant - Main App JavaScript

// App State
const state = {
    user: null,
    events: [],
    contacts: [],
    currentView: 'calendar',
    calendarView: 'month',
    currentDate: new Date(),
    selectedEvent: null,
    selectedContact: null,
    settings: {
        theme: localStorage.getItem('theme') || 'light',
        weekStart: parseInt(localStorage.getItem('weekStart') || '0'),
        timeFormat: localStorage.getItem('timeFormat') || '12',
        notifications: localStorage.getItem('notifications') === 'true',
        reminderTime: parseInt(localStorage.getItem('reminderTime') || '15')
    }
};

// API Configuration
const API_BASE_URL = window.location.origin + '/api';

// DOM Elements
let elements = {};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    initializeEventListeners();
    applyTheme();
    checkAuth();
    registerServiceWorker();
    
    // Fallback: show auth screen after 3 seconds if still loading
    setTimeout(() => {
        if (!elements.loadingScreen.classList.contains('hidden')) {
            console.warn('Loading timeout - showing auth screen');
            showAuthScreen();
        }
    }, 3000);
});

// Register Service Worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// Cache DOM Elements
function cacheElements() {
    elements = {
        // Containers
        loadingScreen: document.getElementById('loading-screen'),
        authContainer: document.getElementById('auth-container'),
        appContainer: document.getElementById('app-container'),
        
        // Auth Forms
        loginForm: document.getElementById('login-form'),
        signupForm: document.getElementById('signup-form'),
        showSignup: document.getElementById('show-signup'),
        showLogin: document.getElementById('show-login'),
        
        // Navigation
        navItems: document.querySelectorAll('.nav-item'),
        menuToggle: document.getElementById('menu-toggle'),
        desktopNav: document.querySelector('.desktop-nav'),
        
        // Natural Language
        nlForm: document.getElementById('nl-form'),
        nlInput: document.getElementById('nl-input'),
        nlSuggestions: document.getElementById('nl-suggestions'),
        
        // Views
        views: document.querySelectorAll('.view-container'),
        calendarView: document.getElementById('calendar-view'),
        contactsView: document.getElementById('contacts-view'),
        settingsView: document.getElementById('settings-view'),
        
        // Calendar
        currentMonth: document.getElementById('current-month'),
        prevMonth: document.getElementById('prev-month'),
        nextMonth: document.getElementById('next-month'),
        calendarGrid: document.getElementById('calendar-grid'),
        dayView: document.getElementById('day-view'),
        weekView: document.getElementById('week-view'),
        viewBtns: document.querySelectorAll('[data-calendar-view]'),
        
        // Contacts
        addContact: document.getElementById('add-contact'),
        contactSearch: document.getElementById('contact-search'),
        contactsList: document.getElementById('contacts-list'),
        
        // Settings
        themeToggle: document.getElementById('theme-toggle'),
        weekStart: document.getElementById('week-start'),
        timeFormat: document.getElementById('time-format'),
        connectGoogle: document.getElementById('connect-google'),
        disconnectGoogle: document.getElementById('disconnect-google'),
        googleStatus: document.getElementById('google-status'),
        syncCalendar: document.getElementById('sync-calendar'),
        syncContacts: document.getElementById('sync-contacts'),
        notificationsToggle: document.getElementById('notifications-toggle'),
        reminderTime: document.getElementById('reminder-time'),
        logoutBtn: document.getElementById('logout-btn'),
        
        // Modals
        eventModal: document.getElementById('event-modal'),
        eventForm: document.getElementById('event-form'),
        closeModal: document.getElementById('close-modal'),
        cancelEvent: document.getElementById('cancel-event'),
        
        contactModal: document.getElementById('contact-modal'),
        contactForm: document.getElementById('contact-form'),
        closeContactModal: document.getElementById('close-contact-modal'),
        cancelContact: document.getElementById('cancel-contact'),
        
        // Toast
        toastContainer: document.getElementById('toast-container')
    };
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Auth
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.signupForm.addEventListener('submit', handleSignup);
    elements.showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupForm();
    });
    elements.showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });
    
    // Mobile menu toggle - Show desktop nav on mobile when hamburger is clicked
    elements.menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const desktopNav = document.querySelector('.desktop-nav');
        desktopNav.classList.toggle('mobile-visible');
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        const desktopNav = document.querySelector('.desktop-nav');
        if (desktopNav.classList.contains('mobile-visible') && 
            !desktopNav.contains(e.target) && 
            !elements.menuToggle.contains(e.target)) {
            desktopNav.classList.remove('mobile-visible');
        }
    });
    
    // Natural Language
    elements.nlForm.addEventListener('submit', handleNaturalLanguageInput);
    elements.nlInput.addEventListener('input', handleNLInputChange);
    
    // Calendar Navigation
    elements.prevMonth.addEventListener('click', () => navigateMonth(-1));
    elements.nextMonth.addEventListener('click', () => navigateMonth(1));
    
    // Calendar View Toggle
    elements.viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-calendar-view');
            switchCalendarView(view);
        });
    });
    
    // Contacts
    elements.addContact.addEventListener('click', showAddContactModal);
    elements.contactSearch.addEventListener('input', handleContactSearch);
    
    // Settings
    elements.themeToggle.addEventListener('change', handleThemeToggle);
    elements.weekStart.addEventListener('change', handleWeekStartChange);
    elements.timeFormat.addEventListener('change', handleTimeFormatChange);
    elements.notificationsToggle.addEventListener('change', handleNotificationsToggle);
    elements.reminderTime.addEventListener('change', handleReminderTimeChange);
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    // Google Calendar Integration
    elements.connectGoogle.addEventListener('click', handleGoogleConnect);
    elements.disconnectGoogle.addEventListener('click', handleGoogleDisconnect);
    elements.syncCalendar.addEventListener('click', handleSyncCalendar);
    elements.syncContacts.addEventListener('click', handleSyncContacts);
    
    // Event Modal
    elements.eventForm.addEventListener('submit', handleEventSubmit);
    elements.closeModal.addEventListener('click', hideEventModal);
    elements.cancelEvent.addEventListener('click', hideEventModal);
    elements.eventModal.addEventListener('click', (e) => {
        if (e.target === elements.eventModal) hideEventModal();
    });
    
    // Contact Modal
    elements.contactForm.addEventListener('submit', handleContactSubmit);
    elements.closeContactModal.addEventListener('click', hideContactModal);
    elements.cancelContact.addEventListener('click', hideContactModal);
    elements.contactModal.addEventListener('click', (e) => {
        if (e.target === elements.contactModal) hideContactModal();
    });
    
    // Calendar Grid Click
    elements.calendarGrid.addEventListener('click', handleCalendarClick);
}

// Authentication Functions
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        showAuthScreen();
        return;
    }
    
    try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            state.user = data.user;
            showAppScreen();
            loadInitialData();
        } else {
            localStorage.removeItem('token');
            showAuthScreen();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        showAuthScreen();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            state.user = data.user;
            showAppScreen();
            loadInitialData();
            showToast('Welcome back!', 'success');
        } else {
            showToast(data.error || data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed. Please try again.', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            state.user = data.user;
            showAppScreen();
            loadInitialData();
            showToast('Welcome to Kiro!', 'success');
        } else {
            showToast(data.error || data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showToast('Signup failed. Please try again.', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    state.user = null;
    state.events = [];
    state.contacts = [];
    showAuthScreen();
    showToast('Logged out successfully', 'info');
}

// UI State Functions
function showAuthScreen() {
    elements.loadingScreen.classList.add('hidden');
    elements.authContainer.classList.remove('hidden');
    elements.appContainer.classList.add('hidden');
}

function showAppScreen() {
    elements.loadingScreen.classList.add('hidden');
    elements.authContainer.classList.add('hidden');
    elements.appContainer.classList.remove('hidden');
}

function showLoginForm() {
    elements.loginForm.classList.remove('hidden');
    elements.signupForm.classList.add('hidden');
}

function showSignupForm() {
    elements.loginForm.classList.add('hidden');
    elements.signupForm.classList.remove('hidden');
}

// Load Initial Data
async function loadInitialData() {
    try {
        await Promise.all([
            loadEvents(),
            loadContacts()
        ]);
        renderCalendar();
        renderContacts();
    } catch (error) {
        console.error('Failed to load initial data:', error);
        showToast('Failed to load data', 'error');
    }
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    });
    
    if (!response.ok && response.status === 401) {
        handleLogout();
        throw new Error('Unauthorized');
    }
    
    return response;
}

// Event Functions
async function loadEvents() {
    try {
        const response = await apiRequest('/calendar/events');
        const data = await response.json();
        state.events = data.events || [];
    } catch (error) {
        console.error('Failed to load events:', error);
    }
}

async function createEvent(eventData) {
    try {
        const response = await apiRequest('/calendar/events', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
        
        if (response.ok) {
            const data = await response.json();
            state.events.push(data.event);
            renderCalendar();
            showToast('Event created successfully', 'success');
            return data.event;
        }
    } catch (error) {
        console.error('Failed to create event:', error);
        showToast('Failed to create event', 'error');
    }
}

async function updateEvent(eventId, eventData) {
    try {
        const response = await apiRequest(`/calendar/events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(eventData)
        });
        
        if (response.ok) {
            const data = await response.json();
            const index = state.events.findIndex(e => e.id === eventId);
            if (index !== -1) {
                state.events[index] = data.event;
            }
            renderCalendar();
            showToast('Event updated successfully', 'success');
            return data.event;
        }
    } catch (error) {
        console.error('Failed to update event:', error);
        showToast('Failed to update event', 'error');
    }
}

async function deleteEvent(eventId) {
    try {
        const response = await apiRequest(`/calendar/events/${eventId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            state.events = state.events.filter(e => e.id !== eventId);
            renderCalendar();
            showToast('Event deleted successfully', 'success');
        }
    } catch (error) {
        console.error('Failed to delete event:', error);
        showToast('Failed to delete event', 'error');
    }
}

// Contact Functions
async function loadContacts() {
    try {
        const response = await apiRequest('/contacts');
        const data = await response.json();
        state.contacts = data.contacts || [];
    } catch (error) {
        console.error('Failed to load contacts:', error);
    }
}

async function createContact(contactData) {
    try {
        const response = await apiRequest('/contacts', {
            method: 'POST',
            body: JSON.stringify(contactData)
        });
        
        if (response.ok) {
            const data = await response.json();
            state.contacts.push(data.contact);
            renderContacts();
            showToast('Contact created successfully', 'success');
            return data.contact;
        }
    } catch (error) {
        console.error('Failed to create contact:', error);
        showToast('Failed to create contact', 'error');
    }
}

// Natural Language Processing
async function handleNaturalLanguageInput(e) {
    e.preventDefault();
    const input = elements.nlInput.value.trim();
    if (!input) return;
    
    try {
        const response = await apiRequest('/calendar/parse', {
            method: 'POST',
            body: JSON.stringify({ text: input })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.event) {
                await createEvent(data.event);
                elements.nlInput.value = '';
                showToast('Event created from your command', 'success');
            } else {
                showToast('Could not understand the command', 'error');
            }
        }
    } catch (error) {
        console.error('Natural language processing failed:', error);
        showToast('Failed to process command', 'error');
    }
}

function handleNLInputChange(e) {
    const value = e.target.value;
    if (value.length > 2) {
        // Show suggestions based on common patterns
        showNLSuggestions(value);
    } else {
        hideNLSuggestions();
    }
}

function showNLSuggestions(input) {
    const suggestions = [
        'Schedule meeting with [name] tomorrow at 2pm',
        'Lunch with [name] on Friday at 12:30',
        'Doctor appointment next Monday at 10am',
        'Team standup every weekday at 9am',
        'Birthday party on Saturday at 6pm'
    ];
    
    const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(input.toLowerCase())
    );
    
    if (filtered.length > 0) {
        elements.nlSuggestions.innerHTML = filtered
            .map(s => `<div class="suggestion-item" onclick="selectSuggestion('${s}')">${s}</div>`)
            .join('');
        elements.nlSuggestions.classList.remove('hidden');
    } else {
        hideNLSuggestions();
    }
}

function hideNLSuggestions() {
    elements.nlSuggestions.classList.add('hidden');
}

function selectSuggestion(suggestion) {
    elements.nlInput.value = suggestion;
    hideNLSuggestions();
    elements.nlInput.focus();
}

// View Management
function switchView(view) {
    state.currentView = view;
    
    // Update navigation
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === view);
    });
    
    // Update views
    elements.views.forEach(v => {
        v.classList.toggle('active', v.id === `${view}-view`);
        v.classList.toggle('hidden', v.id !== `${view}-view`);
    });
}

function switchCalendarView(view) {
    state.calendarView = view;
    
    // Update buttons
    elements.viewBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-calendar-view') === view);
    });
    
    // Update views
    elements.calendarGrid.classList.toggle('hidden', view !== 'month');
    elements.dayView.classList.toggle('hidden', view !== 'day');
    elements.weekView.classList.toggle('hidden', view !== 'week');
    
    // Render appropriate view
    switch (view) {
        case 'month':
            renderCalendar();
            break;
        case 'week':
            renderWeekView();
            break;
        case 'day':
            renderDayView();
            break;
    }
}

// Calendar Rendering
function renderCalendar() {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    
    // Update header
    elements.currentMonth.textContent = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric'
    }).format(state.currentDate);
    
    // Clear grid
    elements.calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const startDay = state.settings.weekStart;
    for (let i = 0; i < 7; i++) {
        const dayIndex = (startDay + i) % 7;
        const header = document.createElement('div');
        header.className = 'calendar-cell header';
        header.textContent = dayNames[dayIndex];
        elements.calendarGrid.appendChild(header);
    }
    
    // Get first day of month and days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Calculate start position
    const startOffset = (firstDay - startDay + 7) % 7;
    
    // Add previous month days
    for (let i = startOffset - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const cell = createCalendarCell(new Date(year, month - 1, day), true);
        elements.calendarGrid.appendChild(cell);
    }
    
    // Add current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === today.toDateString();
        const cell = createCalendarCell(date, false, isToday);
        elements.calendarGrid.appendChild(cell);
    }
    
    // Add next month days
    const totalCells = elements.calendarGrid.children.length - 7; // Minus headers
    const remainingCells = 35 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        const cell = createCalendarCell(new Date(year, month + 1, day), true);
        elements.calendarGrid.appendChild(cell);
    }
}

function createCalendarCell(date, isOtherMonth, isToday = false) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (isOtherMonth) cell.classList.add('other-month');
    if (isToday) cell.classList.add('today');
    
    cell.dataset.date = date.toISOString().split('T')[0];
    
    const dateDiv = document.createElement('div');
    dateDiv.className = 'calendar-date';
    dateDiv.textContent = date.getDate();
    cell.appendChild(dateDiv);
    
    // Add events
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length > 0) {
        cell.classList.add('has-events');
        
        const eventsDiv = document.createElement('div');
        eventsDiv.className = 'calendar-events';
        
        dayEvents.slice(0, 3).forEach(event => {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'calendar-event';
            eventDiv.textContent = formatEventTime(event) + ' ' + event.title;
            eventDiv.onclick = (e) => {
                e.stopPropagation();
                showEventDetails(event);
            };
            eventsDiv.appendChild(eventDiv);
        });
        
        if (dayEvents.length > 3) {
            const moreDiv = document.createElement('div');
            moreDiv.className = 'calendar-event';
            moreDiv.textContent = `+${dayEvents.length - 3} more`;
            eventsDiv.appendChild(moreDiv);
        }
        
        cell.appendChild(eventsDiv);
    }
    
    return cell;
}

function getEventsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return state.events.filter(event => {
        const eventDate = new Date(event.startTime).toISOString().split('T')[0];
        return eventDate === dateStr;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
}

function formatEventTime(event) {
    const date = new Date(event.startTime);
    const format = state.settings.timeFormat === '12' ? 'h:mm a' : 'HH:mm';
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: state.settings.timeFormat === '12'
    }).format(date);
}

function renderWeekView() {
    // Implement week view rendering
    elements.weekView.innerHTML = '<p>Week view coming soon...</p>';
}

function renderDayView() {
    // Implement day view rendering
    elements.dayView.innerHTML = '<p>Day view coming soon...</p>';
}

// Calendar Navigation
function navigateMonth(direction) {
    state.currentDate.setMonth(state.currentDate.getMonth() + direction);
    renderCalendar();
}

function handleCalendarClick(e) {
    const cell = e.target.closest('.calendar-cell');
    if (cell && !cell.classList.contains('header')) {
        const date = cell.dataset.date;
        if (date) {
            showAddEventModal(new Date(date));
        }
    }
}

// Event Modal Functions
function showAddEventModal(date = new Date()) {
    state.selectedEvent = null;
    elements.eventModal.classList.remove('hidden');
    document.getElementById('modal-title').textContent = 'New Event';
    
    // Set default values
    document.getElementById('event-date').value = date.toISOString().split('T')[0];
    document.getElementById('event-time').value = '';
    document.getElementById('event-title').value = '';
    document.getElementById('event-location').value = '';
    document.getElementById('event-description').value = '';
    document.getElementById('event-duration').value = '60';
    document.getElementById('event-reminder').value = '15';
    document.getElementById('event-attendees').value = '';
    document.getElementById('attendees-list').innerHTML = '';
}

function showEventDetails(event) {
    state.selectedEvent = event;
    elements.eventModal.classList.remove('hidden');
    document.getElementById('modal-title').textContent = 'Edit Event';
    
    // Populate form with event data
    const startDate = new Date(event.startTime);
    document.getElementById('event-date').value = startDate.toISOString().split('T')[0];
    document.getElementById('event-time').value = startDate.toTimeString().slice(0, 5);
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-location').value = event.location || '';
    document.getElementById('event-description').value = event.description || '';
    
    // Calculate duration
    if (event.endTime) {
        const duration = (new Date(event.endTime) - startDate) / 60000;
        document.getElementById('event-duration').value = duration.toString();
    }
    
    // Handle attendees
    if (event.attendees && event.attendees.length > 0) {
        renderAttendees(event.attendees);
    }
}

function hideEventModal() {
    elements.eventModal.classList.add('hidden');
    state.selectedEvent = null;
}

async function handleEventSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Build event data
    const date = formData.get('date');
    const time = formData.get('time') || '09:00';
    const startTime = new Date(`${date}T${time}`);
    
    const duration = parseInt(formData.get('duration'));
    let endTime;
    if (duration === 0) { // All day
        endTime = new Date(startTime);
        endTime.setHours(23, 59, 59);
    } else {
        endTime = new Date(startTime.getTime() + duration * 60000);
    }
    
    const eventData = {
        title: formData.get('title'),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: formData.get('location'),
        description: formData.get('description'),
        reminders: formData.get('reminder') !== 'none' ? [{
            minutes: parseInt(formData.get('reminder'))
        }] : []
    };
    
    if (state.selectedEvent) {
        await updateEvent(state.selectedEvent.id, eventData);
    } else {
        await createEvent(eventData);
    }
    
    hideEventModal();
}

function renderAttendees(attendees) {
    const container = document.getElementById('attendees-list');
    container.innerHTML = attendees.map(attendee => `
        <div class="attendee-chip">
            <span>${attendee.name || attendee.email}</span>
            <button class="attendee-remove" onclick="removeAttendee('${attendee.id}')">×</button>
        </div>
    `).join('');
}

// Contact Functions
function renderContacts() {
    const searchTerm = elements.contactSearch.value.toLowerCase();
    const filtered = state.contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
        (contact.company && contact.company.toLowerCase().includes(searchTerm))
    );
    
    elements.contactsList.innerHTML = filtered.map(contact => `
        <div class="contact-item" onclick="showContactDetails('${contact.id}')">
            <div class="contact-avatar">${getInitials(contact.name)}</div>
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-detail">${contact.email || contact.phone || 'No contact info'}</div>
            </div>
        </div>
    `).join('');
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function handleContactSearch() {
    renderContacts();
}

function showAddContactModal() {
    state.selectedContact = null;
    elements.contactModal.classList.remove('hidden');
    document.getElementById('contact-modal-title').textContent = 'New Contact';
    elements.contactForm.reset();
}

function showContactDetails(contactId) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    state.selectedContact = contact;
    elements.contactModal.classList.remove('hidden');
    document.getElementById('contact-modal-title').textContent = 'Edit Contact';
    
    // Populate form
    document.getElementById('contact-name').value = contact.name;
    document.getElementById('contact-email').value = contact.email || '';
    document.getElementById('contact-phone').value = contact.phone || '';
    document.getElementById('contact-company').value = contact.company || '';
    document.getElementById('contact-notes').value = contact.notes || '';
}

function hideContactModal() {
    elements.contactModal.classList.add('hidden');
    state.selectedContact = null;
}

async function handleContactSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        company: formData.get('company'),
        notes: formData.get('notes')
    };
    
    if (state.selectedContact) {
        // Update existing contact
        try {
            const response = await apiRequest(`/contacts/${state.selectedContact.id}`, {
                method: 'PUT',
                body: JSON.stringify(contactData)
            });
            
            if (response.ok) {
                const data = await response.json();
                const index = state.contacts.findIndex(c => c.id === state.selectedContact.id);
                if (index !== -1) {
                    state.contacts[index] = data.contact;
                }
                renderContacts();
                showToast('Contact updated successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to update contact:', error);
            showToast('Failed to update contact', 'error');
        }
    } else {
        await createContact(contactData);
    }
    
    hideContactModal();
}

// Settings Functions
function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
    elements.themeToggle.checked = state.settings.theme === 'dark';
}

function handleThemeToggle() {
    state.settings.theme = elements.themeToggle.checked ? 'dark' : 'light';
    localStorage.setItem('theme', state.settings.theme);
    applyTheme();
}

function handleWeekStartChange() {
    state.settings.weekStart = parseInt(elements.weekStart.value);
    localStorage.setItem('weekStart', state.settings.weekStart.toString());
    renderCalendar();
}

function handleTimeFormatChange() {
    state.settings.timeFormat = elements.timeFormat.value;
    localStorage.setItem('timeFormat', state.settings.timeFormat);
    renderCalendar();
}

function handleNotificationsToggle() {
    state.settings.notifications = elements.notificationsToggle.checked;
    localStorage.setItem('notifications', state.settings.notifications.toString());
    
    if (state.settings.notifications) {
        requestNotificationPermission();
    }
}

function handleReminderTimeChange() {
    state.settings.reminderTime = parseInt(elements.reminderTime.value);
    localStorage.setItem('reminderTime', state.settings.reminderTime.toString());
}

async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            elements.notificationsToggle.checked = false;
            state.settings.notifications = false;
            localStorage.setItem('notifications', 'false');
            showToast('Notifications permission denied', 'error');
        }
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Make functions available globally for inline handlers
window.selectSuggestion = selectSuggestion;
window.showContactDetails = showContactDetails;
window.removeAttendee = (attendeeId) => {
    console.log('Remove attendee:', attendeeId);
};
// Google Calendar Integration Functions
async function handleGoogleConnect() {
    try {
        showToast('Connecting to Google Calendar...', 'info');
        
        // Get Google authorization URL
        const response = await apiRequest('/auth/google');
        const data = await response.json();
        
        if (response.ok) {
            // Open Google OAuth in a new window
            window.open(data.authUrl, 'google-auth', 'width=500,height=600');
            
            // Listen for auth completion
            window.addEventListener('message', handleGoogleAuthComplete);
        } else {
            showToast(data.error || 'Failed to connect to Google', 'error');
        }
    } catch (error) {
        console.error('Google connect error:', error);
        showToast('Failed to connect to Google Calendar', 'error');
    }
}

async function handleGoogleAuthComplete(event) {
    if (event.origin \!== window.location.origin) return;
    
    if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        updateGoogleStatus('connected');
        showToast('Google Calendar connected successfully\!', 'success');
        
        // Enable sync buttons
        elements.syncCalendar.disabled = false;
        elements.syncContacts.disabled = false;
        
        // Remove event listener
        window.removeEventListener('message', handleGoogleAuthComplete);
    } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        showToast('Google Calendar connection failed', 'error');
        window.removeEventListener('message', handleGoogleAuthComplete);
    }
}

async function handleGoogleDisconnect() {
    try {
        const response = await apiRequest('/auth/google/disconnect', {
            method: 'POST'
        });
        
        if (response.ok) {
            updateGoogleStatus('disconnected');
            showToast('Google Calendar disconnected', 'info');
            
            // Disable sync buttons
            elements.syncCalendar.disabled = true;
            elements.syncContacts.disabled = true;
        } else {
            showToast('Failed to disconnect Google Calendar', 'error');
        }
    } catch (error) {
        console.error('Google disconnect error:', error);
        showToast('Failed to disconnect Google Calendar', 'error');
    }
}

async function handleSyncCalendar() {
    try {
        elements.syncCalendar.disabled = true;
        elements.syncCalendar.textContent = 'Syncing...';
        
        const response = await apiRequest('/auth/google/sync-calendar', {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            showToast(`Synced ${data.eventCount} events from Google Calendar`, 'success');
            
            // Reload events
            await loadEvents();
            renderCalendar();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to sync calendar', 'error');
        }
    } catch (error) {
        console.error('Sync calendar error:', error);
        showToast('Failed to sync calendar', 'error');
    } finally {
        elements.syncCalendar.disabled = false;
        elements.syncCalendar.textContent = 'Sync Calendar Events';
    }
}

async function handleSyncContacts() {
    try {
        elements.syncContacts.disabled = true;
        elements.syncContacts.textContent = 'Syncing...';
        
        const response = await apiRequest('/auth/google/sync-contacts', {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            showToast(`Imported ${data.contactCount} contacts from Google`, 'success');
            
            // Reload contacts
            await loadContacts();
            renderContacts();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to sync contacts', 'error');
        }
    } catch (error) {
        console.error('Sync contacts error:', error);
        showToast('Failed to sync contacts', 'error');
    } finally {
        elements.syncContacts.disabled = false;
        elements.syncContacts.textContent = 'Import Google Contacts';
    }
}

function updateGoogleStatus(status) {
    const statusElement = elements.googleStatus;
    const connectBtn = elements.connectGoogle;
    const disconnectBtn = elements.disconnectGoogle;
    
    if (status === 'connected') {
        statusElement.textContent = 'Connected';
        statusElement.className = 'status-text connected';
        connectBtn.classList.add('hidden');
        disconnectBtn.classList.remove('hidden');
    } else {
        statusElement.textContent = 'Not connected';
        statusElement.className = 'status-text';
        connectBtn.classList.remove('hidden');
        disconnectBtn.classList.add('hidden');
    }
}

EOF < /dev/null