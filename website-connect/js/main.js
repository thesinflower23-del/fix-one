/* ============================================
   BestBuddies Pet Grooming - Main Utilities
   ============================================ */

const STANDARD_TIME_SLOTS = ['9am-12pm', '12pm-3pm', '3pm-6pm']; // 3-hour intervals
const GROOMER_DAILY_LIMIT = 3; // Each groomer handles 3 bookings per day
const GROOMING_DURATION_HOURS = 3; // Duration is 3 hours
const WARNING_THRESHOLD = 3;
const WARNING_HARD_LIMIT = 5;
const CALENDAR_BLACKOUTS_KEY = 'calendarBlackouts';
const CUSTOMER_PROFILE_KEY = 'customerProfiles';
const BOOKING_FEE = 100;
const BAN_UPLIFT_FEE = 500;

const ADDON_PRICE_MAP = {
  toothbrush: {
    key: 'toothbrush',
    label: 'Toothbrush Add-on',
    price: 25
  },
  dematting: {
    key: 'dematting',
    label: 'De-matting Add-on',
    price: 80 // Starting rate; actual depends on coat condition
  }
};

const SINGLE_SERVICE_PRICING = {
  nail: {
    id: 'nail',
    label: 'Nail Trim',
    tiers: {
      small: 'Nail Trim 5kg & below',
      large: 'Nail Trim 30kg & above'
    }
  },
  ear: {
    id: 'ear',
    label: 'Ear Clean',
    tiers: {
      small: 'Ear Clean 5kg & below',
      large: 'Ear Clean 30kg & above'
    }
  },
  face: {
    id: 'face',
    label: 'Face Trim',
    price: 250,
    tiers: {
      flat: 'Face Trim - 250 pesos'
    }
  }
};

const PREMIUM_PACKAGES = [
  {
    id: 'full-basic',
    name: '✂️ Full Package · Basic',
    type: 'any',
    duration: 75,
    includes: [
      'Bath & Dry',
      'Brush / De-Shedding',
      'Hair Cut (Basic)',
      'Nail Trim',
      'Ear Clean',
      'Foot Pad Clean',
      'Cologne'
    ],
    tiers: [
      { label: '5kg & below', price: 530 },
      { label: '5.1 – 8kg', price: 630 },
      { label: '8.1 – 15kg', price: 750 },
      { label: '15.1 – 30kg', price: 800 },
      { label: '30kg & above', price: 920 }
    ]
  },
  {
    id: 'full-styled',
    name: '✂️ Full Package · Trimming & Styling',
    type: 'any',
    duration: 90,
    includes: [
      'Bath & Dry',
      'Brush / De-Shedding',
      'Hair Cut (Styled)',
      'Nail Trim',
      'Ear Clean',
      'Foot Pad Clean',
      'Cologne'
    ],
    tiers: [
      { label: '5kg & below', price: 630 },
      { label: '5.1 – 8kg', price: 730 },
      { label: '8.1 – 15kg', price: 880 },
      { label: '15.1 – 30kg', price: 930 },
      { label: '30kg & above', price: 1050 }
    ]
  },
  {
    id: 'bubble-bath',
    name: '🧴 Shampoo Bath ’n Bubble',
    type: 'any',
    duration: 60,
    includes: [
      'Bath & Dry',
      'Brush / De-Shedding',
      'Hygiene Trim',
      'Nail Trim',
      'Ear Clean',
      'Foot Pad Clean',
      'Cologne'
    ],
    tiers: [
      { label: '5kg & below', price: 350 },
      { label: '5.1 – 8kg', price: 450 },
      { label: '8.1 – 15kg', price: 550 },
      { label: '15.1 – 30kg', price: 600 },
      { label: '30kg & above', price: 700 }
    ]
  },
  {
    id: 'single-service',
    name: '🚿 Single Service · Mix & Match',
    type: 'any',
    duration: 45,
    includes: [
      'Choose from Nail Trim, Ear Clean, or Hygiene Focus',
      'Add to any package as needed'
    ],
    tiers: [
      { label: 'Nail Trim 5kg & below', price: 50 },
      { label: 'Nail Trim 30kg & above', price: 80 },
      { label: 'Ear Clean 5kg & below', price: 70 },
      { label: 'Ear Clean 30kg & above', price: 90 }
    ]
  },
  {
    id: 'addon-toothbrush',
    name: '🛁 Add-on · Toothbrush',
    type: 'addon',
    duration: 5,
    includes: ['Individual toothbrush to bring home'],
    tiers: [{ label: 'Per item', price: 25 }]
  },
  {
    id: 'addon-dematting',
    name: '🛁 Add-on · De-matting',
    type: 'addon',
    duration: 25,
    includes: ['Targeted de-matting service'],
    tiers: [
      { label: 'Light tangles', price: 80 },
      { label: 'Heavy tangles', price: 250 }
    ]
  }
];

const NAMED_GROOMERS = [
  { id: 'groomer-sam', name: 'Sam', specialty: 'Small breed specialist', email: 'sam@gmail.com' },
  { id: 'groomer-jom', name: 'Jom', specialty: 'Double-coat care', email: 'jom@gmail.com' },
  { id: 'groomer-botchoy', name: 'Botchoy', specialty: 'Creative trims & styling', email: 'botchoy@gmail.com' },
  { id: 'groomer-jinold', name: 'Jinold', specialty: 'Senior pet handler', email: 'jinold@gmail.com' },
  { id: 'groomer-ejay', name: 'Ejay', specialty: 'Cat whisperer', email: 'ejay@gmail.com' }
];

const DEFAULT_GROOMERS = NAMED_GROOMERS.map(({ id, name, specialty }) => ({
  id,
  name,
  specialty,
  maxDailyBookings: GROOMER_DAILY_LIMIT,
  reserve: false
}));

const DEFAULT_GROOMER_ACCOUNTS = NAMED_GROOMERS.map(({ id, name, email }) => ({
  name,
  email,
  groomerId: id
}));

window.STANDARD_TIME_SLOTS = STANDARD_TIME_SLOTS;

// Return a local YYYY-MM-DD string for a Date (avoids UTC shift from toISOString)
function toLocalISO(date) {
  if (!date) date = new Date();
  if (!(date instanceof Date)) date = new Date(date);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
window.toLocalISO = toLocalISO;

// Initialize default data on first load
// Fix 1: Make initializeData return a Promise
async function initializeData() {
  await ensurePackages();

  // Wait for current user (returns null if unauthenticated)
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    user = null;
  }

  if (user) {
    // Only run admin/groomer persistence when a real user is signed in
    await ensureDefaultAdmin();
    await ensureGroomerAccounts();
  } else {
    console.log('No authenticated user — skipping protected DB initialization.');
  }

  await migrateLegacyBookings();
  await ensureBookingShortCodes();
  return Promise.resolve();
}

function ensureCollection(key, fallback) {
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(fallback));
  }
}

async function ensurePackages() {
  try {
    let packages = await getPackages();
    if (typeof packages === 'function') {
      packages = PREMIUM_PACKAGES;
    }
    if (!Array.isArray(packages) || !packages.length || packages.some(pkg => !pkg.tiers)) {
      // Save default packages to localStorage/Firebase
      localStorage.setItem('packages', JSON.stringify(PREMIUM_PACKAGES));
    }
  } catch (error) {
    console.warn('Could not check packages:', error);
    localStorage.setItem('packages', JSON.stringify(PREMIUM_PACKAGES));
  }
}

