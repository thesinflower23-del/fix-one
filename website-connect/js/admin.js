/* ============================================
   BestBuddies Pet Grooming - Admin Dashboard
   ============================================ */

let currentView = 'overview';
let sortBy = 'date'; // 'date', 'status', 'customer'
const adminState = {
  recentPage: 1,
  recentPageSize: 5,
  recentData: [],
  recentLimit: 'all' // 'all', '3', '5', '10'
};

// Extract preferred cut from booking notes
function extractPreferredCut(notes) {
  if (!notes || typeof notes !== 'string') return null;

  const cutNames = ['Puppy Cut', 'Teddy Bear Cut', 'Lion Cut', 'Summer Cut', 'Kennel Cut', 'Show Cut'];
  const notesLower = notes.toLowerCase().trim();

  if (!notesLower) return null;

  for (let cut of cutNames) {
    // Case-insensitive check
    if (notesLower.includes(cut.toLowerCase())) {
      return cut;
    }
  }

  return null;
}

// Diagnostic function to check bookingNotes in all bookings
async function diagnoseBookingNotes() {
  const bookings = await getBookings();
  console.log('=== BOOKING NOTES DIAGNOSTIC ===');
  console.log(`Total bookings: ${bookings.length}`);

  bookings.forEach((booking, idx) => {
    const hasNotes = booking.bookingNotes && booking.bookingNotes.trim();
    const preferredCut = extractPreferredCut(booking.bookingNotes);
    console.log(`Booking ${idx + 1} (${booking.id || booking.shortId}):`, {
      hasBookingNotes: !!booking.bookingNotes,
      bookingNotesValue: booking.bookingNotes || '(empty)',
      preferredCut: preferredCut || '(none detected)',
      customerName: booking.customerName,
      petName: booking.petName
    });
  });

  return bookings;
}

// Initialize admin dashboard
async function initAdminDashboard() {
  // Check if user is admin
  if (!(await requireAdmin())) {
    return;
  }

  // Setup sidebar navigation
  setupSidebarNavigation();
  setupAdminPasswordForm();

  // Load overview by default
  loadOverview();

  // Gallery filter change handler: reload gallery when admin changes filter
  const galleryFilter = document.getElementById('galleryStatusFilter');
  if (galleryFilter) {
    galleryFilter.addEventListener('change', function () {
      if (currentView === 'gallery') {
        loadGalleryView();
      }
    });
  }
}

// Setup sidebar navigation
function setupSidebarNavigation() {
  const menuItems = document.querySelectorAll('.sidebar-menu a');
  menuItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const view = this.dataset.view;
      if (view) {
        switchView(view);
      }
    });
  });
}