async function ensureDefaultAdmin() {
  try {
    const users = await getUsers();
    let updated = false;
    if (!users.some(user => user.email === 'admin@gmail.com')) {
      users.push({
        id: 'admin-001',
        name: 'Admin User',
        email: 'admin@gmail.com',
        password: 'admin12345',
        role: 'admin',
        createdAt: Date.now(),
        warnings: 0
      });
      updated = true;
    }
    // Create permanent customer account
    if (!users.some(user => user.email === 'qwert@gmail.com')) {
      users.push({
        id: 'customer-perm-001',
        name: 'Customer Account',
        email: 'qwert@gmail.com',
        password: 'qwerty',
        role: 'customer',
        createdAt: Date.now(),
        warnings: 0
      });
      updated = true;
    }
    if (updated) {
      await saveUsers(users);
    }
  } catch (error) {
    console.warn('Could not ensure default admin:', error);
  }
}

async function ensureGroomerAccounts() {
  try {
    const users = await getUsers();
  let updated = false;
  DEFAULT_GROOMER_ACCOUNTS.forEach(account => {
    const legacyEmail = account.email.replace('@gmail.com', '@gmai.com');
    let existing = users.find(user => user.groomerId === account.groomerId);
    if (!existing) {
      existing = users.find(user => user.email === account.email);
    }
    if (!existing && legacyEmail !== account.email) {
      existing = users.find(user => user.email === legacyEmail);
    }

    if (existing) {
      if (existing.email !== account.email) {
        existing.email = account.email;
        updated = true;
      }
      if (existing.groomerId !== account.groomerId) {
        existing.groomerId = account.groomerId;
        updated = true;
      }
      if (existing.role !== 'groomer') {
        existing.role = 'groomer';
        updated = true;
      }
      return;
    }

    users.push({
      id: `${account.groomerId}-user`,
      name: account.name,
      email: account.email,
      password: 'qwerty',
      role: 'groomer',
      groomerId: account.groomerId,
      createdAt: Date.now(),
      warnings: 0
    });
    updated = true;
  });
  if (updated) {
    await saveUsers(users);
  }
  } catch (error) {
    console.warn('Could not ensure groomer accounts:', error);
  }
}

function ensureGroomerDirectory() {
  const stored = JSON.parse(localStorage.getItem('groomers') || 'null');
  if (!stored || !stored.length) {
    localStorage.setItem('groomers', JSON.stringify(DEFAULT_GROOMERS));
    return;
  }
  const merged = [...stored];
  DEFAULT_GROOMERS.forEach(defaultGroomer => {
    if (!merged.some(g => g.id === defaultGroomer.id)) {
      merged.push({ ...defaultGroomer });
    }
  });
  const normalized = merged.map(groomer => ({
    id: groomer.id || `groomer-${generateId()}`,
    name: groomer.name || 'On-duty Groomer',
    specialty: groomer.specialty || 'All-around stylist',
    reserve: !!groomer.reserve,
    maxDailyBookings: groomer.maxDailyBookings || GROOMER_DAILY_LIMIT,
    staffId: groomer.staffId || null
  }));
  localStorage.setItem('groomers', JSON.stringify(normalized));
}

async function migrateLegacyBookings() {
  const bookings = await getBookings();
  
  // Ensure bookings is an array
  if (!Array.isArray(bookings)) {
    console.warn('Bookings is not an array:', bookings);
    return;
  }
  
  const groomers = await getGroomers();
  let shouldSave = false;
  const cutExamples = ['Puppy Cut', 'Teddy Bear Cut', 'Lion Cut', 'Summer Cut', 'Kennel Cut', 'Show Cut'];
  let cutIndex = 0;
  
  bookings.forEach((booking, idx) => {
    if (!booking.groomerId) {
      const fallback = groomers[0] || DEFAULT_GROOMERS[0];
      booking.groomerId = fallback?.id;
      booking.groomerName = fallback?.name;
      shouldSave = true;
    }
    if (!booking.profile) {
      booking.profile = {
        ownerName: booking.customerName || '',
        contactNumber: booking.phone || '',
        address: '',
        breed: '',
        age: '',
        weight: '',
        medical: '',
        vaccinations: '',
        addOns: []
      };
      shouldSave = true;
    }
    if (typeof booking.beforeImage === 'undefined') {
      booking.beforeImage = '';
      booking.afterImage = '';
      shouldSave = true;
    }
    if (typeof booking.cancellationNote === 'undefined') {
      booking.cancellationNote = '';
      shouldSave = true;
    }
    if (typeof booking.customerNotes === 'undefined') {
      booking.customerNotes = '';
      shouldSave = true;
    }
    if (typeof booking.bookingNotes === 'undefined' || booking.bookingNotes === null) {
      booking.bookingNotes = '';
      shouldSave = true;
    }
    if (typeof booking.bookingNotes !== 'string') {
      booking.bookingNotes = String(booking.bookingNotes || '');
      shouldSave = true;
    }
    if (!booking.bookingNotes.trim() && idx < cutExamples.length) {
      booking.bookingNotes = cutExamples[idx];
      shouldSave = true;
    }
  });

  if (shouldSave) {
    await saveBookings(bookings);
  }
}

async function ensureBookingShortCodes() {
  const bookings = await getBookings();
  
  // Ensure bookings is an array
  if (!Array.isArray(bookings)) {
    console.warn('Bookings is not an array in ensureBookingShortCodes:', bookings);
    return;
  }
  
  let changed = false;
  bookings.forEach(booking => {
    if (!booking.shortId) {
      booking.shortId = generateBookingCode();
      changed = true;
    }
  });
  if (changed) {
    await saveBookings(bookings);
  }
}

// Get current user - uses Firebase if available, falls back to localStorage
async function getCurrentUser() {
  if (typeof window.getCurrentUser === 'function') {
    return await window.getCurrentUser();
  }
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

// Set current user in localStorage
function setCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

// Clear current user
function clearCurrentUser() {
  localStorage.removeItem('currentUser');
}

// Get all users - uses Firebase if available, falls back to localStorage
// Fix: Make getUsers async to handle Firebase
async function getUsers() {
    const stored = localStorage.getItem('users');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Error parsing users:', e);
            return [];
        }
    }
    return [];
}

// Save users - uses Firebase if available, falls back to localStorage
async function saveUsers(users) {
  if (typeof window.saveUsers === 'function') {
    return await window.saveUsers(users);
  }
  localStorage.setItem('users', JSON.stringify(users));
}

// Get all bookings - uses Firebase if available, falls back to localStorage
// Fix: Make getBookings async to handle Firebase
async function getBookings() {
    try {
        // Try Firebase first if available
        if (window.db && typeof window.db.collection === 'function') {
            const stored = localStorage.getItem('bookings');
            if (stored) {
                const parsed = JSON.parse(stored);
                return Array.isArray(parsed) ? parsed : [];
            }
            return [];
        }
    } catch (e) {
        console.warn('Firebase getBookings error:', e);
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem('bookings');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Error parsing bookings:', e);
            return [];
        }
    }
    return [];
}

// Get packages - uses Firebase if available, falls back to localStorage
function getPackages() {
    const stored = localStorage.getItem('packages');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : PREMIUM_PACKAGES;
        } catch (e) {
            console.error('Error parsing packages:', e);
            return PREMIUM_PACKAGES;
        }
    }
    return PREMIUM_PACKAGES;
}

// Fix 2: Replace getGroomers function (around line 495) - remove recursion
async function getGroomers() {
  const stored = localStorage.getItem('groomers');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : DEFAULT_GROOMERS;
    } catch (e) {
      console.error('Error parsing groomers:', e);
      return DEFAULT_GROOMERS;
    }
  }
  return DEFAULT_GROOMERS;
}

async function saveGroomers(groomers) {
  if (typeof window.saveGroomers === 'function') {
    return await window.saveGroomers(groomers);
  }
  localStorage.setItem('groomers', JSON.stringify(groomers));
  return Promise.resolve();
}

async function getGroomerById(groomerId) {
  const groomers = await getGroomers();
  return groomers.find(g => g.id === groomerId);
}

function getCustomerProfiles() {
  return JSON.parse(localStorage.getItem(CUSTOMER_PROFILE_KEY) || '{}');
}

function saveCustomerProfiles(profiles) {
  localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(profiles));
}

function getCustomerProfile(userId) {
  const profiles = getCustomerProfiles();
  return profiles[userId] || null;
}

function saveCustomerProfile(userId, profile) {
  const profiles = getCustomerProfiles();
  profiles[userId] = {
    ...profile,
    updatedAt: Date.now()
  };
  saveCustomerProfiles(profiles);
}

async function getCustomerWarningInfo(userId) {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return { warnings: 0, isBanned: false, banReason: '', warningHistory: [] };
    }
    return {
      warnings: user.warningCount || 0,
      isBanned: !!user.isBanned,
      banReason: user.banReason || '',
      warningHistory: user.warningHistory || []
    };
  } catch (error) {
    console.warn('Could not get customer warning info:', error);
    // Fallback to localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.id === userId);
    if (!user) {
      return { warnings: 0, isBanned: false, banReason: '', warningHistory: [] };
    }
    return {
      warnings: user.warningCount || 0,
      isBanned: !!user.isBanned,
      banReason: user.banReason || '',
      warningHistory: user.warningHistory || []
    };
  }
}

async function incrementCustomerWarning(userId, reason = 'No-show recorded') {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    user.warningCount = (user.warningCount || 0) + 1;
    if (!Array.isArray(user.warningHistory)) {
      user.warningHistory = [];
    }
    user.warningHistory.push({
      timestamp: Date.now(),
      reason
    });
    if (user.warningCount >= WARNING_HARD_LIMIT) {
      user.isBanned = true;
      user.banReason = reason;
      user.banInfoUpdatedAt = Date.now();
    }
    await saveUsers(users);
    await syncCurrentUser(userId);
    return await getCustomerWarningInfo(userId);
  } catch (error) {
    console.error('Error incrementing customer warning:', error);
    return { warnings: 0, isBanned: false, banReason: '', warningHistory: [] };
  }
}

async function banCustomer(userId, reason = 'Admin issued ban') {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
  user.isBanned = true;
  user.warningCount = Math.max(user.warningCount || WARNING_HARD_LIMIT, WARNING_HARD_LIMIT);
  user.banReason = reason;
  user.banInfoUpdatedAt = Date.now();
  if (!Array.isArray(user.warningHistory)) {
    user.warningHistory = [];
  }
  user.warningHistory.push({
    timestamp: Date.now(),
    reason,
    type: 'ban'
  });
    await saveUsers(users);
    await syncCurrentUser(userId);
    return await getCustomerWarningInfo(userId);
  } catch (error) {
    console.error('Error banning customer:', error);
    return { warnings: 0, isBanned: false, banReason: '', warningHistory: [] };
  }
}

async function liftCustomerBan(userId, options = {}) {
  try {
    const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  user.isBanned = false;
  user.banReason = '';
  const resetWarnings = options.resetWarnings !== false;
  if (resetWarnings) {
    user.warningCount = 0;
    if (!Array.isArray(user.warningHistory)) {
      user.warningHistory = [];
    }
    user.warningHistory.push({
      timestamp: Date.now(),
      reason: options.reason || 'Admin confirmed lift ban and reset warnings',
      type: 'reset'
    });
  } else {
    user.warningCount = Math.min(user.warningCount || 0, WARNING_THRESHOLD);
  }
    user.banInfoUpdatedAt = Date.now();
    await saveUsers(users);
    await syncCurrentUser(userId);
    return await getCustomerWarningInfo(userId);
  } catch (error) {
    console.error('Error lifting customer ban:', error);
    return { warnings: 0, isBanned: false, banReason: '', warningHistory: [] };
  }
}

async function syncCurrentUser(userId) {
  try {
    const current = await getCurrentUser();
    if (current && current.id === userId) {
      const users = await getUsers();
      const refreshed = users.find(u => u.id === userId);
      if (refreshed) {
        setCurrentUser(refreshed);
      }
    }
  } catch (error) {
    console.warn('Could not sync current user:', error);
  }
}

async function changePasswordForCurrentUser(currentPassword, newPassword) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Please log in again.' };
    }
    if (!currentPassword || !newPassword) {
      return { success: false, message: 'Fill in all password fields.' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }
    
    // Note: Firebase handles password changes, but we keep this for localStorage fallback
    // For Firebase, password changes should be done via Firebase Auth API
    const users = await getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index === -1) {
      return { success: false, message: 'Account not found.' };
    }

    // For Firebase users, password is managed by Firebase Auth
    // This is mainly for localStorage fallback
    if (users[index].password && users[index].password !== currentPassword) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    users[index] = {
      ...users[index],
      password: newPassword
    };
    await saveUsers(users);
    setCurrentUser(users[index]);

    return { success: true, message: 'Password updated successfully.' };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, message: 'Error updating password. Please try again.' };
  }
}

// Staff absences helpers
function getStaffAbsences() {
  return JSON.parse(localStorage.getItem('staffAbsences') || '[]');
}

function saveStaffAbsences(absences) {
  localStorage.setItem('staffAbsences', JSON.stringify(absences));
}

// Booking history helpers
function getBookingHistory() {
  return JSON.parse(localStorage.getItem('bookingHistory') || '[]');
}

function saveBookingHistory(history) {
  localStorage.setItem('bookingHistory', JSON.stringify(history));
}

function logBookingHistory(entry) {
  const history = getBookingHistory();
  history.push({
    id: 'hist-' + Date.now(),
    timestamp: Date.now(),
    ...entry
  });
  saveBookingHistory(history);
}

function getCalendarBlackouts() {
  return JSON.parse(localStorage.getItem(CALENDAR_BLACKOUTS_KEY) || '[]');
}

function saveCalendarBlackouts(blackouts) {
  localStorage.setItem(CALENDAR_BLACKOUTS_KEY, JSON.stringify(blackouts));
}

function getCalendarBlackout(date) {
  if (!date) return null;
  return getCalendarBlackouts().find(entry => entry.date === date) || null;
}

function isCalendarBlackout(date) {
  return !!getCalendarBlackout(date);
}

function addCalendarBlackout(date, reason = 'Closed') {
  if (!date) return;
  const blackouts = getCalendarBlackouts().filter(entry => entry.date !== date);
  blackouts.push({
    id: 'blackout-' + Date.now(),
    date,
    reason: reason || 'Closed',
    createdAt: Date.now()
  });
  saveCalendarBlackouts(blackouts);
}

function removeCalendarBlackout(date) {
  if (!date) return;
  const filtered = getCalendarBlackouts().filter(entry => entry.date !== date);
  saveCalendarBlackouts(filtered);
}