// Switch view
function switchView(view) {
  currentView = view;

  // Hide all views
  document.getElementById('overviewView').style.display = 'none';
  document.getElementById('pendingView').style.display = 'none';
  document.getElementById('confirmedView').style.display = 'none';
  document.getElementById('calendarView').style.display = 'none';
  document.getElementById('customersView').style.display = 'none';
  document.getElementById('groomerAbsencesView').style.display = 'none';
  document.getElementById('walkInView').style.display = 'none';
  document.getElementById('historyView').style.display = 'none';
  document.getElementById('galleryView').style.display = 'none';
  const accountView = document.getElementById('accountView');
  if (accountView) {
    accountView.style.display = 'none';
  }

  // Update active menu item
  document.querySelectorAll('.sidebar-menu a').forEach(item => {
    if (item.dataset.view === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Show and load appropriate view sa admin 
  switch (view) {
    case 'overview':
      document.getElementById('overviewView').style.display = 'block';
      loadOverview();
      break;
    case 'pending':
      document.getElementById('pendingView').style.display = 'block';
      loadPendingBookings();
      break;
    case 'confirmed':
      document.getElementById('confirmedView').style.display = 'block';
      loadConfirmedBookings();
      break;
    case 'calendar':
      document.getElementById('calendarView').style.display = 'block';
      loadCalendarView();
      break;
    case 'customers':
      document.getElementById('customersView').style.display = 'block';
      loadCustomerManagement();
      break;
    case 'groomerAbsences':
      document.getElementById('groomerAbsencesView').style.display = 'block';
      loadGroomerAbsencesView();
      break;
    case 'walkIn':
      document.getElementById('walkInView').style.display = 'block';
      loadWalkInForm();
      break;
    case 'history':
      document.getElementById('historyView').style.display = 'block';
      renderBookingHistory();
      break;
    case 'gallery':
      document.getElementById('galleryView').style.display = 'block';
      loadGalleryView();
      break;
    case 'account':
      if (accountView) {
        accountView.style.display = 'block';
      }
      setupAdminPasswordForm();
      break;
  }
}

// Load overview
async function loadOverview() {
  const bookings = await getBookings();
  const absences = getStaffAbsences();
  const users = await getUsers();
  const customers = users.filter(u => u.role === 'customer');

  const totalBookings = bookings.length;
  // Normalize status values to avoid casing/whitespace mismatches
  const normalize = s => String(s || '').trim().toLowerCase();
  const pendingBookings = bookings.filter(b => normalize(b.status) === 'pending').length;
  const confirmedBookings = bookings.filter(b => ['confirmed', 'completed'].includes(normalize(b.status))).length;
  const cancelledBookings = bookings.filter(b => ['cancelled', 'cancelledbycustomer', 'cancelledbyadmin'].includes(normalize(b.status))).length;
  const totalCustomers = customers.length;

  // Update stats cards
  updateStatsCards(totalBookings, pendingBookings, confirmedBookings, cancelledBookings, totalCustomers);

  // Load recent bookings
  adminState.recentData = bookings.sort((a, b) => b.createdAt - a.createdAt);
  adminState.recentPage = 1;
  adminState.recentLimit = 'all';
  renderRecentBookings(adminState.recentData);

  // Reset filter dropdown to 'all'
  const filterSelect = document.getElementById('recentBookingsFilter');
  if (filterSelect) {
    filterSelect.value = 'all';
  }

  // Render mega calendar
  const calendarData = buildCalendarDataset(bookings, absences);
  renderMegaCalendar('adminCalendar', calendarData);

  updateGroomerAlertPanel(absences);
  await renderBlockedCustomersPanel();
  await renderLiftBanPanel();
  await renderFeaturedCutsPanel();
  await renderCommunityReviewFeed('adminReviewFeed', 6);
}

// Diagnostic helper: prints status distribution and sample bookings
async function diagnoseBookingStatus() {
  const bookings = await getBookings();
  if (!Array.isArray(bookings)) {
    console.warn('Bookings not an array:', bookings);
    return bookings;
  }
  const counts = bookings.reduce((acc, b) => {
    const s = String(b.status || 'unknown').trim().toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  console.log('Booking status distribution:', counts);
  // Show first 10 bookings with id/status for inspection
  console.table(bookings.slice(0, 20).map(b => ({ id: b.id || b.shortId, status: b.status, date: b.date, time: b.time })));
  return { counts, sample: bookings.slice(0, 20) };
}
window.diagnoseBookingStatus = diagnoseBookingStatus;

// Update stats cards with clickable/sortable functionality
function updateStatsCards(totalBookings, pendingBookings, confirmedBookings, cancelledBookings, totalCustomers) {
  const container = document.getElementById('statsCardsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="stat-card" onclick="filterStatsByType('all')" style="background: linear-gradient(135deg, rgba(18, 18, 18, 0.08), rgba(72, 72, 72, 0.08)); cursor: pointer; transition: all 0.3s ease;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">📅</div>
      <div class="stat-value" style="font-size: 2.5rem;">${totalBookings}</div>
      <div class="stat-label">Total Bookings</div>
    </div>
    <div class="stat-card" onclick="filterStatsByType('pending')" style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(210, 210, 210, 0.6)); cursor: pointer; transition: all 0.3s ease;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
      <div class="stat-value" style="font-size: 2.5rem; color: var(--gray-700);">${pendingBookings}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card" onclick="filterStatsByType('confirmed')" style="background: linear-gradient(135deg, rgba(18, 18, 18, 0.12), rgba(72, 72, 72, 0.12)); cursor: pointer; transition: all 0.3s ease;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
      <div class="stat-value" style="font-size: 2.5rem; color: var(--gray-900);">${confirmedBookings}</div>
      <div class="stat-label">Confirmed</div>
    </div>
    <div class="stat-card" onclick="filterStatsByType('cancelled')" style="background: linear-gradient(135deg, rgba(255, 200, 200, 0.9), rgba(240, 180, 180, 0.6)); cursor: pointer; transition: all 0.3s ease;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">❌</div>
      <div class="stat-value" style="font-size: 2.5rem; color: var(--gray-700);">${cancelledBookings}</div>
      <div class="stat-label">Cancelled</div>
    </div>
    <div class="stat-card" onclick="filterStatsByType('customers')" style="background: linear-gradient(135deg, rgba(240, 240, 240, 0.9), rgba(210, 210, 210, 0.6)); cursor: pointer; transition: all 0.3s ease;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">👥</div>
      <div class="stat-value" style="font-size: 2.5rem; color: var(--gray-700);">${totalCustomers}</div>
      <div class="stat-label">Total Customers</div>
    </div>
  `;

  // Add hover effects
  container.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('mouseenter', function () {
      this.style.transform = 'translateY(-8px)';
      this.style.boxShadow = 'var(--shadow-lg)';
    });
    card.addEventListener('mouseleave', function () {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = 'var(--shadow)';
    });
  });
}

// Filter by stat card click - shows specific booking types
async function filterStatsByType(type) {
  const bookings = await getBookings();
  const users = await getUsers();
  const customers = users.filter(u => u.role === 'customer');

  switch (type) {
    case 'pending':
      // Navigate to pending view
      switchView('pending');
      break;
    case 'confirmed':
      // Navigate to confirmed view
      switchView('confirmed');
      break;
    case 'cancelled':
      // Show overview with filtered cancelled bookings in recent section
      const cancelledBookings = bookings.filter(b => ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(b.status)).sort((a, b) => b.createdAt - a.createdAt);
      adminState.recentData = cancelledBookings;
      adminState.recentPage = 1;
      adminState.recentFilter = 'cancelled';
      document.getElementById('overviewView').style.display = 'block';
      document.getElementById('pendingView').style.display = 'none';
      document.getElementById('confirmedView').style.display = 'none';
      document.getElementById('customersView').style.display = 'none';
      renderRecentBookings(cancelledBookings);
      break;
    case 'customers':
      // Navigate to customer management view
      switchView('customers');
      break;
    case 'all':
    default:
      // Load full overview
      loadOverview();
      break;
  }
}

// Sort bookings based on stat card click - keep cards visible
async function sortBookings(sortType) {
  const bookings = await getBookings();
  let filtered = [...bookings];

  // Keep stat cards visible - don't hide overview
  const overviewView = document.getElementById('overviewView');
  if (overviewView) {
    overviewView.style.display = 'block';
  }

  switch (sortType) {
    case 'pending':
      filtered = bookings.filter(b => b.status === 'pending');
      // Show pending view but keep overview visible
      document.getElementById('pendingView').style.display = 'block';
      document.getElementById('confirmedView').style.display = 'none';
      document.getElementById('customersView').style.display = 'none';
      loadPendingBookings();
      break;
    case 'confirmed':
      filtered = bookings.filter(b => ['confirmed', 'completed'].includes(b.status));
      document.getElementById('pendingView').style.display = 'none';
      document.getElementById('confirmedView').style.display = 'block';
      document.getElementById('customersView').style.display = 'none';
      loadConfirmedBookings();
      break;
    case 'cancelled':
      filtered = bookings.filter(b => ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(b.status));
      document.getElementById('pendingView').style.display = 'none';
      document.getElementById('confirmedView').style.display = 'none';
      document.getElementById('customersView').style.display = 'none';
      // Show filtered cancelled bookings in recent bookings section
      adminState.recentData = filtered.sort((a, b) => b.createdAt - a.createdAt);
      adminState.recentPage = 1;
      renderRecentBookings(adminState.recentData);
      break;
    case 'customers':
      document.getElementById('pendingView').style.display = 'none';
      document.getElementById('confirmedView').style.display = 'none';
      document.getElementById('customersView').style.display = 'block';
      loadCustomerManagement();
      break;
    case 'all':
    default:
      document.getElementById('pendingView').style.display = 'none';
      document.getElementById('confirmedView').style.display = 'none';
      document.getElementById('customersView').style.display = 'none';
      loadOverview();
      break;
  }

  // Update active stat card
  document.querySelectorAll('.stat-card[data-sort]').forEach(card => {
    if (card.dataset.sort === sortType) {
      card.style.border = '2px solid #000';
    } else {
      card.style.border = 'none';
    }
  });
}

// Render recent bookings with pagination/clickable details
function renderRecentBookings(bookings) {
  const container = document.getElementById('recentBookings');
  if (!container) return;

  // Apply the limit from dropdown
  let displayBookings = bookings;
  if (adminState.recentLimit !== 'all') {
    const limitNum = parseInt(adminState.recentLimit);
    displayBookings = bookings.slice(0, limitNum);
  }

  if (displayBookings.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 3rem;">
        <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">📅</div>
        <p style="color: var(--gray-600);">No bookings yet</p>
      </div>
    `;
    const pagination = document.getElementById('recentPagination');
    if (pagination) pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(displayBookings.length / adminState.recentPageSize) || 1;
  if (adminState.recentPage > totalPages) {
    adminState.recentPage = totalPages;
  }
  const start = (adminState.recentPage - 1) * adminState.recentPageSize;
  const currentSlice = displayBookings.slice(start, start + adminState.recentPageSize);

  container.innerHTML = currentSlice.map(booking => {
    const bookingCode = typeof getBookingDisplayCode === 'function'
      ? getBookingDisplayCode(booking)
      : (booking.shortId || booking.id);
    const statusClass = ['confirmed', 'completed'].includes(booking.status)
      ? 'badge-confirmed'
      : ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(booking.status)
        ? 'badge-cancelled'
        : 'badge-pending';
    const statusLabel = formatBookingStatus(booking.status);

    const petEmoji = booking.petType === 'dog' ? '🐕' : '🐈';

    return `
      <div class="card recent-booking-card" data-booking-id="${booking.id}" style="margin-bottom: 1rem; cursor: pointer;">
        <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 1.5rem; align-items: center;">
          <div style="font-size: 2.5rem;">${petEmoji}</div>
          <div>
            <h4 style="margin-bottom: 0.5rem; color: var(--gray-900);">${escapeHtml(booking.petName)}</h4>
            <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
              <strong>Customer:</strong> ${escapeHtml(booking.customerName)}
            </p>
            <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
              <strong>Receipt:</strong> ${escapeHtml(bookingCode)}
            </p>
            <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
              <strong>Package:</strong> ${escapeHtml(booking.packageName)}
            </p>
            <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
              <strong>Total:</strong> ${formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0)}
            </p>
            <p style="color: var(--gray-500); font-size: 0.875rem;">
              📅 ${formatDate(booking.date)} at ${formatTime(booking.time)}
            </p>
          </div>
          <div>
            <span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.recent-booking-card').forEach(card => {
    card.addEventListener('click', () => {
      const bookingId = card.dataset.bookingId;
      openBookingDetail(bookingId);
    });
  });

  updateRecentPagination(displayBookings);
}

// Change limit of recent bookings shown
async function changeRecentBookingsLimit(limitValue) {
  adminState.recentLimit = limitValue;
  const bookings = await getBookings();
  adminState.recentData = bookings.sort((a, b) => b.createdAt - a.createdAt);
  adminState.recentPage = 1;
  renderRecentBookings(adminState.recentData);
}

function updateRecentPagination(bookings) {
  const container = document.getElementById('recentPagination');
  if (!container) return;

  if (!bookings || bookings.length <= adminState.recentPageSize) {
    container.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(bookings.length / adminState.recentPageSize);
  const current = adminState.recentPage;
  let pagesHtml = '';

  const renderPageBtn = (page, label = page) => `
    <button ${page === current ? 'class="active"' : ''} data-page="${page}">${label}</button>
  `;

  pagesHtml += `<button data-nav="prev" ${current === 1 ? 'disabled' : ''}>‹</button>`;

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      pagesHtml += renderPageBtn(i);
    }
  } else {
    const lastPage = totalPages;
    const displayPages = [1, 2, 3];
    displayPages.forEach(page => {
      if (page <= lastPage) {
        pagesHtml += renderPageBtn(page);
      }
    });
    pagesHtml += `<span style="color: var(--gray-400);">…</span>`;
    pagesHtml += renderPageBtn(lastPage);
  }

  pagesHtml += `<button data-nav="next" ${current === totalPages ? 'disabled' : ''}>Next</button>`;

  container.innerHTML = `<div class="pagination">${pagesHtml}</div>`;

  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      adminState.recentPage = Number(btn.dataset.page);
      renderRecentBookings(adminState.recentData);
      updateRecentPagination(adminState.recentData);
    });
  });

  const prevBtn = container.querySelector('button[data-nav="prev"]');
  const nextBtn = container.querySelector('button[data-nav="next"]');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (adminState.recentPage > 1) {
        adminState.recentPage -= 1;
        renderRecentBookings(adminState.recentData);
        updateRecentPagination(adminState.recentData);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (adminState.recentPage < totalPages) {
        adminState.recentPage += 1;
        renderRecentBookings(adminState.recentData);
        updateRecentPagination(adminState.recentData);
      }
    });
  }
}

// Load pending bookings
async function loadPendingBookings() {
  const bookings = await getBookings();
  const pendingBookings = bookings.filter(b => b.status === 'pending');

  renderPendingBookingsTable(pendingBookings);

  // Setup search
  const searchInput = document.getElementById('pendingSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const query = this.value.toLowerCase();
      const filtered = pendingBookings.filter(booking =>
        booking.customerName.toLowerCase().includes(query) ||
        booking.petName.toLowerCase().includes(query) ||
        booking.packageName.toLowerCase().includes(query)
      );
      renderPendingBookingsTable(filtered);
    });
  }
}

// Render pending bookings table
function renderPendingBookingsTable(bookings) {
  const container = document.getElementById('pendingBookingsTable');
  if (!container) return;

  if (bookings.length === 0) {
    container.innerHTML = '<p class="empty-state">No pending bookings</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Code</th>
            <th>Pet</th>
            <th>Package</th>
            <th>Preferred Cut</th>
            <th>Date</th>
            <th>Time</th>
            <th>Total</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(booking => {
    // ONLY check bookingNotes for preferred cut - NOT medical conditions!
    const notesText = booking.bookingNotes || '';
    const preferredCut = extractPreferredCut(notesText);

    // Display preferred cut badge AND full notes text together
    let cutDisplay = '';
    if (preferredCut) {
      // Show preferred cut badge PLUS full notes below
      cutDisplay = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <span style="background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 600; color: #2e7d32; display: inline-block; width: fit-content;">✂️ ${escapeHtml(preferredCut)}</span>
                  ${notesText && notesText.trim() ? `<span style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.4;">${escapeHtml(notesText)}</span>` : ''}
                </div>
              `;
    } else if (notesText && notesText.trim()) {
      // Show full notes with amber badge
      cutDisplay = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <span style="background: #fff9e6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem; color: #f57c00; font-weight: 500; display: inline-block; width: fit-content;">📝 Custom Notes</span>
                  <span style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.4;">${escapeHtml(notesText)}</span>
                </div>
              `;
    } else {
      cutDisplay = '<span style="color: var(--gray-500); font-size: 0.85rem;">Not specified</span>';
    }

    return `
            <tr>
              <td>${escapeHtml(booking.customerName)}</td>
              <td>${escapeHtml(typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : (booking.shortId || booking.id))}</td>
              <td>${escapeHtml(booking.petName)} (${escapeHtml(booking.petType)})</td>
              <td>${escapeHtml(booking.packageName)}</td>
              <td>${cutDisplay}</td>
              <td>${formatDate(booking.date)}</td>
              <td>${formatTime(booking.time)}</td>
              <td>${formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0)}</td>
              <td>${escapeHtml(booking.phone)}</td>
              <td>
                <button class="btn btn-success btn-sm" onclick="confirmBooking('${booking.id}')">
                  Confirm
                </button>
                <button class="btn btn-outline btn-sm" onclick="openBookingDetail('${booking.id}')">
                  View
                </button>
                <button class="btn btn-danger btn-sm" onclick="openCancelModal('${booking.id}')">
                  Cancel
                </button>
              </td>
            </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Load confirmed bookings
async function loadConfirmedBookings() {
  const bookings = await getBookings();
  const confirmedBookings = bookings.filter(b => ['confirmed', 'completed'].includes(b.status));

  renderConfirmedBookingsTable(confirmedBookings);
}

// Render confirmed bookings table
function renderConfirmedBookingsTable(bookings) {
  const container = document.getElementById('confirmedBookingsTable');
  if (!container) return;

  if (bookings.length === 0) {
    container.innerHTML = '<p class="empty-state">No confirmed bookings</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Code</th>
            <th>Pet</th>
            <th>Package</th>
            <th>Preferred Cut</th>
            <th>Date</th>
            <th>Time</th>
            <th>Total</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(booking => {
    // ONLY check bookingNotes for preferred cut - NOT medical conditions!
    const notesText = booking.bookingNotes || '';
    const preferredCut = extractPreferredCut(notesText);

    // Display preferred cut badge AND full notes text together
    let cutDisplay = '';
    if (preferredCut) {
      // Show preferred cut badge PLUS full notes below
      cutDisplay = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <span style="background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 600; color: #2e7d32; display: inline-block; width: fit-content;">✂️ ${escapeHtml(preferredCut)}</span>
                  ${notesText && notesText.trim() ? `<span style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.4;">${escapeHtml(notesText)}</span>` : ''}
                </div>
              `;
    } else if (notesText && notesText.trim()) {
      // Show full notes with amber badge
      cutDisplay = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <span style="background: #fff9e6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem; color: #f57c00; font-weight: 500; display: inline-block; width: fit-content;">📝 Custom Notes</span>
                  <span style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.4;">${escapeHtml(notesText)}</span>
                </div>
              `;
    } else {
      cutDisplay = '<span style="color: var(--gray-500); font-size: 0.85rem;">Not specified</span>';
    }

    return `
            <tr>
              <td>${escapeHtml(booking.customerName)}</td>
              <td>${escapeHtml(typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : (booking.shortId || booking.id))}</td>
              <td>${escapeHtml(booking.petName)} (${escapeHtml(booking.petType)})</td>
              <td>${escapeHtml(booking.packageName)}</td>
              <td>${cutDisplay}</td>
              <td>${formatDate(booking.date)}</td>
              <td>${formatTime(booking.time)}</td>
              <td>${formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0)}</td>
              <td>${escapeHtml(booking.phone)}</td>
              <td>
                ${booking.status === 'confirmed' ? `
                  <button class="btn btn-success btn-sm" onclick="completeBooking('${booking.id}')">
                    ✓ Complete
                  </button>
                ` : `
                  <span style="color: var(--success-color); font-weight: 600;">✓ Completed</span>
                `}
                <button class="btn btn-danger btn-sm" onclick="openCancelModal('${booking.id}')">
                  Cancel
                </button>
                <button class="btn btn-outline btn-sm" onclick="openBookingDetail('${booking.id}')">
                  View
                </button>
                <button class="btn btn-secondary btn-sm" onclick="openRescheduleModal('${booking.id}')">
                  Reschedule
                </button>
              </td>
            </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Load calendar view
function loadCalendarView() {
  const dateInput = document.getElementById('calendarDate');
  if (dateInput) {
    dateInput.min = getMinDate();
    dateInput.value = toLocalISO(new Date());

    dateInput.addEventListener('change', function () {
      loadCalendarAppointments(this.value);
      updateCalendarBlockStatus(this.value);
    });

    // Load today's appointments
    loadCalendarAppointments(dateInput.value);
    updateCalendarBlockStatus(dateInput.value);
  }
  setupCalendarBlockControls();
  renderCalendarBlackoutList();
}

// Load appointments for selected date
async function loadCalendarAppointments(date) {
  const bookings = await getBookings();
  const blackout = typeof getCalendarBlackout === 'function' ? getCalendarBlackout(date) : null;
  const dayBookings = bookings.filter(b => b.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(b.status));

  const container = document.getElementById('calendarAppointments');
  if (!container) return;

  if (blackout) {
    container.innerHTML = `
      <div class="card" style="text-align:center; padding:2rem;">
        <div style="font-size:2.5rem; margin-bottom:0.5rem;">🚫</div>
        <h3 style="margin-bottom:0.5rem;">Closed for ${formatDate(date)}</h3>
        <p style="color:var(--gray-600);">${escapeHtml(blackout.reason || 'Admin hold')}</p>
      </div>
    `;
    return;
  }

  if (dayBookings.length === 0) {
    container.innerHTML = '<p class="empty-state">No appointments for this date</p>';
    return;
  }

  // Sort by time
  dayBookings.sort((a, b) => {
    const timeA = a.time.replace('am', '').replace('pm', '');
    const timeB = b.time.replace('am', '').replace('pm', '');
    return timeA.localeCompare(timeB);
  });

  container.innerHTML = `
    <div class="grid">
      ${dayBookings.map(booking => {
    const statusClass = booking.status === 'confirmed'
      ? 'badge-confirmed'
      : 'badge-pending';

    return `
          <div class="card">
            <div class="card-body">
              <h3 class="card-title">${escapeHtml(booking.petName)}</h3>
              <p><strong>Customer:</strong> ${escapeHtml(booking.customerName)}</p>
              <p><strong>Package:</strong> ${escapeHtml(booking.packageName)}</p>
              <p><strong>Time:</strong> ${formatTime(booking.time)}</p>
              <p><strong>Total:</strong> ${formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(booking.phone)}</p>
              <p><span class="badge ${statusClass}">${escapeHtml(booking.status)}</span></p>
            </div>
          </div>
        `;
  }).join('')}
    </div>
  `;
}

function setupCalendarBlockControls() {
  const blockBtn = document.getElementById('calendarBlockBtn');
  if (blockBtn && blockBtn.dataset.bound !== 'true') {
    blockBtn.dataset.bound = 'true';
    blockBtn.addEventListener('click', blockSelectedDay);
  }
  const unblockBtn = document.getElementById('calendarUnblockBtn');
  if (unblockBtn && unblockBtn.dataset.bound !== 'true') {
    unblockBtn.dataset.bound = 'true';
    unblockBtn.addEventListener('click', unblockSelectedDay);
  }
}

function getSelectedCalendarDate() {
  const dateInput = document.getElementById('calendarDate');
  return dateInput?.value || null;
}

function blockSelectedDay() {
  const date = getSelectedCalendarDate();
  if (!date) {
    customAlert.warning('Select a date first.');
    return;
  }
  const reasonInput = document.getElementById('calendarBlockReason');
  const reason = reasonInput?.value?.trim() || 'Closed by admin';

    customAlert.confirm('Confirm', `Block ${formatDate(date)} for "${reason}"? All bookings on this day will be cancelled.`).then((confirmed) => {
    if (!confirmed) return;

    addCalendarBlackout(date, reason);
    cancelBookingsForDate(date, reason);
    loadCalendarAppointments(date);
    renderCalendarBlackoutList();
    updateCalendarBlockStatus(date);
    loadOverview();
    if (reasonInput) {
      reasonInput.value = '';
    }
    customAlert.success('Day blocked and affected customers notified via history log.');
  });
}

function unblockSelectedDay() {
  const date = getSelectedCalendarDate();
  if (!date) {
    customAlert.warning('Select a date first.');
    return;
  }
  if (!isCalendarBlackout(date)) {
    customAlert.warning('Selected day is already open.');
    return;
  }
    customAlert.confirm('Confirm', `Re-open ${formatDate(date)} for bookings?`).then((confirmed) => {
    if (!confirmed) return;

    removeCalendarBlackout(date);
    renderCalendarBlackoutList();
    updateCalendarBlockStatus(date);
    loadOverview();
    customAlert.success('Day reopened. Customers can now book again.');
  });
}

async function cancelBookingsForDate(date, reason) {
  const bookings = await getBookings();
  let changed = false;
  bookings.forEach(booking => {
    if (booking.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(booking.status)) {
      booking.status = 'cancelledByAdmin';
      booking.cancellationNote = `Closed day: ${reason}`;
      changed = true;
      logBookingHistory({
        bookingId: booking.id,
        action: 'cancelled',
        message: booking.cancellationNote,
        actor: 'admin'
      });
    }
  });
  if (changed) {
    saveBookings(bookings);
  }
}

function renderCalendarBlackoutList() {
  const container = document.getElementById('calendarBlackoutList');
  if (!container) return;
  const today = toLocalISO(new Date());
  const entries = getCalendarBlackouts()
    .filter(entry => entry.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!entries.length) {
    container.innerHTML = '<p class="empty-state" style="margin:0;">No closed days yet.</p>';
    return;
  }
  container.innerHTML = entries.map(entry => `
    <div class="sidebar-panel-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
      <div>
        <strong>${formatDate(entry.date)}</strong>
        <p style="margin:0; font-size:0.85rem; color:var(--gray-600);">${escapeHtml(entry.reason)}</p>
      </div>
      <button class="btn btn-outline btn-sm" data-reopen-date="${entry.date}">Re-open</button>
    </div>
  `).join('');
  container.querySelectorAll('[data-reopen-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('calendarDate').value = btn.dataset.reopenDate;
      unblockSelectedDay();
    });
  });
}

function updateCalendarBlockStatus(date) {
  const statusEl = document.getElementById('calendarBlockStatus');
  if (!statusEl || !date) return;
  const blackout = getCalendarBlackout(date);
  if (blackout) {
    statusEl.textContent = `${formatDate(date)} is closed (${blackout.reason}).`;
  } else {
    statusEl.textContent = `${formatDate(date)} is open for bookings.`;
  }
}

// Load customer management
async function loadCustomerManagement() {
  const users = await getUsers();
  const customers = users.filter(u => u.role === 'customer' && !u.id.includes('walk-in'));
  const bookings = await getBookings();

  // Add booking count to each customer
  const customersWithBookings = customers.map(customer => {
    const customerBookings = bookings.filter(b => b.userId === customer.id);
    return {
      ...customer,
      bookingCount: customerBookings.length
    };
  });

  renderCustomerTable(customersWithBookings);
}

// Render customer table
function renderCustomerTable(customers) {
  const container = document.getElementById('customersTable');
  if (!container) return;

  if (customers.length === 0) {
    container.innerHTML = '<p class="empty-state">No customers yet</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Joined Date</th>
            <th>Total Bookings</th>
            <th>Warnings</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map(customer => `
            ${(() => {
      const warningCount = customer.warningCount || 0;
      const limit = typeof WARNING_HARD_LIMIT === 'number' ? WARNING_HARD_LIMIT : 5;
      const joined = customer.createdAt
        ? formatDate(toLocalISO(new Date(customer.createdAt)))
        : '—';
      const statusLabel = customer.isBanned
        ? 'Banned'
        : (warningCount >= WARNING_THRESHOLD ? 'Watchlist' : 'Active');
      const statusClass = customer.isBanned
        ? 'badge badge-cancelled'
        : (warningCount >= WARNING_THRESHOLD ? 'badge badge-pending' : 'badge badge-confirmed');
      const canLift = customer.isBanned || warningCount >= limit;
      return `
                <tr>
                  <td>${escapeHtml(customer.name)}</td>
                  <td>${escapeHtml(customer.email)}</td>
                  <td>${joined}</td>
                  <td>${customer.bookingCount}</td>
                  <td>${warningCount}/${limit}</td>
                  <td><span class="${statusClass}" style="text-transform:capitalize;">${statusLabel}</span></td>
                  <td style="display:flex; gap:0.25rem; flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" data-add-warning="${customer.id}">Add Warning</button>
                    ${customer.isBanned ? '' : `<button class="btn btn-danger btn-sm" data-ban="${customer.id}">Ban</button>`}
                    ${canLift ? `<button class="btn btn-success btn-sm" data-lift="${customer.id}">Lift</button>` : ''}
                  </td>
                </tr>
              `;
    })()}
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('[data-add-warning]').forEach(btn => {
    btn.addEventListener('click', () => handleAddWarning(btn.dataset.addWarning));
  });
  container.querySelectorAll('[data-ban]').forEach(btn => {
    btn.addEventListener('click', () => handleBanCustomer(btn.dataset.ban));
  });
  container.querySelectorAll('[data-lift]').forEach(btn => {
    btn.addEventListener('click', () => openLiftBanModal(btn.dataset.lift));
  });
}

async function handleAddWarning(userId) {
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  const reason = prompt(`Reason for warning for ${user.name}?`, 'No-show / late cancellation');
  if (reason === null) return;
  const info = await incrementCustomerWarning(userId, reason.trim() || 'Admin issued warning');
  customAlert.info(`${user.name} now has ${info?.warnings || 0}/5 warnings.`);
  await loadCustomerManagement();
  renderBlockedCustomersPanel();
  renderLiftBanPanel();
}

async function handleBanCustomer(userId) {
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  const reason = prompt(`Why ban ${user.name}?`, 'Exceeded warning limit');
  if (reason === null) return;
    customAlert.confirm('Confirm', `Ban ${user.name}? They will be blocked from booking until lifted.`).then(async (confirmed) => {
    if (!confirmed) return;

    await banCustomer(userId, reason.trim() || 'Admin manual ban');
    customAlert.error(`${user.name} has been banned.`);
    await loadCustomerManagement();
    renderBlockedCustomersPanel();
    renderLiftBanPanel();
  });
}

// Booking detail modal
async function openBookingDetail(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const packages = await getPackages();
  const pkg = packages.find(p => p.id === booking.packageId);
  const history = getBookingHistory()
    .filter(entry => entry.bookingId === bookingId)
    .sort((a, b) => b.timestamp - a.timestamp);
  const bookingCode = typeof getBookingDisplayCode === 'function'
    ? getBookingDisplayCode(booking)
    : booking.id;
  const totalAmount = booking.totalPrice || booking.cost?.subtotal || 0;

  const statusClass = booking.status === 'confirmed'
    ? 'badge-confirmed'
    : ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(booking.status)
      ? 'badge-cancelled'
      : 'badge-pending';

  const historyHtml = history.length
    ? `<div class="history-list">${history.map(item => `
        <div style="padding:0.5rem 0; border-bottom:1px dashed var(--gray-200);">
          <strong>${new Date(item.timestamp).toLocaleString()}</strong><br>
          <span style="color:var(--gray-600); text-transform:capitalize;">${escapeHtml(item.action)}</span> – ${escapeHtml(item.message || '')}
        </div>
      `).join('')}</div>`
    : '<p class="empty-state" style="padding:1rem;">No history yet.</p>';

  // Groomer assignment section (only for pending bookings)
  const groomerSection = booking.status === 'pending' && !booking.groomerId ? `
    <div style="background: #fff3cd; padding: 1rem; border-radius: var(--radius-sm); margin: 1rem 0; border-left: 4px solid #ff9800;">
      <p style="margin: 0 0 0.75rem 0; font-weight: 600; color: var(--gray-900);">⚠️ Groomer Not Assigned</p>
      <p style="margin: 0; font-size: 0.9rem; color: var(--gray-700);">Assign a groomer before confirming this booking.</p>
      <button class="btn btn-primary btn-sm" onclick="openGroomerAssignmentModal('${booking.id}')" style="margin-top: 0.75rem;">
        Assign Groomer
      </button>
    </div>
  ` : (booking.groomerId ? `
    <p><strong>✓ Groomer:</strong> <span style="background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: #2e7d32; font-weight: 600;">${escapeHtml(booking.groomerName)}</span></p>
  ` : `
    <p><strong>Groomer:</strong> ${escapeHtml(booking.groomerName || 'Not assigned')}</p>
  `);

  showModal(`
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;">
      <h3 style="margin:0;">${escapeHtml(booking.customerName)} · ${escapeHtml(booking.petName)}</h3>
      ${booking.isFeatured ? `<span style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); padding: 0.5rem 0.75rem; border-radius: 0.5rem; font-weight: 700; color: #333; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3); white-space: nowrap;">⭐ FEATURED</span>` : ''}
    </div>
    <p><strong>Booking code:</strong> ${escapeHtml(bookingCode)}</p>
    <p><strong>Service:</strong> ${escapeHtml(booking.packageName)}${pkg ? ` (${pkg.duration} min)` : ''}</p>
    <p><strong>Schedule:</strong> ${formatDate(booking.date)} at ${formatTime(booking.time)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(booking.phone)}</p>
    ${groomerSection}
    <p><strong>Add-ons:</strong> ${booking.addOns?.length ? escapeHtml(booking.addOns.join(', ')) : 'None'}</p>
    ${booking.bookingNotes && booking.bookingNotes.trim() ? `<p><strong>Preferred Cut/Notes:</strong> <span style="background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: #2e7d32; font-weight: 600;">✂️ ${escapeHtml(booking.bookingNotes)}</span></p>` : ''}
    ${totalAmount ? `<p><strong>Total:</strong> ${formatCurrency(totalAmount)}</p>` : ''}
    ${booking.cost ? `
      <div class="summary-card sticky-summary" style="margin:1rem 0;">
        <div class="summary-item">
          <span class="summary-label">Total price</span>
          <span class="summary-value">${formatCurrency(booking.cost.subtotal)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Balance on visit</span>
          <span class="summary-value">${formatCurrency(booking.cost.balanceOnVisit)}</span>
        </div>
      </div>
    ` : ''}
    <p>
      <strong>Status:</strong>
      <span class="badge ${statusClass}">${escapeHtml(booking.status)}</span>
    </p>
    ${booking.cancellationNote ? `<p><strong>Latest note:</strong> ${escapeHtml(booking.cancellationNote)}</p>` : ''}
    ${(booking.beforeImage || booking.afterImage) ? `
      <div class="before-after" style="margin:1rem 0;">
        ${booking.beforeImage ? `<figure><figcaption>Before</figcaption><img src="${booking.beforeImage}" alt="Before photo" /></figure>` : ''}
        ${booking.afterImage ? `<figure><figcaption>After</figcaption><img src="${booking.afterImage}" alt="After photo" /></figure>` : ''}
      </div>
    ` : ''}
    <h4>Activity</h4>
    ${historyHtml}
    <div class="modal-actions">
      ${booking.status === 'pending' && booking.groomerId ? `<button class="btn btn-success btn-sm" onclick="confirmBooking('${booking.id}')">Confirm</button>` : ''}
      ${booking.status === 'pending' && !booking.groomerId ? `<button class="btn btn-success btn-sm" disabled style="opacity: 0.6;">Confirm (Assign groomer first)</button>` : ''}
      ${['confirmed'].includes(booking.status) ? `<button class="btn btn-secondary btn-sm" onclick="openMediaModal('${booking.id}')">Add Photos</button>` : ''}
      ${booking.beforeImage && booking.afterImage ? `<button class="btn ${booking.isFeatured ? 'btn-warning' : 'btn-secondary'} btn-sm" onclick="toggleFeature('${booking.id}')">${booking.isFeatured ? '⭐ Featured' : '☆ Feature This'}</button>` : ''}
      ${booking.status !== 'cancelledByAdmin' && booking.status !== 'cancelledByCustomer' ? `<button class="btn btn-secondary btn-sm" onclick="openRescheduleModal('${booking.id}')">Reschedule</button>` : ''}
      ${booking.status !== 'cancelledByAdmin' && booking.status !== 'cancelledByCustomer' ? `<button class="btn btn-secondary btn-sm" onclick="openNoShowModal('${booking.id}')">Mark No-show</button>` : ''}
      ${booking.status !== 'cancelledByAdmin' && booking.status !== 'cancelledByCustomer' ? `<button class="btn btn-danger btn-sm" onclick="openCancelModal('${booking.id}')">Cancel</button>` : ''}
      <button class="btn btn-outline btn-sm" onclick="closeModal()">Close</button>
    </div>
  `);
}

async function openGroomerAssignmentModal(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const groomers = await getGroomers();
  const absences = getStaffAbsences();

  // Get only active groomers (not on absence) for the booking date
  const activeGroomers = groomers.filter(groomer => {
    const absence = absences.find(a =>
      a.staffId === groomer.id &&
      a.date === booking.date &&
      a.status === 'approved'
    );
    return !absence;
  });

  const groomerOptions = activeGroomers.map(groomer => {
    const dailyLoad = getGroomerDailyLoad(groomer.id, booking.date);
    const limit = groomer.maxDailyBookings || GROOMER_DAILY_LIMIT;
    const available = limit - dailyLoad;
    const hasCapacity = available > 0;

    return `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border: 2px solid ${hasCapacity ? 'var(--gray-200)' : 'var(--gray-300)'}; border-radius: var(--radius-sm); margin-bottom: 0.75rem; cursor: ${hasCapacity ? 'pointer' : 'not-allowed'}; opacity: ${hasCapacity ? '1' : '0.6'};" onclick="assignGroomerToBooking('${bookingId}', '${groomer.id}', '${groomer.name}')">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem;">
          ${groomer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div style="flex: 1;">
          <p style="margin: 0; font-weight: 600; color: var(--gray-900);">${escapeHtml(groomer.name)}</p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--gray-600);">${escapeHtml(groomer.specialty || 'All-around stylist')}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-weight: 600; font-size: 0.95rem; color: ${hasCapacity ? '#2e7d32' : '#d32f2f'};">${available}/${limit} slots</p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: var(--gray-600);">${booking.date}</p>
        </div>
      </div>
    `;
  }).join('');

  const unavailableGroomers = groomers.filter(g => !activeGroomers.find(ag => ag.id === g.id));
  const unavailableHtml = unavailableGroomers.length ? `
    <p style="color: var(--gray-600); font-size: 0.9rem; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 500;">Unavailable on ${formatDate(booking.date)}:</p>
    ${unavailableGroomers.map(groomer => `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm); margin-bottom: 0.5rem; opacity: 0.5; background: var(--gray-50);">
        <div style="background: var(--gray-400); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem;">
          ${groomer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div style="flex: 1;">
          <p style="margin: 0; font-weight: 600; color: var(--gray-700);">${escapeHtml(groomer.name)}</p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--gray-600);">On leave / Not available</p>
        </div>
      </div>
    `).join('')}
  ` : '';

  showModal(`
    <h3 style="margin-top:0;">Assign Groomer for ${escapeHtml(booking.petName)}</h3>
    <p style="color: var(--gray-600); margin-bottom: 1rem;">
      <strong>Date:</strong> ${formatDate(booking.date)} at ${formatTime(booking.time)}<br>
      <strong>Service:</strong> ${escapeHtml(booking.packageName)}
    </p>
    <div style="border-top: 1px solid var(--gray-200); padding-top: 1rem;">
      <p style="font-weight: 600; color: var(--gray-900); margin-bottom: 1rem;">Available Groomers:</p>
      ${groomerOptions || '<p style="color: var(--gray-600);">No available groomers for this date.</p>'}
      ${unavailableHtml}
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-sm" onclick="openBookingDetail('${bookingId}')">Back</button>
    </div>
  `);
}

async function assignGroomerToBooking(bookingId, groomerId, groomerName) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  booking.groomerId = groomerId;
  booking.groomerName = groomerName;
  saveBookings(bookings);

  logBookingHistory({
    bookingId,
    action: 'groomer_assigned',
    message: `Assigned to ${groomerName}`,
    actor: 'admin'
  });

  closeModal();
  openBookingDetail(bookingId);
  customAlert.success(`✓ ${groomerName} assigned to ${booking.petName}'s booking!`);
}

async function openRescheduleModal(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const packages = await getPackages();
  const groomers = await getGroomers();
  const timeSlots = ['9am-12pm', '12pm-3pm', '3pm-6pm']; // 3-hour intervals

  // Ensure packages is an array
  const pkList = Array.isArray(packages) ? packages : (packages ? Object.values(packages) : []);

  // Filter packages - show all except addons, or filter by pet type if needed
  const availablePackages = pkList.filter(pkg => {
    if (pkg.type === 'addon') return false;
    if (pkg.type === 'any') return true;
    return !booking.petType || pkg.type === booking.petType;
  });

  const timeOptions = timeSlots.map(time => `
    <option value="${time}" ${booking.time === time ? 'selected' : ''}>${time}</option>
  `).join('');

  const packageOptions = availablePackages.map(pkg => {
    const minPrice = pkg.tiers && pkg.tiers.length > 0 ? pkg.tiers[0].price : (pkg.price || 0);
    return `
      <option value="${pkg.id}" ${booking.packageId === pkg.id ? 'selected' : ''}>
        ${escapeHtml(pkg.name)} • ₱${minPrice}
      </option>
    `;
  }).join('');

  const groomerOptions = groomers.map(g => `
    <option value="${g.id}" ${booking.groomerId === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>
  `).join('');

  showModal(`
    <h3>Reschedule ${escapeHtml(booking.petName)}</h3>
    <form id="rescheduleForm" onsubmit="handleRescheduleSubmit(event, '${booking.id}')">
      <div class="form-group">
        <label class="form-label" for="rescheduleGroomer">Groomer</label>
        <select id="rescheduleGroomer" class="form-select" required>
          ${groomerOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="rescheduleDate">New Date</label>
        <input type="date" id="rescheduleDate" class="calendar-input" value="${booking.date}" min="${getMinDate()}" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="rescheduleTime">Time Slot</label>
        <select id="rescheduleTime" class="form-select" required>${timeOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label" for="reschedulePackage">Service</label>
        <select id="reschedulePackage" class="form-select" required>${packageOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label" for="rescheduleNote">Note to customer</label>
        <textarea id="rescheduleNote" class="form-input" rows="3" placeholder="Optional instructions or reason"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" type="submit">Save Changes</button>
        <button class="btn btn-outline" type="button" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `);
}

async function handleRescheduleSubmit(event, bookingId) {
  event.preventDefault();
  const groomerInput = document.getElementById('rescheduleGroomer');
  const dateInput = document.getElementById('rescheduleDate');
  const timeInput = document.getElementById('rescheduleTime');
  const packageInput = document.getElementById('reschedulePackage');
  const noteInput = document.getElementById('rescheduleNote');

  const newGroomerId = groomerInput?.value;
  const newDate = dateInput?.value;
  const newTime = timeInput?.value;
  const newPackageId = packageInput?.value;
  if (!newGroomerId || !newDate || !newTime || !newPackageId) {
    customAlert.warning('Please complete all fields.');
    return;
  }

  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  // Check if the new time slot is available (only if groomer or date/time changed)
  if ((newGroomerId !== booking.groomerId || newDate !== booking.date || newTime !== booking.time)) {
    // Check availability excluding current booking
    const conflictingBooking = bookings.find(b =>
      b.id !== bookingId &&
      b.groomerId === newGroomerId &&
      b.date === newDate &&
      b.time === newTime &&
      !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(b.status)
    );
    if (conflictingBooking) {
      // Cancel the conflicting booking automatically
      // We need to pause execution here until user confirms
      // Ask for confirmation then continue with the reschedule if confirmed
      customAlert.confirm('Confirm', `This time slot is already booked by ${conflictingBooking.customerName}. Cancel that booking and reschedule this one?`).then((confirmed) => {
        if (confirmed) {
          conflictingBooking.status = 'cancelledByAdmin';
          conflictingBooking.cancellationNote = `Cancelled due to reschedule conflict with booking ${getBookingDisplayCode(booking)}`;
          logBookingHistory({
            bookingId: conflictingBooking.id,
            action: 'cancelled',
            message: `Cancelled due to reschedule conflict`,
            actor: 'admin'
          });
          saveBookings(bookings);

          // Continue with rescheduling
          proceedWithReschedule();
        }
      });
      return;
    }
  }

  proceedWithReschedule();

  function proceedWithReschedule() {
    const pkListInner = Array.isArray(packages) ? packages : (packages ? Object.values(packages) : []);
    const grListInner = Array.isArray(groomers) ? groomers : (groomers ? Object.values(groomers) : []);
    const selectedPackage = pkListInner.find(pkg => pkg.id === newPackageId);
    const selectedGroomer = grListInner.find(g => g.id === newGroomerId);

    booking.groomerId = newGroomerId;
    booking.groomerName = selectedGroomer ? selectedGroomer.name : booking.groomerName;
    booking.date = newDate;
    booking.time = newTime;
    booking.packageId = newPackageId;
    booking.packageName = selectedPackage ? selectedPackage.name : booking.packageName;
    booking.status = 'pending';

    saveBookings(bookings);
    logBookingHistory({
      bookingId,
      action: 'rescheduled',
      message: `Moved to ${formatDate(newDate)} at ${formatTime(newTime)}. ${selectedPackage ? selectedPackage.name : ''} with ${selectedGroomer ? selectedGroomer.name : 'groomer'}`,
      actor: 'admin',
      note: noteInput?.value?.trim() || ''
    });

    closeModal();
    switchView(currentView);
    customAlert.success('Booking rescheduled and set to pending for confirmation.');
  }
}

function openCancelModal(bookingId) {
  showModal(`
    <h3>Cancel Appointment</h3>
    <p style="color:var(--gray-600);">Share the reason so the customer sees it on their dashboard.</p>
    <div class="form-group">
      <label class="form-label" for="adminCancelNote">Reason</label>
      <textarea id="adminCancelNote" class="form-input" rows="3" placeholder="e.g. Groomer is on emergency leave"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-danger" onclick="handleAdminCancel('${bookingId}')">Cancel Booking</button>
      <button class="btn btn-outline" onclick="closeModal()">Keep Booking</button>
    </div>
  `);
}

function handleAdminCancel(bookingId) {
  const note = document.getElementById('adminCancelNote')?.value?.trim() || 'Cancelled by admin';
  cancelBooking(bookingId, note, true);
  switchView(currentView);
  customAlert.success('Booking cancelled and customer notified.');
}

async function loadGalleryView() {
  const container = document.getElementById('galleryGrid');
  if (!container) return;

  container.innerHTML = '<p style="text-align: center; color: var(--gray-600);">Loading gallery...</p>';

  try {
    const bookings = await getBookings();
    const filterStatus = document.getElementById('galleryStatusFilter')?.value || 'confirmed';

    // Filter bookings based on selection
    let filteredBookings = bookings;
    if (filterStatus === 'with-images') {
      filteredBookings = bookings.filter(b => b.beforeImage || b.afterImage);
    } else if (filterStatus === 'featured') {
      filteredBookings = bookings.filter(b => b.isFeatured && (b.beforeImage || b.afterImage));
    } else {
      filteredBookings = bookings.filter(b => b.status === 'confirmed');
    }

    if (!filteredBookings.length) {
      container.innerHTML = '<p style="text-align: center; color: var(--gray-600);">No bookings found.</p>';
      return;
    }

    // Sort by date, newest first
    filteredBookings.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = filteredBookings.map(booking => `
      <div class="gallery-card" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; background: var(--bg-secondary); display: flex; flex-direction: column; gap: 0.75rem;">
        
        <!-- Booking Info -->
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 0.5rem;">
          <div>
            <div style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(booking.petName || 'Pet')}</div>
            <div style="font-size: 0.85rem; color: var(--gray-600);">
              ${escapeHtml(booking.petType || 'Unknown')} • ${escapeHtml(booking.packageId || 'No Package')}
            </div>
            <div style="font-size: 0.85rem; color: var(--gray-600);">
              ${new Date(booking.date).toLocaleDateString()}
            </div>
          </div>
          <div style="text-align: right;">
            ${booking.isFeatured ? '<span style="background: var(--accent-color); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; display: inline-block;">⭐ Featured</span>' : ''}
          </div>
        </div>

        <!-- Image Preview -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; min-height: 100px;">
          ${booking.beforeImage ? `<img src="${booking.beforeImage}" alt="Before" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="openMediaModal('${booking.id}')">` : '<div style="background: var(--gray-200); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--gray-500); font-size: 0.85rem;">Before</div>'}
          ${booking.afterImage ? `<img src="${booking.afterImage}" alt="After" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="openMediaModal('${booking.id}')">` : '<div style="background: var(--gray-200); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--gray-500); font-size: 0.85rem;">After</div>'}
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: space-between;">
          <button class="btn btn-outline btn-sm" onclick="openMediaModal('${booking.id}')" style="flex: 1; min-width: 80px;">
            📸 Upload Photos
          </button>
          <button class="btn ${booking.isFeatured ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="toggleFeatureGallery('${booking.id}')" style="flex: 1; min-width: 80px;">
            ⭐ ${booking.isFeatured ? 'Unfeature' : 'Feature'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="handleDeleteFeaturedImages('${booking.id}')" style="flex: 1; min-width: 80px;" ${!booking.beforeImage && !booking.afterImage ? 'disabled' : ''}>
            🗑️ Delete
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error loading gallery:', error);
    container.innerHTML = '<p style="text-align: center; color: var(--error-color);">Error loading gallery. Please try again.</p>';
  }
}

async function toggleFeatureGallery(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (booking.isFeatured) {
      await unmarkAsFeatured(bookingId);
      customAlert.success('Removed from featured');
    } else {
      if (!booking.beforeImage || !booking.afterImage) {
        customAlert.error('Please upload both before and after photos first');
        return;
      }
      await markAsFeatured(bookingId);
      customAlert.success('Added to featured');
    }
    
    loadGalleryView();
  } catch (error) {
    console.error('Error toggling feature:', error);
    customAlert.error('Error updating featured status');
  }
}

async function openMediaModal(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;
  showModal(`
    <h3>Attach Before & After · ${escapeHtml(booking.petName)}</h3>
    <div class="media-fieldset">
      <div class="form-group">
        <label class="form-label" for="beforeImageFile">Before Image</label>
        <input type="file" id="beforeImageFile" class="form-input" accept="image/*">
        <input type="text" id="beforeImageInput" class="form-input" style="margin-top:0.5rem;" value="${booking.beforeImage || ''}" placeholder="Or paste hosted image URL">
        <div class="media-preview" id="beforePreview">
          ${booking.beforeImage ? `<img src="${booking.beforeImage}" alt="Before photo">` : '<p>No photo yet.</p>'}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="afterImageFile">After Image</label>
        <input type="file" id="afterImageFile" class="form-input" accept="image/*">
        <input type="text" id="afterImageInput" class="form-input" style="margin-top:0.5rem;" value="${booking.afterImage || ''}" placeholder="Or paste hosted image URL">
        <div class="media-preview" id="afterPreview">
          ${booking.afterImage ? `<img src="${booking.afterImage}" alt="After photo">` : '<p>No photo yet.</p>'}
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="handleMediaSubmit('${booking.id}')">Save Gallery</button>
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
    </div>
  `);

  document.getElementById('beforeImageFile')?.addEventListener('change', (event) => {
    handleMediaFileChange(event, 'beforeImageInput', 'beforePreview');
  });
  document.getElementById('afterImageFile')?.addEventListener('change', (event) => {
    handleMediaFileChange(event, 'afterImageInput', 'afterPreview');
  });
}

async function handleMediaSubmit(bookingId) {
  const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB in bytes
  const beforeInput = document.getElementById('beforeImageInput');
  const afterInput = document.getElementById('afterImageInput');
  
  // Validate data URLs/inputs for size
  const beforeValue = beforeInput?.value?.trim() || '';
  const afterValue = afterInput?.value?.trim() || '';
  
  // Rough check: Data URLs are ~1.33x the original size
  if (beforeValue.length > MAX_FILE_SIZE * 1.5) {
    customAlert.error('Before image is too large (max 8 MB). Please choose a smaller file.');
    console.warn('Before image exceeds 8 MB limit. Size:', beforeValue.length);
    return;
  }
  if (afterValue.length > MAX_FILE_SIZE * 1.5) {
    customAlert.error('After image is too large (max 8 MB). Please choose a smaller file.');
    console.warn('After image exceeds 8 MB limit. Size:', afterValue.length);
    return;
  }
  
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) {
    customAlert.error('Booking not found.');
    console.error('Booking not found for ID:', bookingId);
    return;
  }
  
  booking.beforeImage = beforeValue;
  booking.afterImage = afterValue;
  
  try {
    console.log(`[Media Upload] Saving booking ${bookingId} with images...`);
    console.log(`[Media Upload] Before image size: ${beforeValue.length} bytes`);
    console.log(`[Media Upload] After image size: ${afterValue.length} bytes`);
    
    await saveBookings(bookings);
    
    console.log(`[Media Upload] ✅ Successfully saved booking ${bookingId} to Firebase`);
    
    logBookingHistory({
      bookingId,
      action: 'media_updated',
      message: 'Updated grooming gallery',
      actor: 'admin'
    });
    closeModal();
    customAlert.success('✅ Gallery updated for the customer!');
    await renderCommunityReviewFeed('adminReviewFeed', 6);
  } catch (error) {
    console.error(`[Media Upload] ❌ Failed to save booking ${bookingId}:`, error);
    customAlert.error('Failed to save gallery. Check console for details.');
  }
}

function handleMediaFileChange(event, inputId, previewId) {
  const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
  const file = event.target.files?.[0];
  
  if (!file) {
    console.log(`[File Select] No file selected for ${inputId}`);
    return;
  }
  
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    customAlert.error(`File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max 8 MB.`);
    console.warn(`[File Select] ❌ File exceeds 8 MB limit: ${file.name} (${file.size} bytes)`);
    event.target.value = ''; // Clear input
    return;
  }
  
  console.log(`[File Select] Reading file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const input = document.getElementById(inputId);
    if (input) {
      input.value = dataUrl;
      console.log(`[File Select] ✅ Converted to Base64 Data URL (${(dataUrl.length / 1024).toFixed(2)} KB) for ${inputId}`);
    }
    updateMediaPreview(previewId, dataUrl);
  };
  reader.onerror = (err) => {
    console.error(`[File Select] ❌ FileReader error for ${inputId}:`, err);
    customAlert.error('Failed to read file. Please try again.');
  };
  reader.readAsDataURL(file);
}

function updateMediaPreview(previewId, src) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  if (src) {
    preview.innerHTML = `<img src="${src}" alt="Uploaded preview">`;
  } else {
    preview.innerHTML = '<p>No photo yet.</p>';
  }
}

function openNoShowModal(bookingId) {
  showModal(`
    <h3>Mark as No-show</h3>
    <p style="color:var(--gray-600);">This will cancel the booking, log a warning, and notify the customer.</p>
    <div class="modal-actions">
      <button class="btn btn-danger" onclick="handleNoShowSubmit('${bookingId}')">Mark No-show</button>
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
    </div>
  `);
}

async function handleNoShowSubmit(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;
  booking.status = 'cancelledByAdmin';
  booking.cancellationNote = 'Marked as no-show by admin';
  await saveBookings(bookings);
  const warningInfo = await incrementCustomerWarning(booking.userId, `No-show on ${formatDate(booking.date)} at ${formatTime(booking.time)}`);
  logBookingHistory({
    bookingId,
    action: 'no_show',
    message: 'Marked as no-show, warning issued',
    actor: 'admin'
  });
  closeModal();
  switchView(currentView);
  customAlert.warning(`No-show recorded. Customer warnings: ${warningInfo?.warnings || 0}/5`);
  renderBlockedCustomersPanel();
}

// Groomer absences
function loadGroomerAbsencesView() {
  const absences = getStaffAbsences().sort((a, b) => b.createdAt - a.createdAt);
  renderGroomerAbsenceTable(absences);
}

function renderGroomerAbsenceTable(absences) {
  const container = document.getElementById('groomerAbsenceTable');
  if (!container) return;

  if (!absences.length) {
    container.innerHTML = '<p class="empty-state">No groomer absence requests yet.</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Groomer</th>
            <th>Date</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Proof</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${absences.map(absence => {
    const badgeClass = absence.status === 'approved'
      ? 'badge-confirmed'
      : absence.status === 'pending'
        ? 'badge-pending'
        : 'badge-cancelled';
    return `
              <tr>
                <td>${escapeHtml(absence.staffName)}</td>
                <td>${formatDate(absence.date)}</td>
                <td>${escapeHtml(absence.reason)}</td>
                <td><span class="badge ${badgeClass}">${escapeHtml(absence.status)}</span></td>
                <td>${absence.proofData ? `<button class="btn btn-outline btn-sm" onclick="previewAbsenceProof('${absence.id}')">View</button>` : '—'}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="openAbsenceDetail('${absence.id}')">Review</button>
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function previewAbsenceProof(absenceId) {
  const absence = getStaffAbsences().find(a => a.id === absenceId);
  if (!absence || !absence.proofData) return;

  showModal(`
    <h3>Proof from ${escapeHtml(absence.staffName)}</h3>
    ${absence.proofData.includes('pdf')
      ? `<iframe src="${absence.proofData}" style="width:100%;height:400px;"></iframe>`
      : `<img src="${absence.proofData}" alt="Proof" style="width:100%;border-radius:var(--radius);">`}
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
    </div>
  `);
}

function openAbsenceDetail(absenceId) {
  const absence = getStaffAbsences().find(a => a.id === absenceId);
  if (!absence) return;

  const canReview = absence.status === 'pending';
  showModal(`
    <h3>Review ${escapeHtml(absence.staffName)}</h3>
    <p><strong>Date:</strong> ${formatDate(absence.date)}</p>
    <p><strong>Reason:</strong> ${escapeHtml(absence.reason)}</p>
    ${absence.proofData ? `<div style="margin:1rem 0;">
      ${absence.proofData.includes('pdf')
        ? `<iframe src="${absence.proofData}" style="width:100%;height:320px;"></iframe>`
        : `<img src="${absence.proofData}" style="width:100%;border-radius:var(--radius);">`}
    </div>` : '<p>No proof submitted.</p>'}
    <div class="form-group">
      <label class="form-label" for="absenceNote">Admin Note</label>
      <textarea id="absenceNote" class="form-input" rows="3" placeholder="Add a note for the groomer">${absence.adminNote || ''}</textarea>
    </div>
    <div class="modal-actions">
      ${canReview ? `
        <button class="btn btn-success btn-sm" onclick="processAbsence('${absence.id}', 'approved')">Approve</button>
        <button class="btn btn-danger btn-sm" onclick="processAbsence('${absence.id}', 'rejected')">Reject</button>
      ` : ''}
      <button class="btn btn-outline btn-sm" onclick="closeModal()">Close</button>
    </div>
  `);
}

function processAbsence(absenceId, status) {
  const absences = getStaffAbsences();
  const absence = absences.find(a => a.id === absenceId);
  if (!absence) return;

  const noteInput = document.getElementById('absenceNote');
  absence.status = status;
  absence.adminNote = noteInput ? noteInput.value.trim() : '';
  absence.reviewedAt = Date.now();

  saveStaffAbsences(absences);
  closeModal();
  loadGroomerAbsencesView();
  updateGroomerAlertPanel(absences);
  alert(`Marked as ${status}.`);
}

function updateGroomerAlertPanel(absences = getStaffAbsences()) {
  const container = document.getElementById('staffAlertPanel');
  if (!container) return;

  const pending = absences.filter(a => a.status === 'pending');
  if (pending.length === 0) {
    container.innerHTML = '<p class="empty-state" style="margin:0;">All caught up!</p>';
    return;
  }

  container.innerHTML = pending.slice(0, 3).map(absence => `
    <div class="sidebar-panel-item">
      <strong>${escapeHtml(absence.staffName || 'Groomer')}</strong>
      <p style="margin:0.25rem 0;">${formatDate(absence.date)}</p>
      <button class="btn btn-outline btn-sm" data-absence-id="${absence.id}">Review</button>
    </div>
  `).join('') + (pending.length > 3 ? `<p style="font-size:0.875rem;color:var(--gray-500);">+${pending.length - 3} more</p>` : '');

  container.querySelectorAll('[data-absence-id]').forEach(btn => {
    btn.addEventListener('click', () => openAbsenceDetail(btn.dataset.absenceId));
  });
}

async function renderBlockedCustomersPanel() {
  const container = document.getElementById('blockedCustomersPanel');
  if (!container) return;
  const blocked = (await getUsers()).filter(user => user.role === 'customer' && user.isBanned);
  const bookings = await getBookings();

  if (!blocked.length) {
    container.innerHTML = '<p class="empty-state" style="margin:0; font-size:0.85rem;">No blocked customers</p>';
    return;
  }

  container.innerHTML = blocked.map(user => {
    // Find no-show bookings for this user
    const noShowBookings = bookings.filter(b =>
      b.userId === user.id &&
      ['cancelledByAdmin'].includes(b.status) &&
      b.cancellationNote?.toLowerCase().includes('no-show')
    );

    return `
      <div class="sidebar-panel-item" style="margin-bottom:0.75rem; padding:0.75rem; background:var(--gray-50); border-radius:var(--radius-sm);">
        <strong>${escapeHtml(user.name)}</strong>
        <p style="margin:0.25rem 0; font-size:0.85rem; color:var(--gray-600);">${user.warningCount || 0}/5 warnings</p>
        ${noShowBookings.length ? `<p style="margin:0.25rem 0; font-size:0.85rem; color:var(--warning-600);">${noShowBookings.length} no-show(s)</p>` : ''}
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-lift-ban="${user.id}">Confirm Lift</button>
          ${noShowBookings.length ? `<button class="btn btn-outline btn-sm" onclick="viewNoShowBookings('${user.id}')">View Details</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-lift-ban]').forEach(btn => {
    btn.addEventListener('click', () => openLiftBanModal(btn.dataset.liftBan));
  });
}

async function openLiftBanModal(userId) {
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const banUpliftFee = typeof BAN_UPLIFT_FEE !== 'undefined' ? BAN_UPLIFT_FEE : 500;

  showModal(`
    <h3>Lift Ban for ${escapeHtml(user.name)}</h3>
    <p style="color: var(--gray-600); margin-bottom: 1rem;">
      ${user.warningCount || 0}/5 warnings · ${user.isBanned ? 'Currently banned' : 'Active'}
    </p>
    <div style="background: #fff3cd; padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; border-left: 4px solid #ff9800;">
      <p style="margin: 0; color: #000; font-weight: 600;">⚠️ Ban Uplift Fee Required</p>
      <p style="margin: 0.5rem 0 0 0; color: #333; font-size: 0.95rem;">
        Customer must pay <strong>₱${banUpliftFee}</strong> to lift the ban and reset warnings.
      </p>
    </div>
    <div class="form-group">
      <label style="font-weight: 600; color: var(--gray-900);">Verify Payment:</label>
      <div style="display: flex; gap: 0.5rem;">
        <input type="checkbox" id="banPaymentVerified" style="width: 20px; height: 20px; cursor: pointer;">
        <label for="banPaymentVerified" style="cursor: pointer; color: var(--gray-700);">
          Customer has paid ₱${banUpliftFee} ban uplift fee
        </label>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="liftBanConfirmBtn" disabled onclick="handleLiftBan('${userId}', true)">Confirm & Lift Ban</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
    </div>
  `);

  // Enable/disable confirm button based on checkbox
  const checkbox = document.getElementById('banPaymentVerified');
  const confirmBtn = document.getElementById('liftBanConfirmBtn');
  if (checkbox && confirmBtn) {
    checkbox.addEventListener('change', function () {
      confirmBtn.disabled = !this.checked;
    });
  }
}

async function viewNoShowBookings(userId) {
  const bookings = await getBookings();
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  const noShowBookings = bookings.filter(b =>
    b.userId === userId &&
    ['cancelledByAdmin'].includes(b.status) &&
    b.cancellationNote?.toLowerCase().includes('no-show')
  );

  if (!noShowBookings.length) {
    alert('No no-show bookings found for this customer.');
    return;
  }

  const bookingsList = noShowBookings.map(b => `
    <div style="padding:0.75rem; margin-bottom:0.5rem; background:var(--gray-50); border-radius:var(--radius-sm);">
      <strong>${escapeHtml(b.petName)}</strong><br>
      <span style="font-size:0.85rem; color:var(--gray-600);">
        ${formatDate(b.date)} at ${formatTime(b.time)}<br>
        ${b.groomerName ? `Groomer: ${escapeHtml(b.groomerName)}` : ''}
      </span>
      <div style="margin-top:0.5rem;">
        <button class="btn btn-danger btn-sm" onclick="cancelBookingForDate('${b.date}', '${b.groomerId || ''}')">Cancel Date/Groomer</button>
      </div>
    </div>
  `).join('');

  showModal(`
    <h3>No-Show Bookings for ${escapeHtml(user?.name || 'Customer')}</h3>
    <div style="max-height:400px; overflow-y:auto;">
      ${bookingsList}
    </div>
    <div class="modal-actions" style="margin-top:1rem;">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
    </div>
  `);
}

async function cancelBookingForDate(date, groomerId) {
  const bookings = await getBookings();
  let cancelled = 0;

  bookings.forEach(booking => {
    if (booking.date === date &&
      (!groomerId || booking.groomerId === groomerId) &&
      !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(booking.status)) {
      booking.status = 'cancelledByAdmin';
      booking.cancellationNote = `Cancelled due to no-show on ${formatDate(date)}`;
      cancelled++;
      logBookingHistory({
        bookingId: booking.id,
        action: 'cancelled',
        message: booking.cancellationNote,
        actor: 'admin'
      });
    }
  });

  if (cancelled > 0) {
    saveBookings(bookings);
    alert(`${cancelled} booking(s) cancelled for ${formatDate(date)}${groomerId ? ' with selected groomer' : ''}.`);
    closeModal();
    loadOverview();
  } else {
    alert('No bookings found to cancel.');
  }
}

async function handleLiftBan(userId, skipPrompt = false) {
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  if (!skipPrompt && !confirm(`Confirm that ${user.name} paid the ₱500 ban uplift fee and reset warnings to 0?`)) {
    return;
  }
  await liftCustomerBan(userId, {
    reason: 'Admin cleared ban after ₱500 payment verified',
    resetWarnings: true
  });
  await renderBlockedCustomersPanel();
  await renderLiftBanPanel();
  closeModal();
  alert(`✓ ${user.name} ban lifted. Warnings reset to 0.`);
}

// Booking history log view
let adminHistoryState = {
  page: 1,
  pageSize: 5
};

async function renderBookingHistory() {
  const container = document.getElementById('bookingHistoryTable');
  if (!container) return;

  const history = getBookingHistory().sort((a, b) => b.timestamp - a.timestamp);
  const bookings = await getBookings();
  if (!history.length) {
    container.innerHTML = '<p class="empty-state">No booking activity yet.</p>';
    const controls = document.getElementById('historyControls');
    if (controls) controls.innerHTML = '';
    return;
  }

  // Pagination controls
  const totalPages = Math.ceil(history.length / adminHistoryState.pageSize);
  const start = (adminHistoryState.page - 1) * adminHistoryState.pageSize;
  const end = start + adminHistoryState.pageSize;
  const currentHistory = history.slice(start, end);

  const controls = document.getElementById('historyControls');
  if (controls) {
    controls.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <label for="historyPageSize" style="font-size: 0.9rem; color: var(--gray-600);">Show:</label>
          <select id="historyPageSize" class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeHistoryPageSize(this.value)">
            <option value="3" ${adminHistoryState.pageSize === 3 ? 'selected' : ''}>3</option>
            <option value="5" ${adminHistoryState.pageSize === 5 ? 'selected' : ''}>5</option>
            <option value="10" ${adminHistoryState.pageSize === 10 ? 'selected' : ''}>10</option>
            <option value="20" ${adminHistoryState.pageSize === 20 ? 'selected' : ''}>20</option>
          </select>
          <span style="font-size: 0.9rem; color: var(--gray-600);">entries</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 0.9rem; color: var(--gray-600);">
            Showing ${start + 1} to ${Math.min(end, history.length)} of ${history.length}
          </span>
          ${totalPages > 1 ? `
            <button class="btn btn-outline btn-sm" onclick="changeHistoryPage(${adminHistoryState.page - 1})" ${adminHistoryState.page === 1 ? 'disabled' : ''}>Previous</button>
            <span style="font-size: 0.9rem; color: var(--gray-600);">Page ${adminHistoryState.page} of ${totalPages}</span>
            <button class="btn btn-outline btn-sm" onclick="changeHistoryPage(${adminHistoryState.page + 1})" ${adminHistoryState.page === totalPages ? 'disabled' : ''}>Next</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Booking ID</th>
            <th>Action</th>
            <th>Details</th>
            <th>Total</th>
            <th>Manage</th>
          </tr>
        </thead>
        <tbody>
          ${currentHistory.map(entry => {
    const booking = bookings.find(b => b.id === entry.bookingId);
    const displayCode = booking
      ? (typeof getBookingDisplayCode === 'function'
        ? getBookingDisplayCode(booking)
        : (booking.shortId || booking.id))
      : entry.bookingId;
    return `
            <tr>
              <td>${new Date(entry.timestamp).toLocaleString()}</td>
              <td>${escapeHtml(displayCode)}</td>
              <td>${escapeHtml(entry.action)}${entry.actor ? ` (${escapeHtml(entry.actor)})` : ''}</td>
              <td>
                ${formatHistoryDetails(entry, bookings)}
              </td>
              <td>${formatHistoryAmount(entry.bookingId, bookings)}</td>
              <td>${renderHistoryActions(entry.bookingId, bookings)}</td>
            </tr>
          `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('[data-history-cancel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookingId = btn.dataset.historyCancel;
      cancelBooking(bookingId);
    });
  });
}

function changeHistoryPageSize(newSize) {
  adminHistoryState.pageSize = parseInt(newSize);
  adminHistoryState.page = 1;
  renderBookingHistory();
}

function changeHistoryPage(newPage) {
  const history = getBookingHistory();
  const totalPages = Math.ceil(history.length / adminHistoryState.pageSize);
  if (newPage >= 1 && newPage <= totalPages) {
    adminHistoryState.page = newPage;
    renderBookingHistory();
  }
}

function getBookingForHistory(bookingId, bookings = []) {
  return bookings.find(b => b.id === bookingId);
}

function formatHistoryDetails(entry, bookings = []) {
  const booking = getBookingForHistory(entry.bookingId, bookings);
  let detailText = escapeHtml(entry.message || entry.note || '');
  if (booking) {
    const status = formatBookingStatus(booking.status);
    const cost = booking.cost;
    const total = booking.totalPrice || cost?.subtotal || 0;
    const balance = booking.balanceOnVisit ?? cost?.balanceOnVisit ?? 0;
    const bookingFee = cost?.bookingFee || 100;
    const services = Array.isArray(booking.singleServices) && booking.singleServices.length
      ? booking.singleServices.map(getSingleServiceLabel).join(', ')
      : '';
    const addOns = cost?.addOns?.length
      ? cost.addOns.map(addon => `${escapeHtml(addon.label)} (${formatCurrency(addon.price)})`).join(', ')
      : (booking.addOns?.length ? escapeHtml(booking.addOns.join(', ')) : '');

    detailText += `
      <div style="font-size:0.85rem; color:var(--gray-600); margin-top:0.35rem;">
        <strong>Status:</strong> ${escapeHtml(status)}<br>
        ${booking.petName ? `<strong>Pet:</strong> ${escapeHtml(booking.petName)}<br>` : ''}
        ${booking.packageName ? `<strong>Package:</strong> ${escapeHtml(booking.packageName)}<br>` : ''}
        ${cost?.weightLabel ? `<strong>Weight:</strong> ${escapeHtml(cost.weightLabel)}<br>` : ''}
        ${services ? `<strong>Services:</strong> ${escapeHtml(services)}<br>` : ''}
        ${addOns ? `<strong>Add-ons:</strong> ${addOns}<br>` : ''}
        ${total ? `<strong>Subtotal:</strong> ${formatCurrency(total)}<br>` : ''}
        <strong>Booking Fee:</strong> ${formatCurrency(bookingFee)}<br>
        ${balance ? `<strong>Balance on Visit:</strong> ${formatCurrency(balance)}<br>` : ''}
        ${cost?.totalAmount ? `<strong>Total Amount:</strong> ${formatCurrency(cost.totalAmount)}` : total ? `<strong>Total Amount:</strong> ${formatCurrency(total + bookingFee)}` : ''}
      </div>
    `;
  }
  return detailText || '—';
}

function formatHistoryAmount(bookingId, bookings = []) {
  const booking = getBookingForHistory(bookingId, bookings);
  if (!booking) return '—';
  const cost = booking.cost;
  const total = booking.totalPrice || cost?.subtotal || 0;
  const bookingFee = cost?.bookingFee || 100;
  const totalAmount = cost?.totalAmount || (total + bookingFee);
  return totalAmount ? formatCurrency(totalAmount) : '—';
}

function renderHistoryActions(bookingId, bookings = []) {
  const booking = getBookingForHistory(bookingId, bookings);
  if (!booking) return '—';

  const actions = [];

  if (booking.status === 'pending') {
    actions.push(`<button class="btn btn-success btn-sm" onclick="confirmBooking('${bookingId}')">Approve</button>`);
  }

  if (['pending', 'confirmed'].includes(booking.status)) {
    actions.push(`<button class="btn btn-secondary btn-sm" onclick="openRescheduleModal('${bookingId}')">Resched</button>`);
  }

  if (['pending', 'confirmed'].includes(booking.status)) {
    actions.push(`<button class="btn btn-danger btn-sm" onclick="openCancelModal('${bookingId}')">Cancel</button>`);
  }

  if (booking.status === 'confirmed') {
    actions.push(`<button class="btn btn-warning btn-sm" onclick="openNoShowModal('${bookingId}')">No Show</button>`);
  }

  if (actions.length === 0) {
    return '<span style="color:var(--gray-500); font-size:0.85rem;">No actions</span>';
  }

  return actions.join(' ');
}

function getSingleServiceLabel(serviceId) {
  const pricing = window.SINGLE_SERVICE_PRICING || {};
  return pricing[serviceId]?.label || serviceId;
}

function showModal(content) {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;
  modalRoot.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <button class="modal-close" onclick="closeModal()">×</button>
        ${content}
      </div>
    </div>
  `;
}

function closeModal() {
  const modalRoot = document.getElementById('modalRoot');
  if (modalRoot) {
    modalRoot.innerHTML = '';
  }
}

// Confirm booking
async function confirmBooking(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);

  if (!booking) return;

  // Check if groomer is assigned
  if (!booking.groomerId) {
    alert('❌ Please assign a groomer before confirming this booking.');
    openGroomerAssignmentModal(bookingId);
    return;
  }

  if (!confirm('Are you sure you want to confirm this booking?')) {
    return;
  }

  booking.status = 'confirmed';
  saveBookings(bookings);
  logBookingHistory({
    bookingId,
    action: 'confirmed',
    message: `Confirmed with ${booking.groomerName} for ${formatDate(booking.date)} at ${formatTime(booking.time)}`,
    actor: 'admin'
  });
  closeModal();

  // Reload current view
  switchView(currentView);
  alert('Booking confirmed successfully!');
}

// Complete booking (grooming service finished)
function completeBooking(bookingId) {
  // Show modal for grooming notes
  showGroomingNotesModal(bookingId);
}

// Show modal for entering grooming notes
function showGroomingNotesModal(bookingId) {
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === bookingId);

  if (!booking) {
    alert('Booking not found');
    return;
  }

  // Auto-extract preferred cut from customer's notes - check Notes for Groomer FIRST, then Medical Conditions
  let notesText = booking.bookingNotes || '';

  // If no bookingNotes, try other notes fields including medical (in case customer put cut there)
  if (!notesText) {
    notesText = booking.notes || booking.profile?.notes || booking.profile?.bookingNotes || '';
  }

  const preferredCut = extractPreferredCut(notesText);
  const prefilledNotes = booking.groomingNotes || (preferredCut ? `${preferredCut} cut` : notesText);

  const modalHTML = `
    <div class="modal-overlay" id="groomingNotesOverlay" onclick="closeGroomingNotesModal()">
      <div class="modal" onclick="event.stopPropagation()" style="max-width: 500px;">
        <div class="modal-header">
          <h2>Complete Grooming Service</h2>
          <button class="modal-close" onclick="closeGroomingNotesModal()">×</button>
        </div>
        <div class="modal-body">
          ${preferredCut ? `<div style="background: #e8f5e9; padding: 0.75rem; border-left: 4px solid #2e7d32; margin-bottom: 1rem; border-radius: 0.25rem;"><strong style="color: #2e7d32;">✂️ Auto-detected:</strong> <span style="color: #1b5e20;">Customer requested "${preferredCut}"</span></div>` : ''}
          <p style="margin-bottom: 1rem;">Please enter details about the grooming service performed:</p>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
            Type of Cut/Service Performed:
          </label>
          <textarea 
            id="groomingNotesInput" 
            placeholder="e.g., Summer cut, Bath & dry, Full grooming with styling, Nail trim only, etc."
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm); font-family: inherit; font-size: 0.95rem; min-height: 100px; resize: vertical;"
          >${escapeHtml(prefilledNotes)}</textarea>
          <p style="color: var(--gray-600); font-size: 0.85rem; margin-top: 0.5rem;">This will be visible to the customer in their booking history and reviews.</p>
        </div>
        <div class="modal-footer" style="display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button class="btn btn-outline btn-sm" onclick="closeGroomingNotesModal()">Cancel</button>
          <button class="btn btn-success btn-sm" onclick="submitGroomingNotes('${bookingId}')">Mark Completed</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.getElementById('groomingNotesOverlay').style.display = 'flex';
}

function closeGroomingNotesModal() {
  const modal = document.getElementById('groomingNotesOverlay');
  if (modal) {
    modal.remove();
  }
}

function submitGroomingNotes(bookingId) {
  const notes = document.getElementById('groomingNotesInput').value.trim();

  const bookings = getBookings();
  const booking = bookings.find(b => b.id === bookingId);

  if (booking) {
    booking.status = 'completed';
    booking.groomingNotes = notes;
    booking.completedAt = toLocalISO(new Date());
    saveBookings(bookings);
    logBookingHistory({
      bookingId,
      action: 'completed',
      message: `Grooming completed on ${formatDate(toLocalISO(new Date()))}. Service: ${notes || 'No details provided'}`,
      actor: 'admin'
    });
    closeGroomingNotesModal();

    // Reload current view
    switchView(currentView);
    alert('Booking marked as completed!');
  }
}

// Cancel booking
async function cancelBooking(bookingId, note = '', skipPrompt = false) {
  if (!skipPrompt && !confirm('Are you sure you want to cancel this booking?')) {
    return;
  }

  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);

  if (booking) {
    booking.status = 'cancelledByAdmin';
    booking.cancellationNote = note || 'Cancelled by admin';
    await saveBookings(bookings);
    logBookingHistory({
      bookingId,
      action: 'cancelled',
      message: booking.cancellationNote,
      actor: 'admin'
    });
    closeModal();

    // Reload current view
    switchView(currentView);
    alert('Booking cancelled successfully!');
  }
}

// Make functions globally available
window.confirmBooking = confirmBooking;
window.completeBooking = completeBooking;
window.cancelBooking = cancelBooking;
window.openBookingDetail = openBookingDetail;
window.openGroomerAssignmentModal = openGroomerAssignmentModal;
window.assignGroomerToBooking = assignGroomerToBooking;
window.sortBookings = sortBookings;
window.filterStatsByType = filterStatsByType;
window.openRescheduleModal = openRescheduleModal;
window.handleRescheduleSubmit = handleRescheduleSubmit;
window.openCancelModal = openCancelModal;
window.handleAdminCancel = handleAdminCancel;
window.openMediaModal = openMediaModal;
window.liftCustomerBan = liftCustomerBan;
window.showGroomingNotesModal = showGroomingNotesModal;
window.closeGroomingNotesModal = closeGroomingNotesModal;
window.submitGroomingNotes = submitGroomingNotes;
window.handleMediaSubmit = handleMediaSubmit;
window.openNoShowModal = openNoShowModal;
window.handleNoShowSubmit = handleNoShowSubmit;
window.previewAbsenceProof = previewAbsenceProof;
window.openAbsenceDetail = openAbsenceDetail;
window.processAbsence = processAbsence;
window.closeModal = closeModal;
window.changeRecentBookingsLimit = changeRecentBookingsLimit;
window.openLiftBanModal = openLiftBanModal;
window.viewNoShowBookings = viewNoShowBookings;
window.cancelBookingForDate = cancelBookingForDate;

async function renderLiftBanPanel() {
  const container = document.getElementById('liftBanPanel');
  if (!container) return;

  const users = await getUsers();
  const limit = typeof WARNING_HARD_LIMIT === 'number' ? WARNING_HARD_LIMIT : 5;
  const banned = users.filter(user =>
    user.role === 'customer' &&
    ((user.warningCount || 0) >= limit || user.isBanned)
  );

  if (!banned.length) {
    container.innerHTML = '<p class="empty-state" style="margin:0; font-size:0.85rem;">No customers awaiting lift approval</p>';
    return;
  }

  container.innerHTML = banned.slice(0, 4).map(user => `
    <div class="sidebar-panel-item" style="margin-bottom:0.75rem; padding:0.75rem; background:var(--warning-50); border-radius:var(--radius-sm);">
      <strong>${escapeHtml(user.name)}</strong>
      <p style="margin:0.25rem 0; font-size:0.85rem; color:var(--gray-600);">
        ${user.warningCount || 0}/${limit} warnings · ${user.isBanned ? 'Banned' : 'Flagged'}
      </p>
      <button class="btn btn-outline btn-sm" data-lift-ban="${user.id}">Confirm Lift Ban</button>
    </div>
  `).join('') + (banned.length > 4 ? `<p style="font-size:0.85rem;color:var(--gray-500);">+${banned.length - 4} more needing review</p>` : '');

  container.querySelectorAll('[data-lift-ban]').forEach(btn => {
    btn.addEventListener('click', () => openLiftBanModal(btn.dataset.liftBan));
  });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatBookingStatus(status) {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'confirmed':
      return 'confirmed';
    case 'completed':
      return 'completed';
    case 'cancelledByCustomer':
      return 'cancelled by customer';
    case 'cancelledByAdmin':
      return 'cancelled by admin';
    default:
      return status;
  }
}

// Render featured cuts management panel
async function renderFeaturedCutsPanel() {
  const container = document.getElementById('featuredCutsPanel');
  if (!container) return;
  
  try {
    const featured = await getFeaturedBookings(100); // Get all featured for management
    const totalWithImages = (await getBookings()).filter(b => b.beforeImage && b.afterImage).length;
    
    if (featured.length === 0) {
      container.innerHTML = `
        <div style="padding: 1rem; background: #f9f9f9; border-radius: 0.5rem; border-left: 4px solid #ff9800;">
          <p style="margin: 0; color: #666;"><strong>📸 Featured Cuts:</strong> None yet</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #999;">Mark bookings with images as "Featured" to showcase them on the home page.</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #999;">Total with images: ${totalWithImages}</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="padding: 1rem; background: #f0f9ff; border-radius: 0.5rem; border-left: 4px solid #2196f3;">
        <p style="margin: 0 0 0.75rem 0; font-weight: 600; color: #000;">📸 Featured Cuts (${featured.length}/${Math.min(4, totalWithImages)})</p>
        <div style="display: grid; gap: 0.75rem;">
          ${featured.map(booking => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: white; border-radius: 0.25rem; border: 1px solid #e0e0e0;">
              <div>
                <strong style="color: #000;">${escapeHtml(booking.petName)}</strong> · ${escapeHtml(booking.packageName || 'Custom')}
                <br>
                <span style="font-size: 0.85rem; color: #666;">${formatDate(booking.date)} · ${escapeHtml(booking.groomerName)}</span>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-sm btn-outline" onclick="unmarkAsFeatured('${booking.id}'); renderFeaturedCutsPanel();" style="border: 1px solid #f44336; color: #f44336;">Unfeature</button>
                <button class="btn btn-sm btn-danger" onclick="handleDeleteFeaturedImages('${booking.id}');" style="background: #ff6b6b; border: 1px solid #ff6b6b;">Delete Images</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('[Featured] Error rendering panel:', error);
    container.innerHTML = `<div style="padding: 1rem; color: #d32f2f;">Error loading featured cuts.</div>`;
  }
}

// Handle delete images from featured
function handleDeleteFeaturedImages(bookingId) {
  if (!confirm('Delete images from this booking? The booking will remain in the system.')) return;
  
  deleteBookingImages(bookingId).then(success => {
    if (success) {
      customAlert.success('Images deleted. Booking unfeature will refresh.');
      renderFeaturedCutsPanel();
    } else {
      customAlert.error('Failed to delete images.');
    }
  });
}

// Toggle featured status for a booking
async function toggleFeature(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !booking.beforeImage || !booking.afterImage) {
      customAlert.error('Booking must have images before featuring.');
      return;
    }
    
    if (booking.isFeatured) {
      await unmarkAsFeatured(bookingId);
      customAlert.success('Removed from featured gallery.');
    } else {
      await markAsFeatured(bookingId);
      customAlert.success('Added to featured gallery!');
    }
    
    // Refresh the booking detail and panels
    await renderFeaturedCutsPanel();
    openBookingDetail(bookingId);
  } catch (error) {
    console.error('Error toggling feature:', error);
    customAlert.error('Failed to update feature status.');
  }
}

// Walk-in booking state
let walkInBookingData = {
  step: 1,
  petType: null,
  packageId: null,
  groomerId: null,
  date: null,
  time: null,
  customerName: '',
  phone: '',
  petName: '',
  vaccination: '',
  weight: '',
  singleServices: [],
  addOns: []
};

// Load walk-in appointment form
function loadWalkInForm() {
  walkInBookingData = {
    step: 1,
    petType: null,
    packageId: null,
    groomerId: null,
    date: null,
    time: null,
    customerName: '',
    phone: '',
    petName: '',
    vaccination: '',
    weight: ''
  };

  // Setup pet type selection
  document.querySelectorAll('.pet-type-card').forEach(card => {
    card.addEventListener('click', function () {
      const petType = this.dataset.petType;
      walkInBookingData.petType = petType;
      document.querySelectorAll('.pet-type-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      setTimeout(() => walkInNextStep(), 300);
    });
  });

  // Setup navigation buttons
  const prevBtn = document.getElementById('walkInPrevBtn');
  const nextBtn = document.getElementById('walkInNextBtn');
  const submitBtn = document.getElementById('walkInSubmitBtn');

  if (prevBtn) prevBtn.addEventListener('click', walkInPrevStep);
  if (nextBtn) nextBtn.addEventListener('click', walkInNextStep);
  if (submitBtn) submitBtn.addEventListener('click', handleWalkInSubmit);

  // Setup form submission
  const form = document.getElementById('walkInForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      walkInNextStep();
    });
  }

  updateWalkInStep(1);
  updateWalkInSummary();
}

function updateWalkInStep(step) {
  walkInBookingData.step = step;

  // Update step indicators
  document.querySelectorAll('.booking-steps .step').forEach((s, i) => {
    const stepNum = parseInt(s.dataset.step);
    s.classList.toggle('active', stepNum === step);
    s.classList.toggle('completed', stepNum < step);
  });

  // Show/hide step content
  for (let i = 1; i <= 5; i++) {
    const stepContent = document.getElementById(`walkInStep${i}`);
    if (stepContent) {
      stepContent.style.display = i === step ? 'block' : 'none';
    }
  }

  // Show/hide navigation buttons
  const prevBtn = document.getElementById('walkInPrevBtn');
  const nextBtn = document.getElementById('walkInNextBtn');
  const submitBtn = document.getElementById('walkInSubmitBtn');

  if (prevBtn) prevBtn.style.display = step > 1 ? 'block' : 'none';
  if (nextBtn) nextBtn.style.display = step < 5 ? 'block' : 'none';
  if (submitBtn) submitBtn.style.display = step === 5 ? 'block' : 'none';

  // Load step-specific content asynchronously
  if (step === 2) loadWalkInPackages().catch(e => console.warn('loadWalkInPackages failed:', e));
  if (step === 3) loadWalkInGroomers();
  if (step === 4) loadWalkInCustomerForm();
  if (step === 5) loadWalkInReview().catch(e => console.warn('loadWalkInReview failed:', e));

  updateWalkInSummary().catch(e => console.warn('updateWalkInSummary failed:', e));
}

function walkInNextStep() {
  if (walkInBookingData.step === 1 && !walkInBookingData.petType) {
    alert('Please select a pet type');
    return;
  }
  if (walkInBookingData.step === 2 && !walkInBookingData.packageId) {
    alert('Please select a package');
    return;
  }
  if (walkInBookingData.step === 3) {
    if (!walkInBookingData.groomerId || !walkInBookingData.date || !walkInBookingData.time) {
      alert('Please select a groomer, date, and time');
      return;
    }
    if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(walkInBookingData.date)) {
      alert('Selected date is closed. Please choose another date.');
      return;
    }
  }
  if (walkInBookingData.step === 4) {
    const name = document.getElementById('walkInName')?.value.trim();
    const phone = document.getElementById('walkInPhone')?.value.trim();
    const petName = document.getElementById('walkInPetName')?.value.trim();
    const vaccination = document.querySelector('input[name="walkInVaccination"]:checked')?.value;
    const weight = document.getElementById('walkInWeight')?.value;

    if (!name || !phone || !petName || !vaccination || !weight) {
      alert('Please complete all customer information fields');
      return;
    }

    if (!validatePhoneNumber(phone)) {
      alert('Please enter a valid 11-digit phone number (starting with 0 or +63)');
      return;
    }

    walkInBookingData.customerName = name;
    walkInBookingData.phone = phone;
    walkInBookingData.petName = petName;
    walkInBookingData.vaccination = vaccination;
    walkInBookingData.weight = weight;
  }

  if (walkInBookingData.step < 5) {
    updateWalkInStep(walkInBookingData.step + 1);
  }
}

function walkInPrevStep() {
  if (walkInBookingData.step > 1) {
    updateWalkInStep(walkInBookingData.step - 1);
  }
}

async function loadWalkInPackages() {
  const container = document.getElementById('walkInPackagesContainer');
  if (!container) return;

  const packagesRaw = await getPackages().catch(() => []);
  const packagesList = Array.isArray(packagesRaw) ? packagesRaw : (packagesRaw ? Object.values(packagesRaw) : []);

  const packages = packagesList.filter(pkg => {
    if (pkg.type === 'addon') return false;
    if (pkg.type === 'any') return true;
    return pkg.type === walkInBookingData.petType;
  });

  container.innerHTML = packages.map(pkg => {
    const minPrice = pkg.tiers && pkg.tiers.length > 0 ? pkg.tiers[0].price : 0;
    const isSelected = walkInBookingData.packageId === pkg.id;
    return `
      <div class="package-card card card-selectable ${isSelected ? 'selected' : ''}" 
           data-package-id="${pkg.id}" 
           style="cursor: pointer; padding: 1.5rem;">
        <h3 style="margin-bottom: 0.5rem;">${escapeHtml(pkg.name)}</h3>
        <p style="color: var(--gray-600); margin-bottom: 1rem;">${escapeHtml(pkg.description || '')}</p>
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--purple);">₱${minPrice}</div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.package-card').forEach(card => {
    card.addEventListener('click', function () {
      walkInBookingData.packageId = this.dataset.packageId;
      document.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      updateWalkInSummary();
    });
  });
}

function loadWalkInGroomers() {
  const container = document.getElementById('walkInGroomersContainer');
  if (!container) return;

  const groomers = getGroomers();
  container.innerHTML = `
    <div class="groomer-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      ${groomers.map(g => {
    const isSelected = walkInBookingData.groomerId === g.id;
    return `
          <div class="groomer-card card card-selectable ${isSelected ? 'selected' : ''}" 
               data-groomer-id="${g.id}" 
               style="cursor: pointer; padding: 1.5rem; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">${g.avatar || '👨‍⚕️'}</div>
            <h4>${escapeHtml(g.name)}</h4>
          </div>
        `;
  }).join('')}
    </div>
  `;

  container.querySelectorAll('.groomer-card').forEach(card => {
    card.addEventListener('click', function () {
      walkInBookingData.groomerId = this.dataset.groomerId;
      document.querySelectorAll('.groomer-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      setupWalkInCalendarTimePicker(walkInBookingData.groomerId);
      updateWalkInSummary();
    });
  });

  if (walkInBookingData.groomerId) {
    setupWalkInCalendarTimePicker(walkInBookingData.groomerId);
  }
}

function loadWalkInCustomerForm() {
  // Form is already in HTML, just populate if needed
  if (walkInBookingData.customerName) {
    const nameInput = document.getElementById('walkInName');
    if (nameInput) nameInput.value = walkInBookingData.customerName;
  }
  if (walkInBookingData.phone) {
    const phoneInput = document.getElementById('walkInPhone');
    if (phoneInput) phoneInput.value = walkInBookingData.phone;
  }
  if (walkInBookingData.petName) {
    const petNameInput = document.getElementById('walkInPetName');
    if (petNameInput) petNameInput.value = walkInBookingData.petName;
  }
  if (walkInBookingData.vaccination) {
    const vaccinationInput = document.querySelector(`input[name="walkInVaccination"][value="${walkInBookingData.vaccination}"]`);
    if (vaccinationInput) vaccinationInput.checked = true;
  }
  if (walkInBookingData.weight) {
    const weightInput = document.getElementById('walkInWeight');
    if (weightInput) weightInput.value = walkInBookingData.weight;
  }

  // Setup weight change listener
  const weightInput = document.getElementById('walkInWeight');
  if (weightInput) {
    weightInput.addEventListener('change', function () {
      walkInBookingData.weight = this.value;
      updateWalkInSummary();
    });
  }

  // Setup single service checkboxes
  const nailCheckbox = document.getElementById('walkInNail');
  if (nailCheckbox) {
    nailCheckbox.checked = walkInBookingData.singleServices.includes('nail');
    nailCheckbox.addEventListener('change', function () {
      if (this.checked) {
        if (!walkInBookingData.singleServices.includes('nail')) {
          walkInBookingData.singleServices.push('nail');
        }
      } else {
        walkInBookingData.singleServices = walkInBookingData.singleServices.filter(id => id !== 'nail');
      }
      updateWalkInSummary();
    });
  }

  const earCheckbox = document.getElementById('walkInEar');
  if (earCheckbox) {
    earCheckbox.checked = walkInBookingData.singleServices.includes('ear');
    earCheckbox.addEventListener('change', function () {
      if (this.checked) {
        if (!walkInBookingData.singleServices.includes('ear')) {
          walkInBookingData.singleServices.push('ear');
        }
      } else {
        walkInBookingData.singleServices = walkInBookingData.singleServices.filter(id => id !== 'ear');
      }
      updateWalkInSummary();
    });
  }

  // Setup add-on checkboxes
  const toothbrushCheckbox = document.getElementById('walkInToothbrush');
  if (toothbrushCheckbox) {
    toothbrushCheckbox.checked = walkInBookingData.addOns.includes('toothbrush');
    toothbrushCheckbox.addEventListener('change', function () {
      if (this.checked) {
        if (!walkInBookingData.addOns.includes('toothbrush')) {
          walkInBookingData.addOns.push('toothbrush');
        }
      } else {
        walkInBookingData.addOns = walkInBookingData.addOns.filter(key => key !== 'toothbrush');
      }
      updateWalkInSummary();
    });
  }

  const demattingCheckbox = document.getElementById('walkInDematting');
  if (demattingCheckbox) {
    demattingCheckbox.checked = walkInBookingData.addOns.includes('dematting');
    demattingCheckbox.addEventListener('change', function () {
      if (this.checked) {
        if (!walkInBookingData.addOns.includes('dematting')) {
          walkInBookingData.addOns.push('dematting');
        }
      } else {
        walkInBookingData.addOns = walkInBookingData.addOns.filter(key => key !== 'dematting');
      }
      updateWalkInSummary();
    });
  }
}

async function loadWalkInReview() {
  const container = document.getElementById('walkInReviewContainer');
  if (!container) return;

  const packagesRaw = await getPackages().catch(() => []);
  const groomersRaw = await getGroomers().catch(() => []);
  const packagesList = Array.isArray(packagesRaw) ? packagesRaw : (packagesRaw ? Object.values(packagesRaw) : []);
  const groomersList = Array.isArray(groomersRaw) ? groomersRaw : (groomersRaw ? Object.values(groomersRaw) : []);

  const selectedPackage = packagesList.find(p => p.id === walkInBookingData.packageId);
  const selectedGroomer = groomersList.find(g => g.id === walkInBookingData.groomerId);

  container.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h4 style="margin-bottom: 1rem;">Customer Information</h4>
        <p><strong>Name:</strong> ${escapeHtml(walkInBookingData.customerName)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(walkInBookingData.phone)}</p>
        <p><strong>Pet Name:</strong> ${escapeHtml(walkInBookingData.petName)}</p>
        <p><strong>Pet Type:</strong> ${walkInBookingData.petType === 'dog' ? 'Dog' : 'Cat'}</p>
        <p><strong>Weight:</strong> ${escapeHtml(walkInBookingData.weight)}</p>
        <p><strong>Vaccination:</strong> ${walkInBookingData.vaccination === 'up-to-date' ? 'Up to date' : 'Not up to date'}</p>
        
        <h4 style="margin-top: 2rem; margin-bottom: 1rem;">Appointment Details</h4>
        <p><strong>Package:</strong> ${selectedPackage ? escapeHtml(selectedPackage.name) : ''}</p>
        <p><strong>Groomer:</strong> ${selectedGroomer ? escapeHtml(selectedGroomer.name) : ''}</p>
        <p><strong>Date:</strong> ${formatDate(walkInBookingData.date)}</p>
        <p><strong>Time:</strong> ${walkInBookingData.time}</p>
      </div>
    </div>
  `;
}

async function updateWalkInSummary() {
  const container = document.getElementById('walkInSummaryContainer');
  if (!container) return;

  const packagesRaw = await getPackages().catch(() => []);
  const groomersRaw = await getGroomers().catch(() => []);
  const packagesList = Array.isArray(packagesRaw) ? packagesRaw : (packagesRaw ? Object.values(packagesRaw) : []);
  const groomersList = Array.isArray(groomersRaw) ? groomersRaw : (groomersRaw ? Object.values(groomersRaw) : []);
  const selectedPackage = packagesList.find(p => p.id === walkInBookingData.packageId);
  const selectedGroomer = groomersList.find(g => g.id === walkInBookingData.groomerId);

  let summaryHTML = '<h3 style="margin-bottom: 1rem;">Booking Summary</h3>';

  if (walkInBookingData.customerName) {
    summaryHTML += `
      <div style="margin-bottom: 1rem;">
        <strong>Owner:</strong> ${escapeHtml(walkInBookingData.customerName)}<br>
        <strong>Contact:</strong> ${escapeHtml(walkInBookingData.phone)}<br>
        <strong>Pet:</strong> ${escapeHtml(walkInBookingData.petName || 'Not set')}
      </div>
    `;
  } else {
    summaryHTML += '<p style="color: var(--gray-600);">Complete the steps to see booking summary</p>';
  }

  if (selectedPackage) {
    summaryHTML += `<div style="margin-bottom: 1rem;"><strong>Package:</strong> ${escapeHtml(selectedPackage.name)}</div>`;
  }

  if (selectedGroomer) {
    summaryHTML += `<div style="margin-bottom: 1rem;"><strong>Groomer:</strong> ${escapeHtml(selectedGroomer.name)}</div>`;
  }

  if (walkInBookingData.date) {
    summaryHTML += `<div style="margin-bottom: 1rem;"><strong>Date:</strong> ${formatDate(walkInBookingData.date)}</div>`;
  }

  if (walkInBookingData.time) {
    summaryHTML += `<div style="margin-bottom: 1rem;"><strong>Time:</strong> ${walkInBookingData.time}</div>`;
  }

  // Calculate prices if weight is selected
  if (walkInBookingData.weight && walkInBookingData.packageId) {
    const costEstimate = computeBookingCost(
      walkInBookingData.packageId,
      walkInBookingData.weight,
      walkInBookingData.addOns,
      walkInBookingData.singleServices
    );

    if (costEstimate) {
      summaryHTML += `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--gray-200);">`;

      if (walkInBookingData.packageId === 'single-service' && costEstimate.services?.length) {
        summaryHTML += `
          <div style="margin-bottom: 0.5rem;">
            <strong>Single Services:</strong><br>
            ${costEstimate.services.map(service => `${escapeHtml(service.label)} (${formatCurrency(service.price || 0)})`).join('<br>')}
          </div>
        `;
      }

      summaryHTML += `
        <div style="margin-bottom: 0.5rem;"><strong>Package (${escapeHtml(costEstimate.weightLabel)}):</strong> ${formatCurrency(costEstimate.packagePrice)}</div>
        <div style="margin-bottom: 0.5rem;"><strong>Add-ons:</strong> ${costEstimate.addOns.length ? costEstimate.addOns.map(addon => `${escapeHtml(addon.label)} (${formatCurrency(addon.price)})`).join(', ') : 'None'}</div>
        <div style="margin-bottom: 0.5rem;"><strong>Subtotal:</strong> ${formatCurrency(costEstimate.subtotal)}</div>
        <div style="margin-bottom: 0.5rem;"><strong>Booking Fee (must pay to approve):</strong> ${formatCurrency(costEstimate.bookingFee)}</div>
        <div style="margin-bottom: 0.5rem;"><strong>Balance on Visit:</strong> ${formatCurrency(costEstimate.balanceOnVisit)}</div>
        <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--gray-200); font-weight: 600;">
          <strong>Total Amount:</strong> ${formatCurrency(costEstimate.totalAmount || (costEstimate.subtotal + costEstimate.bookingFee))}
        </div>
      `;
      summaryHTML += `</div>`;
    } else {
      summaryHTML += `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--gray-200);"><strong>Booking Fee:</strong> ₱100 · Must pay to approve</div>`;
    }
  } else if (walkInBookingData.packageId) {
    summaryHTML += `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--gray-200);"><strong>Booking Fee:</strong> ₱100 · Must pay to approve</div>`;
  }

  container.innerHTML = summaryHTML;
}

function setupWalkInCalendarTimePicker(groomerId) {
  const container = document.getElementById('walkInCalendarTimePicker');
  if (!container) return;

  walkInBookingData.groomerId = groomerId;
  const state = { monthOffset: 0, selectedDate: walkInBookingData.date, selectedTime: walkInBookingData.time, groomerId };
  container.__pickerState = state;

  renderWalkInCalendarTimePicker();
}

function renderWalkInCalendarTimePicker() {
  const container = document.getElementById('walkInCalendarTimePicker');
  if (!container) return;

  const state = container.__pickerState || { monthOffset: 0, selectedDate: null, selectedTime: null, groomerId: null };
  if (!state.groomerId) {
    container.innerHTML = '<p style="color: var(--gray-600); text-align: center; padding: 2rem;">Please select a groomer first</p>';
    return;
  }

  const baseDate = new Date();
  const displayDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + state.monthOffset, 1);
  const monthName = displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
  const lastDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
  const startWeekday = firstDayOfMonth.getDay();

  const days = [];
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
    const iso = toLocalISO(date);
    days.push({ day, iso });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const timeSlots = ['9am-12pm', '12pm-3pm', '3pm-6pm'];
  const selectedDate = state.selectedDate;
  const selectedTime = state.selectedTime;

  container.innerHTML = `
    <div class="mega-calendar" style="margin-bottom: 1.5rem;">
      <div class="calendar-header">
        <button class="calendar-nav" data-cal-action="prev">←</button>
        <h3>${monthName}</h3>
        <button class="calendar-nav" data-cal-action="next">→</button>
      </div>
      <div class="calendar-grid calendar-grid-head">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="calendar-cell head">${d}</div>`).join('')}
      </div>
      <div class="calendar-grid calendar-grid-body">
        ${weeks.map(week => week.map(day => {
    if (!day) {
      return '<div class="calendar-cell empty"></div>';
    }
    const blackout = typeof getCalendarBlackout === 'function' ? getCalendarBlackout(day.iso) : null;
    const isPast = isPastDate(day.iso);
    const isClosed = !!blackout;
    const isSelected = selectedDate === day.iso;
    return `
            <div class="calendar-cell day ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''} ${isClosed ? 'blackout' : ''}" 
                 data-date="${day.iso}" 
                 style="cursor: ${(isPast || isClosed) ? 'not-allowed' : 'pointer'}; ${isClosed ? 'background-color: var(--gray-300); color: var(--gray-500);' : ''} opacity: ${(isPast || isClosed) ? '0.5' : '1'};">
              <span class="day-number">${day.day}</span>
            </div>
          `;
  }).join('')).join('')}
      </div>
    </div>
    ${selectedDate ? (() => {
      const blackout = typeof getCalendarBlackout === 'function' ? getCalendarBlackout(selectedDate) : null;
      if (blackout) {
        return `<p style="color: var(--gray-600); text-align: center; padding: 1.5rem;">${escapeHtml(blackout.reason || 'Closed')} · choose another day.</p>`;
      }
      return `
        <div class="time-slots-picker">
          <h4 style="margin-bottom: 1rem;">Select Time</h4>
          <div class="time-slots">
            ${timeSlots.map(time => {
        const isBooked = !groomerSlotAvailable(state.groomerId, selectedDate, time);
        const isSelected = selectedTime === time;
        return `
                <button type="button" 
                        class="time-slot ${isSelected ? 'selected' : ''}" 
                        data-time="${time}"
                        ${isBooked ? 'disabled' : ''}
                        style="cursor: ${isBooked ? 'not-allowed' : 'pointer'}">
                  ${time}
                </button>
              `;
      }).join('')}
          </div>
        </div>
      `;
    })() : '<p style="color: var(--gray-600); text-align: center; padding: 2rem;">Select a date to choose time</p>'}
  `;

  // Attach event listeners
  container.querySelectorAll('.calendar-cell.day:not(.past):not(.blackout)').forEach(cell => {
    cell.addEventListener('click', function () {
      const date = this.dataset.date;
      state.selectedDate = date;
      walkInBookingData.date = date;
      renderWalkInCalendarTimePicker();
      updateWalkInSummary();
    });
  });

  container.querySelectorAll('.time-slot:not(:disabled)').forEach(slot => {
    slot.addEventListener('click', function () {
      const time = this.dataset.time;
      state.selectedTime = time;
      walkInBookingData.time = time;
      renderWalkInCalendarTimePicker();
      updateWalkInSummary();
    });
  });

  const prevBtn = container.querySelector('[data-cal-action="prev"]');
  const nextBtn = container.querySelector('[data-cal-action="next"]');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      state.monthOffset -= 1;
      renderWalkInCalendarTimePicker();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      state.monthOffset += 1;
      renderWalkInCalendarTimePicker();
    });
  }
}

// Handle walk-in booking submission
async function handleWalkInSubmit() {
  // Validate all fields
  const name = document.getElementById('walkInName')?.value.trim();
  const phone = document.getElementById('walkInPhone')?.value.trim();
  const petName = document.getElementById('walkInPetName')?.value.trim();
  const vaccination = document.querySelector('input[name="walkInVaccination"]:checked')?.value;
  const weight = document.getElementById('walkInWeight')?.value;

  if (!name || !phone || !petName || !vaccination || !weight) {
    alert('Please complete all customer information fields');
    return;
  }

  if (!validatePhoneNumber(phone)) {
    alert('Please enter a valid 11-digit phone number (starting with 0 or +63)');
    return;
  }

  if (!walkInBookingData.petType || !walkInBookingData.packageId || !walkInBookingData.groomerId || !walkInBookingData.date || !walkInBookingData.time) {
    alert('Please complete all booking steps');
    return;
  }
  if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(walkInBookingData.date)) {
    alert('This date is closed for bookings. Please pick another day.');
    return;
  }

  const packagesRaw = await getPackages().catch(() => []);
  const groomersRaw = await getGroomers().catch(() => []);
  const packagesList = Array.isArray(packagesRaw) ? packagesRaw : (packagesRaw ? Object.values(packagesRaw) : []);
  const groomersList = Array.isArray(groomersRaw) ? groomersRaw : (groomersRaw ? Object.values(groomersRaw) : []);
  const selectedPackage = packagesList.find(p => p.id === walkInBookingData.packageId);
  const selectedGroomer = groomersList.find(g => g.id === walkInBookingData.groomerId);

  if (!selectedPackage || !selectedGroomer) {
    alert('Invalid package or groomer selection');
    return;
  }

  // Create walk-in customer user ID
  const walkInUserId = 'walk-in-' + Date.now();

  // Create booking object
  const booking = {
    id: generateId(),
    shortId: typeof generateBookingCode === 'function' ? generateBookingCode() : undefined,
    userId: walkInUserId,
    petName: petName,
    petType: walkInBookingData.petType,
    packageName: selectedPackage.name,
    packageId: walkInBookingData.packageId,
    date: walkInBookingData.date,
    time: walkInBookingData.time,
    phone: phone,
    customerName: name,
    groomerId: walkInBookingData.groomerId,
    groomerName: selectedGroomer.name,
    addOns: [],
    bookingNotes: '',
    profile: {
      ownerName: name,
      contactNumber: phone,
      address: '',
      petName: petName,
      breed: '',
      age: '',
      weight: weight,
      medical: '',
      vaccinations: '',
      vaccinationStatus: vaccination
    },
    beforeImage: '',
    afterImage: '',
    cancellationNote: '',
    status: 'pending',
    createdAt: Date.now(),
    isWalkIn: true
  };

  // Save booking
  const bookings = getBookings();
  bookings.push(booking);
  saveBookings(bookings);

  logBookingHistory({
    bookingId: booking.id,
    action: 'created',
    message: `Walk-in booking: ${name} booked ${selectedPackage.name} with ${selectedGroomer.name} on ${formatDate(booking.date)} at ${formatTime(booking.time)}`,
    actor: 'admin'
  });

  alert('Walk-in booking created successfully! It will appear in Pending Bookings.');

  // Reset form
  walkInBookingData = {
    step: 1,
    petType: null,
    packageId: null,
    groomerId: null,
    date: null,
    time: null,
    customerName: '',
    phone: '',
    petName: '',
    vaccination: '',
    weight: ''
  };

  // Clear form fields
  document.getElementById('walkInName').value = '';
  document.getElementById('walkInPhone').value = '';
  document.getElementById('walkInPetName').value = '';
  document.querySelectorAll('input[name="walkInVaccination"]').forEach(r => r.checked = false);
  document.getElementById('walkInWeight').value = '';

  // Reload pending bookings view
  switchView('pending');
  loadPendingBookings();

  // Reset to step 1
  updateWalkInStep(1);
}

function setupAdminPasswordForm() {
  const form = document.getElementById('adminPasswordForm');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const current = document.getElementById('adminCurrentPassword')?.value.trim();
    const next = document.getElementById('adminNewPassword')?.value.trim();
    const confirm = document.getElementById('adminConfirmPassword')?.value.trim();

    if (!current || !next || !confirm) {
      alert('Please complete all fields.');
      return;
    }

    if (next !== confirm) {
      alert('New password and confirmation do not match.');
      return;
    }

    const result = changePasswordForCurrentUser(current, next);
    if (!result?.success) {
      alert(result?.message || 'Unable to update password.');
      return;
    }

    form.reset();
    alert('Password updated successfully!');
  });
}

// Make functions globally available
window.handleWalkInSubmit = handleWalkInSubmit;
window.extractPreferredCut = extractPreferredCut;
window.diagnoseBookingNotes = diagnoseBookingNotes;


// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('adminDashboard')) {
    initAdminDashboard();
  }
});