// Simple routing helper
function redirect(path) {
  window.location.href = path;
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Format time for display
function formatTime(timeString) {
  return timeString;
}

function formatCurrency(amount = 0) {
  const numericValue = Number(amount) || 0;
  return `₱${numericValue.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
}

function normalizeWeightLabel(value = '') {
  return value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[–—-]/g, '-')
    .replace(/kg/g, 'kg');
}

function getWeightCategory(weightLabel = '') {
  if (!weightLabel) return 'small';
  const normalized = normalizeWeightLabel(weightLabel);
  // Check for "5kg & below" or similar small weight indicators
  if (normalized.includes('5kg') && (normalized.includes('below') || normalized.includes('&'))) {
    return 'small';
  }
  // Check for "30kg & above" or similar large weight indicators
  if (normalized.includes('30kg') && (normalized.includes('above') || normalized.includes('&'))) {
    return 'large';
  }
  const numeric = parseFloat(weightLabel);
  if (Number.isNaN(numeric)) {
    return 'small';
  }
  return numeric >= 15 ? 'large' : 'small';
}

function getSingleServicePrice(serviceId, weightLabel) {
  const service = SINGLE_SERVICE_PRICING[serviceId];
  if (!service) {
    return {
      serviceId,
      label: 'Unknown service',
      price: 0,
      tierLabel: '',
      requiresWeight: true
    };
  }
  const hasWeight = !!weightLabel;
  const category = hasWeight ? getWeightCategory(weightLabel) : 'small';
  const tierLabel = service.tiers[category] || service.tiers.small;
  
  let price = 0;
  
  if (hasWeight && tierLabel) {
    // Define pricing directly to avoid localStorage dependency
    const SINGLE_SERVICE_TIERS = {
      'Nail Trim 5kg & below': 50,
      'Nail Trim 30kg & above': 80,
      'Ear Clean 5kg & below': 70,
      'Ear Clean 30kg & above': 90
    };
    
    // Try exact match first
    if (tierLabel in SINGLE_SERVICE_TIERS) {
      price = SINGLE_SERVICE_TIERS[tierLabel];
    } else {
      // Try normalized match
      const normalizedSearch = normalizeWeightLabel(tierLabel);
      for (const [key, value] of Object.entries(SINGLE_SERVICE_TIERS)) {
        if (normalizeWeightLabel(key) === normalizedSearch) {
          price = value;
          break;
        }
      }
      
      // Final fallback: check localStorage package data
      if (!price) {
        const packages = getPackages();
        const packageData = packages.find(pkg => pkg.id === 'single-service');
        if (packageData?.tiers) {
          const matchingTier = packageData.tiers.find(t => t.label === tierLabel);
          if (matchingTier) {
            price = matchingTier.price;
          } else {
            const fallbackTier = packageData.tiers.find(t => normalizeWeightLabel(t.label) === normalizedSearch);
            price = fallbackTier?.price || 0;
          }
        }
      }
    }
  }
  
  return {
    serviceId,
    label: service.label,
    price: hasWeight ? price : 0,
    tierLabel,
    category,
    requiresWeight: !hasWeight
  };
}

// Provide a saveBookings wrapper so other code can call it regardless of Firebase availability
async function saveBookings(bookings) {
    // If firebase-db.js exposes a saveBookings function on window, use it
    if (typeof window.saveBookings === 'function') {
        return await window.saveBookings(bookings);
    }
    // Fallback to localStorage for development/testing
    try {
        localStorage.setItem('bookings', JSON.stringify(bookings));
        return Promise.resolve();
    } catch (err) {
        console.error('saveBookings error:', err);
        throw err;
    }
}

// Defensive computeBookingCost: ensure packages is an array and handle missing weight label
async function computeBookingCost(packageId, petWeight, addOns, singleServices) {
  // Ensure packages variable (or global PACKAGES) is resolved if it's a Promise
  let packagesData = (typeof PACKAGES !== 'undefined') ? PACKAGES : (typeof packages !== 'undefined' ? packages : null);
  if (packagesData && typeof packagesData.then === 'function') {
    try {
      packagesData = await packagesData;
    } catch (e) {
      console.warn('Failed to resolve packages promise', e);
      packagesData = [];
    }
  }
  if (!Array.isArray(packagesData)) {
    console.warn('Packages is not an array:', packagesData);
    packagesData = [];
  }

  // Replace any use of PACKAGES or packages with packagesData below.
  // Example minimal fallback behavior when definitions are missing:
  const pkg = packagesData.find(p => p.id === packageId) || null;
  // Sample return object to avoid exceptions; adapt to your real logic
  if (!pkg) {
    return {
      subtotal: 0,
      bookingFee: 0,
      totalAmount: 0,
      addOns: []
    };
  }

  // If you have a full implementation below, keep it and just ensure it uses packagesData.
  // ...existing code...
}

function computeBookingCost(packageId, weight, addOns, singleServices) {
  // guard: if packages list is still a Promise, avoid crashing
  if (window.packagesList && typeof window.packagesList.then === 'function') {
    console.warn('computeBookingCost: packages still pending — awaiting or skipping expensive calc');
    // either return a sensible default or ensure callers awaited loading
    return { subtotal: 0, totalAmount: 0 };
  }
  const packages = Array.isArray(window.packagesList) ? window.packagesList : [];
  // ...existing cost logic...
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Generate unique ID
function generateId() {
  const now = new Date();
  const dateStr = toLocalISO(now);
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${dateStr}_${timeStr}`;
}

function generateBookingCode() {
  const random = Math.random().toString(36).slice(-5).toUpperCase();
  const stamp = Date.now().toString().slice(-4);
  return `BB-${random}${stamp}`;
}

function getBookingDisplayCode(booking) {
  if (!booking) return '';
  return booking.shortId || booking.id;
}

async function getPublicReviewEntries(limit = 8) {
  // Fetch fresh bookings from Firebase (not localStorage) to get latest uploaded images
  let bookings = [];
  try {
    if (typeof getBookings === 'function') {
      bookings = await getBookings();
    }
  } catch (e) {
    console.warn('Failed to fetch bookings from Firebase, falling back to localStorage:', e);
    bookings = localStorage.getItem('bookings') 
      ? JSON.parse(localStorage.getItem('bookings'))
      : [];
  }
  
  if (!Array.isArray(bookings)) {
    return [];
  }
  
  const entries = bookings
    .filter(booking => booking.beforeImage && booking.afterImage)
    .map(booking => {
      // Build service description from package and single services
      let serviceDescription = booking.packageName || 'Custom Service';
      if (booking.packageId === 'single-service' && booking.singleServices?.length) {
        const services = booking.singleServices.map(id => SINGLE_SERVICE_PRICING?.[id]?.label || id).join(', ');
        serviceDescription = `Single Services: ${services}`;
      }
      
      return {
        id: booking.id,
        shortId: getBookingDisplayCode(booking),
        petName: booking.petName,
        packageName: booking.packageName,
        serviceDescription: serviceDescription,
        bookingNotes: booking.bookingNotes || '',
        groomingNotes: booking.groomingNotes || '',
        review: booking.review || '',
        rating: booking.rating || 0,
        beforeImage: booking.beforeImage,
        afterImage: booking.afterImage,
        date: booking.date,
        customerName: booking.customerName || 'Customer',
        groomerName: booking.groomerName || 'Professional Groomer'
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.date || a.id);
      const dateB = new Date(b.date || b.id);
      return dateB - dateA;
    });
  return entries.slice(0, limit);
}

async function renderCommunityReviewFeed(targetId = 'adminReviewFeed', limit = 6) {
  const container = document.getElementById(targetId);
  if (!container || typeof getPublicReviewEntries !== 'function') return;
  const entries = await getPublicReviewEntries(limit);
  if (!entries.length) {
    container.innerHTML = '<p class="empty-state" style="margin:0;">No shared galleries yet.</p>';
    return;
  }
  container.innerHTML = entries.map(entry => `
    <article class="review-card">
      <div class="review-card-gallery" onclick="openGalleryZoom('${entry.beforeImage}', '${entry.afterImage}', '${escapeHtml(entry.petName)}');" style="cursor: pointer;">
        <img src="${entry.beforeImage}" alt="Before ${escapeHtml(entry.petName)}">
        <img src="${entry.afterImage}" alt="After ${escapeHtml(entry.petName)}">
      </div>
      <div class="review-card-content">
        <h4 style="margin-bottom:0.35rem;">${escapeHtml(entry.petName)}</h4>
        <p style="font-size:0.85rem; color:var(--gray-600); margin-bottom:0.5rem;">
          ${formatDate(entry.date)} · <strong style="color: #000; font-weight: 700;">${escapeHtml(entry.packageName || 'Custom package')}</strong>
        </p>
        ${(() => {
          const notesText = entry.bookingNotes || '';
          if (!notesText || !notesText.trim()) return '';
          const extractPreferredCut = window.extractPreferredCut || function(notes) {
            if (!notes || typeof notes !== 'string') return null;
            const cutNames = ['Puppy Cut', 'Teddy Bear Cut', 'Lion Cut', 'Summer Cut', 'Kennel Cut', 'Show Cut'];
            const notesLower = notes.toLowerCase().trim();
            for (let cut of cutNames) {
              if (notesLower.includes(cut.toLowerCase())) return cut;
            }
            return null;
          };
          const preferredCut = extractPreferredCut(notesText);
          if (preferredCut) {
            return `<p style="font-size:0.85rem; background: #e8f5e9; padding: 0.5rem; border-left: 3px solid #2e7d32; margin: 0.5rem 0; font-weight: 500;"><strong>✂️ Preferred Cut:</strong> <span style="font-weight: 700; color: #2e7d32;">${escapeHtml(preferredCut)}</span>${notesText.trim() !== preferredCut ? ` · ${escapeHtml(notesText)}` : ''}</p>`;
          } else {
            return `<p style="font-size:0.85rem; background: #fff9e6; padding: 0.5rem; border-left: 3px solid #f57c00; margin: 0.5rem 0; font-weight: 500;"><strong>✂️ Notes:</strong> ${escapeHtml(notesText)}</p>`;
          }
        })()}
        ${entry.groomingNotes ? `<p style="font-size:0.85rem; background: #f0f9f0; padding: 0.5rem; border-left: 3px solid #4CAF50; margin: 0.5rem 0; font-weight: 500;"><strong>✂️ Service:</strong> ${escapeHtml(entry.groomingNotes)}</p>` : ''}
        <p style="font-size:0.9rem; color:var(--gray-700);">
          ${entry.review ? `"${escapeHtml(entry.review)}"` : 'Fresh from the grooming table!'}
        </p>
        <div class="review-card-meta">
          <div>Code ${escapeHtml(entry.shortId)} · ${escapeHtml(entry.customerName)}</div>
          <div style="margin-top: 0.5rem; font-size: 0.85rem; background: #f0f0f0; padding: 0.5rem; border-radius: 0.25rem; font-weight: 600; color: #000;">✂️ Groomed by ${escapeHtml(entry.groomerName)}</div>
        </div>
      </div>
    </article>
  `).join('');
}

// Gallery Zoom Modal
function openGalleryZoom(beforeImage, afterImage, petName) {
  const modal = document.createElement('div');
  modal.id = 'galleryZoomModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    cursor: pointer;
  `;
  
  modal.innerHTML = `
    <div style="position: relative; width: 90%; max-width: 1000px; display: flex; gap: 1rem; align-items: center;">
      <button onclick="document.getElementById('galleryZoomModal').remove();" style="position: absolute; top: -40px; right: 0; background: #000; border: 2px solid #fff; font-size: 2rem; cursor: pointer; color: #fff; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">×</button>
      
      <div style="flex: 1; text-align: center;">
        <h3 style="color: #fff; margin-bottom: 1rem;">Before</h3>
        <img src="${beforeImage}" alt="Before ${escapeHtml(petName)}" style="width: 100%; height: auto; border-radius: 0.5rem; max-height: 500px; object-fit: contain;">
      </div>
      
      <div style="flex: 1; text-align: center;">
        <h3 style="color: #fff; margin-bottom: 1rem;">After</h3>
        <img src="${afterImage}" alt="After ${escapeHtml(petName)}" style="width: 100%; height: auto; border-radius: 0.5rem; max-height: 500px; object-fit: contain;">
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  document.body.appendChild(modal);
}

// Check if date is in the past
function isPastDate(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

// Get minimum date (today)
function getMinDate() {
  const today = new Date();
  return toLocalISO(today);
}

// Validate phone number
function validatePhoneNumber(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/\s/g, '');
  return /^(\+63|0)[0-9]{10}$/.test(cleaned);
}

// Mega calendar renderer shared across dashboards
function renderMegaCalendar(containerId, dataset = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const state = container.__calendarState || { monthOffset: 0 };
  container.__calendarState = state;
  state.dataset = dataset;

  const baseDate = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const displayDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + state.monthOffset, 1);
  const monthName = displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
  const lastDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
  const startWeekday = firstDayOfMonth.getDay(); // 0-6

  const days = [];
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
    const iso = toLocalISO(date);
    days.push({
      day,
      iso,
      stats: dataset[iso] || { bookings: 0, absences: 0 }
    });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  container.innerHTML = `
    <div class="mega-calendar">
      <div class="calendar-header">
        <button class="calendar-nav" data-cal-action="prev">←</button>
        <h3>${monthName}</h3>
        <button class="calendar-nav" data-cal-action="next">→</button>
      </div>
      <div class="calendar-grid calendar-grid-head">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="calendar-cell head">${d}</div>`).join('')}
      </div>
      <div class="calendar-grid calendar-grid-body">
        ${weeks.map(week => week.map(day => {
          if (!day) {
            return '<div class="calendar-cell empty"></div>';
          }
          // Note: getDayCapacityStatus is async, but we use pre-computed stats here
          // If stats are missing, we'll use default values
          const statsSnapshot = day.stats && Object.keys(day.stats).length
            ? day.stats
            : { bookings: 0, absences: 0, capacityStatus: 'green', remaining: 0, capacity: 0 };
          const { bookings = 0, absences = 0, capacityStatus = 'green', remaining = 0, capacity = 0, blackout = null } = statsSnapshot || {};
          const hasEvents = bookings > 0 || absences > 0;
          const dateObj = new Date(day.iso);
          dateObj.setHours(0, 0, 0, 0);
          const isPast = dateObj < today;
          const statusClass = `status-${capacityStatus}`;
          const slotsText = capacityStatus === 'blackout'
            ? 'Closed'
            : isPast
              ? 'Not available'
              : remaining > 0
                ? `${remaining} slots left`
                : 'Fully booked';
          const bookedText = bookings > 0 ? `${bookings} booked` : '';
          return `
            <div class="calendar-cell day ${statusClass} ${hasEvents ? 'has-events' : ''} ${isPast ? 'past' : ''}" ${capacityStatus === 'blackout' ? 'style="background-color: var(--gray-300); color: var(--gray-500);"' : ''}>
              <span class="day-number">${day.day}</span>
              ${capacityStatus !== 'blackout' ? `<div class="capacity-pill" style="font-size: 0.7rem; margin-top: 0.25rem; font-weight: 600;">${slotsText}</div>` : ''}
              ${bookedText && capacityStatus !== 'blackout' && !isPast ? `<div style="font-size: 0.65rem; color: var(--gray-600); margin-top: 0.15rem;">${bookedText}</div>` : ''}
              ${hasEvents ? `
                <div class="event-dots" style="margin-top: 0.25rem;">
                  ${bookings ? `<span class="event-dot bookings" style="font-size: 0.65rem; padding: 0.15rem 0.35rem;">${bookings}</span>` : ''}
                  ${absences ? `<span class="event-dot absences" style="font-size: 0.65rem; padding: 0.15rem 0.35rem;">${absences}</span>` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')).join('')}
      </div>
      <div class="calendar-legend">
        <div class="legend-chip status-green">Open</div>
        <div class="legend-chip status-yellow">Filling fast</div>
        <div class="legend-chip status-red">Fully booked</div>
        <div class="legend-chip status-blackout">Closed</div>
      </div>
    </div>
  `;

  const prevBtn = container.querySelector('[data-cal-action="prev"]');
  const nextBtn = container.querySelector('[data-cal-action="next"]');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      state.monthOffset -= 1;
      renderMegaCalendar(containerId, state.dataset);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      state.monthOffset += 1;
      renderMegaCalendar(containerId, state.dataset);
    });
  }
}

function buildCalendarDataset(bookings = null, absences = null) {
  // If not provided, fetch from database
  if (bookings === null) bookings = getBookings();
  if (absences === null) absences = getStaffAbsences();
  const dataset = {};
  const relevantStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'];
  const activeBookings = bookings.filter(b => !relevantStatuses.includes(b.status));
  const activeAbsences = absences.filter(absence => !['rejected', 'cancelledByStaff'].includes(absence.status));

  // Get all dates from today onwards (for current month view)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 2); // Show 2 months ahead

  // Initialize all dates with default status
  for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
    const iso = toLocalISO(d);
    const dayBookings = activeBookings.filter(b => b.date === iso);
    const dayAbsences = activeAbsences.filter(a => a.date === iso);
    const blackout = getCalendarBlackout(iso);
    if (blackout) {
      dataset[iso] = {
        bookings: dayBookings.length,
        absences: dayAbsences.length,
        remaining: 0,
        capacity: 0,
        capacityStatus: 'blackout',
        blackout
      };
    } else {
      // getDayCapacityStatus is async, but we need to compute synchronously here
      // Use a simplified calculation for calendar display
      const groomers = getGroomers();
      const totalGroomers = groomers.length || DEFAULT_GROOMERS.length;
      const availableGroomers = Math.max(totalGroomers - dayAbsences.length, 1);
      const capacity = availableGroomers * GROOMER_DAILY_LIMIT;
      const remaining = Math.max(capacity - dayBookings.length, 0);
      let capacityStatus = 'green';
      if (dayBookings.length === 0) {
        capacityStatus = 'green';
      } else if (remaining >= capacity * 0.5) {
        capacityStatus = 'green';
      } else if (remaining > 0) {
        capacityStatus = 'yellow';
      } else {
        capacityStatus = 'red';
      }
      dataset[iso] = {
        bookings: dayBookings.length,
        absences: dayAbsences.length,
        availableGroomers,
        capacity,
        remaining,
        capacityStatus
      };
    }
  }

  return dataset;
}

function getDayCapacityStatus(date, bookingCount = 0, absenceCount = 0) {
  const blackout = getCalendarBlackout(date);
  if (blackout) {
    return {
      availableGroomers: 0,
      capacity: 0,
      remaining: 0,
      capacityStatus: 'blackout',
      blackout
    };
  }
  const groomers = getGroomers();
  const totalGroomers = groomers.length || DEFAULT_GROOMERS.length;
  const availableGroomers = Math.max(totalGroomers - absenceCount, 1);
  const capacity = availableGroomers * GROOMER_DAILY_LIMIT;
  const remaining = Math.max(capacity - bookingCount, 0);
  let capacityStatus = 'green';
  if (bookingCount === 0) {
    capacityStatus = 'green';
  } else if (remaining >= capacity * 0.5) {
    capacityStatus = 'green'; // More than 50% available
  } else if (remaining > 0) {
    capacityStatus = 'yellow'; // Less than 50% but still available
  } else {
    capacityStatus = 'red'; // Fully booked
  }
  return { availableGroomers, capacity, remaining, capacityStatus };
}

function isGroomerAbsent(groomerId, date) {
  if (!groomerId || !date) return false;
  if (isCalendarBlackout(date)) return true;
  return getStaffAbsences().some(absence =>
    absence.groomerId === groomerId &&
    absence.date === date &&
    !['rejected', 'cancelledByStaff'].includes(absence.status)
  );
}

async function getActiveGroomers(date) {
  const groomers = await getGroomers();
  return groomers.filter(groomer => !isGroomerAbsent(groomer.id, date));
}

async function groomerHasCapacity(groomerId, date) {
  if (!groomerId || !date) return false;
  if (isGroomerAbsent(groomerId, date)) return false;
  const groomer = await getGroomerById(groomerId);
  const limit = groomer?.maxDailyBookings || GROOMER_DAILY_LIMIT;
  const bookings = await getBookings();
  const groomerBookings = bookings.filter(booking =>
    booking.groomerId === groomerId &&
    booking.date === date &&
    !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(booking.status)
  );
  return groomerBookings.length < limit;
}

async function groomerSlotAvailable(groomerId, date, time) {
  if (!groomerId || !date || !time) return false;
  if (isCalendarBlackout(date)) return false;
  const bookings = await getBookings();
  return !bookings.some(booking =>
    booking.groomerId === groomerId &&
    booking.date === date &&
    booking.time === time &&
    !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(booking.status)
  );
}

async function getAvailableGroomers(date) {
  if (!date || isCalendarBlackout(date)) return [];
  const activeGroomers = await getActiveGroomers(date);
  const availableGroomers = [];
  for (const groomer of activeGroomers) {
    if (await groomerHasCapacity(groomer.id, date)) {
      availableGroomers.push(groomer);
    }
  }
  return availableGroomers;
}

function getGroomerDailyLoad(groomerId, date) {
  if (!groomerId || !date) return 0;
  const bookings = getBookings();
  return bookings.filter(booking =>
    booking.groomerId === groomerId &&
    booking.date === date &&
    !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(booking.status)
  ).length;
}

function linkStaffToGroomer(user) {
  if (!user) return null;
  if (user.groomerId) return user.groomerId;
  const groomers = getGroomers();
  let assigned = groomers.find(g => g.staffId === user.id);
  if (!assigned) {
    assigned = groomers.find(g => !g.staffId) || groomers[0];
    if (assigned) {
      assigned.staffId = user.id;
      saveGroomers(groomers);
    }
  }
  if (assigned) {
    user.groomerId = assigned.id;
    const users = getUsers();
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, groomerId: assigned.id } : u);
    saveUsers(updatedUsers);
    syncCurrentUser(user.id);
    return assigned.id;
  }
  return null;
}

// Initialize on page load
// Initialization is handled after auth state is determined below.
// Removed the immediate DOMContentLoaded call to avoid racing with Firebase Auth.
console.log('Initialization deferred until auth state is resolved');

// Ensure initializeData runs after auth is resolved and redirect user to dashboard on login
(async function setupAuthInit() {
  if (typeof onAuthStateChanged === 'function') {
    let seen = false;
    onAuthStateChanged(async (user) => {
      try {
        await initializeData();
      } catch (e) {
        console.warn('initializeData after auth failed', e);
      }
      // On first authenticated arrival, redirect to dashboard if on login/booking pages
      if (user && !seen) {
        seen = true;
        const p = window.location.pathname.toLowerCase();
        if (p.endsWith('login.html') || p.endsWith('booking.html') || p.endsWith('booking-success.html')) {
          window.location.href = 'customer-dashboard.html';
        }
      }
    });
  } else {
    // Fallback when no auth helper is available
    initializeData().catch(e => console.warn('initializeData failed', e));
  }
})();

window.getGroomers = getGroomers;
window.getGroomerById = getGroomerById;
window.getAvailableGroomers = getAvailableGroomers;
window.groomerHasCapacity = groomerHasCapacity;
window.groomerSlotAvailable = groomerSlotAvailable;
window.getGroomerDailyLoad = getGroomerDailyLoad;
window.linkStaffToGroomer = linkStaffToGroomer;
window.validatePhoneNumber = validatePhoneNumber;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.escapeHtml = escapeHtml;
window.formatCurrency = formatCurrency;
window.computeBookingCost = computeBookingCost;
window.getSingleServicePrice = getSingleServicePrice;
window.SINGLE_SERVICE_PRICING = SINGLE_SERVICE_PRICING;
window.changePasswordForCurrentUser = changePasswordForCurrentUser;
window.BOOKING_FEE = BOOKING_FEE;
window.renderCommunityReviewFeed = renderCommunityReviewFeed;
window.openGalleryZoom = openGalleryZoom;

// Mobile drawer functionality
function initMobileDrawer() {
  const menuToggle = document.querySelector('.menu-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const overlay = document.querySelector('.mobile-drawer-overlay');
  const drawerClose = document.querySelector('.mobile-drawer-close');
  
  if (!menuToggle || !drawer || !overlay) return;
  
  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  menuToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  
  // Close drawer when clicking a link
  const drawerLinks = drawer.querySelectorAll('a');
  drawerLinks.forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(closeDrawer, 100);
    });
  });
}

// Initialize drawer on page load
document.addEventListener('DOMContentLoaded', function() {
  initMobileDrawer();
});
window.getCustomerProfile = getCustomerProfile;
window.saveCustomerProfile = saveCustomerProfile;
window.getCustomerWarningInfo = getCustomerWarningInfo;
window.incrementCustomerWarning = incrementCustomerWarning;
window.banCustomer = banCustomer;
window.liftCustomerBan = liftCustomerBan;
window.getCalendarBlackouts = getCalendarBlackouts;
window.addCalendarBlackout = addCalendarBlackout;
window.removeCalendarBlackout = removeCalendarBlackout;
window.isCalendarBlackout = isCalendarBlackout;
window.getCalendarBlackout = getCalendarBlackout;
window.getPublicReviewEntries = getPublicReviewEntries;
window.getBookingDisplayCode = getBookingDisplayCode;
window.generateBookingCode = generateBookingCode;
window.getStaffAbsences = getStaffAbsences;

/* ============================================
   Lightbox Functionality (Global)
   ============================================ */

function initLightbox() {
  const lightboxLinks = document.querySelectorAll('.lightbox-link');
  const lightbox = document.getElementById('lightbox');
  
  if (!lightbox) return;

  lightboxLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const imageSrc = this.getAttribute('href');
      openLightbox(imageSrc);
    });
  });

  // Close lightbox when clicking background
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  // Close lightbox with escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeLightbox();
    }
  });
}

function openLightbox(imageSrc) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  
  if (!lightbox || !lightboxImage) return;
  
  lightboxImage.src = imageSrc;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  
  if (!lightbox) return;
  
  lightbox.classList.remove('active');
  document.body.style.overflow = 'auto';
}

window.initLightbox = initLightbox;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

// Initialize lightbox on DOM ready
document.addEventListener('DOMContentLoaded', initLightbox);

// Fallback synchronous getters used by UI code that expects immediate arrays
function getBookingsSync() {
  const stored = localStorage.getItem('bookings');
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('getBookingsSync parse error:', e);
    return [];
  }
}

function getGroomersSync() {
  const stored = localStorage.getItem('groomers');
  if (!stored) return DEFAULT_GROOMERS.slice();
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : DEFAULT_GROOMERS.slice();
  } catch (e) {
    console.error('getGroomersSync parse error:', e);
    return DEFAULT_GROOMERS.slice();
  }
}

function getUsersSync() {
  const stored = localStorage.getItem('users');
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('getUsersSync parse error:', e);
    return [];
  }
}

// Save bookings (uses firebase wrapper if provided, otherwise localStorage)
async function saveBookings(bookings) {
  if (typeof window.saveBookings === 'function') {
    return await window.saveBookings(bookings);
  }
  try {
    localStorage.setItem('bookings', JSON.stringify(bookings));
    return Promise.resolve();
  } catch (err) {
    console.error('saveBookings error:', err);
    throw err;
  }
}

// Simple auth guard used by pages that call requireLogin()
async function requireLogin(redirectTo = 'login.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    throw new Error('login-required');
  }
  return user;
}

// // Simple catalog of reference cuts (replace image paths with your assets)
// const PREFERRED_CUTS = [
//   { id: 'puppy',   label: 'Puppy Cut',   image: 'img/cuts/puppy.jpg' },
//   { id: 'teddy',   label: 'Teddy Bear Cut', image: 'img/cuts/teddy.jpg' },
//   { id: 'lion',    label: 'Lion Cut',    image: 'img/cuts/lion.jpg' },
//   { id: 'summer',  label: 'Summer Cut',  image: 'img/cuts/summer.jpg' },
//   { id: 'kennel',  label: 'Kennel Cut',  image: 'img/cuts/kennel.jpg' },
//   { id: 'show',    label: 'Show Cut',    image: 'img/cuts/show.jpg' }
// ];

// // Render the visual pick-list into #preferredCuts
// function renderPreferredCuts(containerId = 'preferredCuts', selectedId = '') {
//   const container = document.getElementById(containerId);
//   if (!container) return;
//   container.innerHTML = '';
//   PREFERRED_CUTS.forEach(cut => {
//     const card = document.createElement('div');
//     card.className = 'preferred-cut-card';
//     card.style.cursor = 'pointer';
//     card.style.border = cut.id === selectedId ? '3px solid #4CAF50' : '1px solid #ddd';
//     card.style.padding = '0.5rem';
//     card.style.borderRadius = '8px';
//     card.style.width = '120px';
//     card.style.textAlign = 'center';
//     card.innerHTML = `
//       <img src="${cut.image}" alt="${cut.label}" style="width:100%; height:80px; object-fit:cover; border-radius:6px;">
//       <div style="margin-top:0.5rem; font-size:0.95rem;">${cut.label}</div>
//     `;
//     card.dataset.cutId = cut.id;
//     card.onclick = () => selectPreferredCut(cut.id);
//     container.appendChild(card);
//   });
//   // set hidden input value
//   const input = document.getElementById('preferredCutInput');
//   if (input) input.value = selectedId || '';
// }

// // UI selection handler: set input, highlight, and optionally save to profile
// async function selectPreferredCut(cutId) {
//   const prev = document.querySelectorAll('#preferredCuts .preferred-cut-card');
//   prev.forEach(n => n.style.border = '1px solid #ddd');
//   const selected = document.querySelector(`#preferredCuts .preferred-cut-card[data-cut-id="${cutId}"]`);
//   if (selected) selected.style.border = '3px solid #4CAF50';
//   const input = document.getElementById('preferredCutInput');
//   if (input) input.value = cutId || '';

//   // if user checked "save details", persist to profile
//   const saveBox = document.getElementById('savePreferredCut');
//   if (saveBox && saveBox.checked) {
//     await savePreferredCutToProfile(cutId);
//   }
// }

// // Save preferred cut to current user's profile (firebase or localStorage fallback)
// async function savePreferredCutToProfile(cutId) {
//   try {
//     const user = await (typeof getCurrentUser === 'function' ? getCurrentUser() : Promise.resolve(null));
//     if (!user) {
//       // local fallback: save to customerProfiles keyed by email or local id
//       const profilesRaw = localStorage.getItem(CUSTOMER_PROFILE_KEY) || '{}';
//       const profiles = JSON.parse(profilesRaw || '{}');
//       const key = 'guest';
//       profiles[key] = profiles[key] || {};
//       profiles[key].preferredCut = cutId;
//       localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(profiles));
//       return;
//     }
//     // if firebase saveUsers exists, update the user record and persist
//     if (typeof getUsers === 'function' && typeof saveUsers === 'function') {
//       const users = await getUsers().catch(() => []);
//       const idx = users.findIndex(u => u.id === user.id);
//       if (idx >= 0) {
//         users[idx].preferredCut = cutId;
//       } else {
//         users.push({ id: user.id, email: user.email, name: user.name, preferredCut: cutId });
//       }
//       await saveUsers(users);
//     } else {
//       // fallback: attach to currentUser and localStorage
//       user.preferredCut = cutId;
//       setCurrentUser(user);
//       localStorage.setItem('currentUser', JSON.stringify(user));
//     }
//   } catch (e) {
//     console.warn('savePreferredCutToProfile failed:', e);
//   }
// }

// // Prefill picker from profile or localStorage; call on page load
// async function populatePreferredCutFromProfile() {
//   try {
//     // check current user then profiles fallback
//     const user = await (typeof getCurrentUser === 'function' ? getCurrentUser() : Promise.resolve(null));
//     let preferred = '';
//     if (user && user.preferredCut) preferred = user.preferredCut;
//     else {
//       const profilesRaw = localStorage.getItem(CUSTOMER_PROFILE_KEY);
//       if (profilesRaw) {
//         const profiles = JSON.parse(profilesRaw || '{}');
//         const key = 'guest';
//         preferred = (profiles[key] && profiles[key].preferredCut) || '';
//       }
//     }
//     renderPreferredCuts('preferredCuts', preferred);
//   } catch (e) {
//     console.warn('populatePreferredCutFromProfile failed:', e);
//     renderPreferredCuts('preferredCuts', '');
//   }
// }

// Hook up on DOM ready (booking page)
// document.addEventListener('DOMContentLoaded', function() {
//   // If booking form exists, initialize picker and wire submit to include preferredCut
//   if (document.getElementById('preferredCuts')) {
//     populatePreferredCutFromProfile();
//   }

//   const bookingForm = document.getElementById('bookingForm');
//   if (bookingForm) {
//     bookingForm.addEventListener('submit', async function(e) {
//       // ensure preferredCut is read into the form data (hidden input already set by select)
//       // let existing handler continue — do nothing here if form already handles creating booking.
//       // If you create booking in JS, make sure to include:
//       // booking.preferredCut = document.getElementById('preferredCutInput')?.value || '';
//     }, { passive: false });
//   }
// });

/* ============================================
   Featured Cuts Management (Admin)
   ============================================ */

// Mark a booking as featured
async function markAsFeatured(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return false;
    }
    
    booking.isFeatured = true;
    booking.featuredDate = new Date().toISOString();
    await saveBookings(bookings);
    
    console.log(`[Featured] ✅ Marked booking ${bookingId} as featured`);
    return true;
  } catch (error) {
    console.error('[Featured] ❌ Error marking booking as featured:', error);
    return false;
  }
}

// Unmark a booking from featured
async function unmarkAsFeatured(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return false;
    }
    
    booking.isFeatured = false;
    await saveBookings(bookings);
    
    console.log(`[Featured] ✅ Unmarked booking ${bookingId} from featured`);
    return true;
  } catch (error) {
    console.error('[Featured] ❌ Error unmarking booking:', error);
    return false;
  }
}

// Get featured bookings (with images)
async function getFeaturedBookings(limit = 4) {
  try {
    const bookings = await getBookings();
    
    const featured = bookings
      .filter(b => b.isFeatured && b.beforeImage && b.afterImage)
      .sort((a, b) => {
        // Sort by featured date (newest first), then by booking date
        const dateA = new Date(a.featuredDate || a.date || a.id);
        const dateB = new Date(b.featuredDate || b.date || b.id);
        return dateB - dateA;
      })
      .slice(0, limit);
    
    console.log(`[Featured] Fetched ${featured.length} featured bookings`);
    return featured;
  } catch (error) {
    console.error('[Featured] ❌ Error fetching featured bookings:', error);
    return [];
  }
}

// Delete images from a booking (keep booking record)
async function deleteBookingImages(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return false;
    }
    
    booking.beforeImage = '';
    booking.afterImage = '';
    
    // If it was featured, unfeature it too
    if (booking.isFeatured) {
      booking.isFeatured = false;
    }
    
    await saveBookings(bookings);
    
    console.log(`[Featured] ✅ Deleted images from booking ${bookingId}`);
    return true;
  } catch (error) {
    console.error('[Featured] ❌ Error deleting images:', error);
    return false;
  }
}

// Get featured entries for display (same format as public review entries)
async function getFeaturedReviewEntries(limit = 4) {
  try {
    const bookings = await getFeaturedBookings(limit);
    
    const entries = bookings.map(booking => {
      let serviceDescription = booking.packageName || 'Custom Service';
      if (booking.packageId === 'single-service' && booking.singleServices?.length) {
        const services = booking.singleServices.map(id => SINGLE_SERVICE_PRICING?.[id]?.label || id).join(', ');
        serviceDescription = `Single Services: ${services}`;
      }
      
      return {
        id: booking.id,
        shortId: getBookingDisplayCode(booking),
        petName: booking.petName,
        packageName: booking.packageName,
        serviceDescription: serviceDescription,
        bookingNotes: booking.bookingNotes || '',
        groomingNotes: booking.groomingNotes || '',
        review: booking.review || '',
        rating: booking.rating || 0,
        beforeImage: booking.beforeImage,
        afterImage: booking.afterImage,
        date: booking.date,
        customerName: booking.customerName || 'Customer',
        groomerName: booking.groomerName || 'Professional Groomer',
        isFeatured: booking.isFeatured
      };
    });
    
    return entries;
  } catch (error) {
    console.error('[Featured] ❌ Error getting featured review entries:', error);
    return [];
  }
}

// Make functions globally available
window.markAsFeatured = markAsFeatured;
window.unmarkAsFeatured = unmarkAsFeatured;
window.getFeaturedBookings = getFeaturedBookings;
window.deleteBookingImages = deleteBookingImages;
window.getFeaturedReviewEntries = getFeaturedReviewEntries;

// Render featured cuts gallery on public pages
async function renderFeaturedCutsGallery(targetId = 'homeFeaturedFeed', limit = 4) {
  const container = document.getElementById(targetId);
  if (!container || typeof getFeaturedReviewEntries !== 'function') return;
  
  try {
    const entries = await getFeaturedReviewEntries(limit);
    
    if (!entries.length) {
      container.innerHTML = '<p class="empty-state" style="margin:0;">No featured cuts yet. Check back soon!</p>';
      return;
    }
    
    container.innerHTML = entries.map(entry => `
      <article class="review-card">
        <div class="review-card-gallery" onclick="openGalleryZoom('${entry.beforeImage}', '${entry.afterImage}', '${escapeHtml(entry.petName)}');" style="cursor: pointer;">
          <img src="${entry.beforeImage}" alt="Before ${escapeHtml(entry.petName)}">
          <img src="${entry.afterImage}" alt="After ${escapeHtml(entry.petName)}">
        </div>
        <div class="review-card-content">
          <h4 style="margin-bottom:0.35rem;">${escapeHtml(entry.petName)}</h4>
          <p style="font-size:0.85rem; color:var(--gray-600); margin-bottom:0.5rem;">
            ${formatDate(entry.date)} · <strong style="color: #000; font-weight: 700;">${escapeHtml(entry.packageName || 'Custom package')}</strong>
          </p>
          ${(() => {
            const notesText = entry.bookingNotes || '';
            if (!notesText || !notesText.trim()) return '';
            const cutNames = ['Puppy Cut', 'Teddy Bear Cut', 'Lion Cut', 'Summer Cut', 'Kennel Cut', 'Show Cut'];
            const notesLower = notesText.toLowerCase().trim();
            const preferredCut = cutNames.find(cut => notesLower.includes(cut.toLowerCase()));
            if (preferredCut) {
              return `<p style="font-size:0.85rem; background: #e8f5e9; padding: 0.5rem; border-left: 3px solid #2e7d32; margin: 0.5rem 0; font-weight: 500;"><strong>✂️ Preferred Cut:</strong> <span style="font-weight: 700; color: #2e7d32;">${escapeHtml(preferredCut)}</span></p>`;
            }
            return '';
          })()}
          <p style="font-size:0.9rem; color:var(--gray-700);">
            ${entry.review ? `"${escapeHtml(entry.review)}"` : 'Stunning transformation!'}
          </p>
          <div class="review-card-meta">
            <div>Code ${escapeHtml(entry.shortId)} · ${escapeHtml(entry.customerName)}</div>
            <div style="margin-top: 0.5rem; font-size: 0.85rem; background: #f0f0f0; padding: 0.5rem; border-radius: 0.25rem; font-weight: 600; color: #000;">✂️ Groomed by ${escapeHtml(entry.groomerName)}</div>
          </div>
        </div>
      </article>
    `).join('');
  } catch (error) {
    console.error('[Featured Gallery] Error rendering:', error);
    container.innerHTML = '<p class="empty-state" style="margin:0; color:#d32f2f;">Error loading featured cuts.</p>';
  }
}

window.renderFeaturedCutsGallery = renderFeaturedCutsGallery;