class AdminPanel {
  constructor() {
    this.api = window.adminAPI;
    this.currentPage = null;
    this.currentParams = {};
    this.user = null;
    this.toastContainer = null;

    this.routes = [
      { path: 'dashboard', label: 'Dashboard', icon: '', section: 'main' },
      { path: 'settings', label: 'Site Settings', icon: '', section: 'website' },
      { path: 'nav', label: 'Navigation', icon: '', section: 'website' },
      { path: 'homepage', label: 'Homepage Sections', icon: '', section: 'website' },
      { path: 'pages', label: 'Pages', icon: '', section: 'content' },
      { path: 'programs', label: 'Programs', icon: '', section: 'content' },
      { path: 'plans', label: 'Membership Plans', icon: '', section: 'content' },
      { path: 'coaches', label: 'Coaches', icon: '', section: 'content' },
      { path: 'testimonials', label: 'Testimonials', icon: '', section: 'content' },
      { path: 'applications', label: 'Applications', icon: '', section: 'customers' },
      { path: 'contacts', label: 'Contact Submissions', icon: '', section: 'customers' },
      { path: 'day-passes', label: 'Day Pass Requests', icon: '', section: 'customers' },
      { path: 'subscribers', label: 'Newsletter', icon: '', section: 'customers' },
      { path: 'templates', label: 'Message Templates', icon: '', section: 'communications' },
      { path: 'automations', label: 'Automations', icon: '', section: 'communications' },
      { path: 'media', label: 'Media Library', icon: '', section: 'content' },
      { path: 'integrations', label: 'Integrations', icon: '', section: 'settings' },
      { path: 'audit', label: 'Audit Log', icon: '', section: 'settings' },
      { path: 'admins', label: 'Admin Users', icon: '', section: 'settings' }
    ];

    this.init();
  }

  async init() {
    this.createToastContainer();
    this.bindLogout();
    this.bindMobileMenu();
    this.renderSidebar();
    this.setupRouting();
    await this.checkAuth();
  }

  createToastContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'toast-container';
    document.body.appendChild(this.toastContainer);
  }

  toast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  async checkAuth() {
    if (!this.api.token) {
      window.location.href = '/admin/login.html';
      return;
    }

    const res = await this.api.get('/auth/me');
    if (!res || res.status !== 200) {
      this.toast('Session expired. Please log in again.', 'error');
      window.location.href = '/admin/login.html';
      return;
    }

    this.user = res.data.user;
    document.getElementById('user-email').textContent = this.user.email;
  }

  renderSidebar() {
    const sections = {};
    this.routes.forEach(r => {
      if (!sections[r.section]) sections[r.section] = [];
      sections[r.section].push(r);
    });

    const sectionLabels = {
      main: 'Dashboard',
      website: 'Website',
      content: 'Content',
      customers: 'Customers',
      communications: 'Communications',
      settings: 'Settings'
    };

    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';

    for (const [key, routes] of Object.entries(sections)) {
      const section = document.createElement('div');
      section.className = 'nav-section';
      section.innerHTML = `<div class="nav-section-title">${sectionLabels[key] || key}</div>`;

      routes.forEach(r => {
        const link = document.createElement('a');
        link.href = '#/' + r.path;
        link.className = 'nav-link';
        link.innerHTML = `<span class="nav-icon">${r.icon}</span> <span>${r.label}</span>`;
        link.dataset.path = r.path;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.navigate(r.path);
          this.closeMobileMenu();
        });
        section.appendChild(link);
      });

      nav.appendChild(section);
    }
  }

  setActiveNav(path) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.path === path);
    });
  }

  closeMobileMenu() {
    document.getElementById('sidebar').classList.remove('open');
    const overlay = document.getElementById('mobile-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  bindMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('mobile-overlay');
    if (btn) {
      btn.addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('open');
        if (overlay) overlay.style.display = 'block';
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => this.closeMobileMenu());
    }
  }

  bindLogout() {
    const btn = document.getElementById('logout-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        this.api.logout();
        window.location.href = '/admin/login.html';
      });
    }
  }

  setupRouting() {
    window.addEventListener('hashchange', () => this.route());
    if (window.location.hash === '' || !window.location.hash.startsWith('#/')) {
      window.location.hash = '#/dashboard';
    }
    this.route();
  }

  navigate(path, params = {}) {
    this.currentPage = path;
    this.currentParams = params;
    window.location.hash = '#/' + path;
  }

  async route() {
    const hash = window.location.hash.replace('#/', '');
    const [path, ...rest] = hash.split('/');
    const params = {};

    if (path === 'applications') {
      if (rest[0]) params.id = rest[0];
      if (rest[1] === 'edit') params.edit = true;
    }
    if (path === 'contacts') {
      if (rest[0]) params.id = rest[0];
    }
    if (path === 'programs' || path === 'plans' || path === 'coaches') {
      if (rest[0] === 'edit' && rest[1]) params.editId = rest[1];
      if (rest[0] === 'new') params.new = true;
    }
    if (path === 'templates' || path === 'automations' || path === 'pages') {
      if (rest[0] === 'edit' && rest[1]) params.editId = rest[1];
      if (rest[0] === 'new') params.new = true;
    }

    this.currentPage = path;
    this.currentParams = params;
    this.setActiveNav(path);
    this.renderPage(path, params);
  }

  renderPage(path, params = {}) {
    const title = this.routes.find(r => r.path === path)?.label || 'Dashboard';
    document.getElementById('page-title').textContent = title;
    const content = document.getElementById('content-area');
    content.innerHTML = '';

    const loaders = {
      dashboard: () => this.renderDashboard(),
      settings: () => this.renderSettings(),
      nav: () => this.renderNav(),
      homepage: () => this.renderHomepage(),
      pages: () => this.renderPages(params),
      programs: () => this.renderPrograms(params),
      plans: () => this.renderPlans(params),
      coaches: () => this.renderCoaches(params),
      testimonials: () => this.renderTestimonials(),
      applications: () => this.renderApplications(params),
      contacts: () => this.renderContacts(params),
      'day-passes': () => this.renderDayPasses(params),
      subscribers: () => this.renderSubscribers(),
      templates: () => this.renderTemplates(params),
      automations: () => this.renderAutomations(params),
      media: () => this.renderMedia(),
      integrations: () => this.renderIntegrations(),
      audit: () => this.renderAudit(),
      admins: () => this.renderAdmins()
    };

    const loader = loaders[path];
    if (loader) {
      Promise.resolve(loader()).catch(err => {
        content.innerHTML = `<div class="card"><div class="card-body"><p class="text-danger">Error: ${err.message}</p></div></div>`;
      });
    }
  }

  async renderDashboard() {
    document.getElementById('content-area').innerHTML = '<div class="loading">Loading dashboard...</div>';

    const [appsRes, contactsRes, subsRes, programsRes, plansRes, dayPassRes] = await Promise.allSettled([
      this.api.get('/applications?status=new&limit=5'),
      this.api.get('/contacts?status=new&limit=5'),
      this.api.get('/subscribers?limit=10'),
      this.api.get('/programs'),
      this.api.get('/plans'),
      this.api.get('/day-pass-requests?status=new&limit=5')
    ]);

    const apps = appsRes.status === 'fulfilled' && appsRes.value?.data ? appsRes.value.data : (Array.isArray(appsRes.value?.data) ? appsRes.value.data : []);
    const contacts = contactsRes.status === 'fulfilled' && contactsRes.value?.data ? contactsRes.value.data : (Array.isArray(contactsRes.value?.data) ? contactsRes.value.data : []);
    const subs = subsRes.status === 'fulfilled' && subsRes.value?.data ? subsRes.value.data : { items: [] };
    const programs = programsRes.status === 'fulfilled' && programsRes.value?.data ? programsRes.value.data : [];
    const plans = plansRes.status === 'fulfilled' && plansRes.value?.data ? plansRes.value.data : [];
    const dayPasses = dayPassRes.status === 'fulfilled' && dayPassRes.value?.data ? dayPassRes.value.data : [];

    const newApplications = Array.isArray(apps) ? apps.length : 0;
    const newContacts = Array.isArray(contacts) ? contacts.length : 0;
    const totalSubscribers = subs.items ? subs.items.length : 0;
    const totalPrograms = Array.isArray(programs) ? programs.length : 0;
    const totalPlans = Array.isArray(plans) ? plans.length : 0;
    const newDayPasses = Array.isArray(dayPasses) ? dayPasses.length : 0;

    this.render('dashboard', {
      newApplications, newContacts, totalSubscribers, totalPrograms, totalPlans, newDayPasses,
      applications: apps, contacts: contacts
    });
  }

  render(t, data) {
    const content = document.getElementById('content-area');
    let html = '';

    if (t === 'dashboard') {
      html = `
        <div class="overview">
          <div class="overview-card">
            <div class="overview-label">New Applications</div>
            <div class="overview-value">${data.newApplications}</div>
            <div class="overview-sub">Pending review</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">New Messages</div>
            <div class="overview-value">${data.newContacts}</div>
            <div class="overview-sub">Awaiting response</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Subscribers</div>
            <div class="overview-value">${data.totalSubscribers}</div>
            <div class="overview-sub">Active subscribers</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Programs</div>
            <div class="overview-value">${data.totalPrograms}</div>
            <div class="overview-sub">Active programs</div>
          </div>
           <div class="overview-card">
            <div class="overview-label">Plans</div>
            <div class="overview-value">${data.totalPlans}</div>
            <div class="overview-sub">Membership plans</div>
          </div>
          <div class="overview-card">
            <div class="overview-label">Day Passes</div>
            <div class="overview-value">${data.newDayPasses}</div>
            <div class="overview-sub">Pending requests</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Applications</span>
            <a href="#/applications" class="btn btn-ghost btn-sm">View All</a>
          </div>
          <div class="card-body">
            ${this.renderApplicationsTable(data.applications.slice(0, 5), true)}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Contact Messages</span>
            <a href="#/contacts" class="btn btn-ghost btn-sm">View All</a>
          </div>
          <div class="card-body">
            ${this.renderContactsTable(data.contacts.slice(0, 5), true)}
          </div>
        </div>
      `;
    }

    content.innerHTML = html;
  }

  renderApplicationsTable(items, compact = false) {
    if (!items || items.length === 0) {
      return '<p class="text-muted">No applications found.</p>';
    }
    const rows = items.map(a => `
      <tr>
        <td>${a.first_name} ${a.last_name}</td>
        <td>${a.email}</td>
        <td>${a.plan_title || a.plan_id || '-'}</td>
        <td>${a.program_title || a.program_id || '-'}</td>
        <td><span class="badge badge-${this.statusBadge(a.status)}">${a.status}</span></td>
        <td class="table-actions">
          <a href="#/applications/${a.id}" class="btn btn-ghost btn-sm btn-icon">👁</a>
        </td>
      </tr>
    `).join('');

    return `
      <div class="table-container">
        <table>
          <thead><tr>${compact ? '' : '<th>Name</th><th>Email</th><th>Plan</th><th>Program</th><th>Status</th><th></th>'}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  renderContactsTable(items, compact = false) {
    if (!items || items.length === 0) {
      return '<p class="text-muted">No messages found.</p>';
    }
    const rows = items.map(c => `
      <tr>
        <td>${c.first_name} ${c.last_name}</td>
        <td>${c.email}</td>
        <td>${c.inquiry_type}</td>
        <td><span class="badge badge-${this.statusBadge(c.status)}">${c.status}</span></td>
        <td class="table-actions">
          <a href="#/contacts/${c.id}" class="btn btn-ghost btn-sm btn-icon">👁</a>
        </td>
      </tr>
    `).join('');

    return `
      <div class="table-container">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  statusBadge(status) {
    const map = {
      new: 'new', read: 'read', responded: 'responded', archived: 'archived',
      reviewing: 'reviewed', contacted: 'contacted', approved: 'approved', rejected: 'rejected', completed: 'completed',
      active: 'active', unsubscribed: 'archived'
    };
    return map[status] || 'archived';
  }

  async renderSettings() {
    const res = await this.api.getSettings();
    const s = res?.data || {};

    this.renderFormPage({
      title: 'Site Settings',
      description: 'Manage business information, contact details, and site configuration.',
      fields: [
        { label: 'Business Name', name: 'business_name', value: s.business_name, type: 'text' },
        { label: 'Business Tagline', name: 'business_tagline', value: s.business_tagline, type: 'text' },
        { label: 'Site Title', name: 'site_title', value: s.site_title, type: 'text' },
        { label: 'Site Description', name: 'site_description', value: s.site_description, type: 'textarea' },
        { label: 'Contact Email', name: 'contact_email', value: s.contact_email, type: 'email' },
        { label: 'Contact Phone', name: 'contact_phone', value: s.contact_phone, type: 'tel' },
        { label: 'Business Address', name: 'address', value: s.address, type: 'textarea' },
        { label: 'Business Hours (JSON)', name: 'business_hours', value: s.business_hours, type: 'textarea' },
        { label: 'Timezone', name: 'timezone', value: s.timezone, type: 'text' },
        { label: 'Currency Code', name: 'currency_code', value: s.currency_code, type: 'text' },
        { label: 'Currency Symbol', name: 'currency_symbol', value: s.currency_symbol, type: 'text' },
        { label: 'Website URL', name: 'website_url', value: s.website_url, type: 'url' },
        { label: 'Copyright Text', name: 'copyright_text', value: s.copyright_text, type: 'text' }
      ],
      saveEndpoint: `/api/settings`,
      saveMethod: 'put',
      onSave: () => this.toast('Settings saved successfully', 'success')
    });
  }

  async renderNav() {
    const res = await this.api.getNavItems();
    const items = res?.data || [];

    const addNavItem = () => {
      this.navigate('nav');
      this.render('nav', { items, editingItem: null });
    };

    const editNavItem = (item) => {
      this.navigate('nav');
      this.render('nav', { items, editingItem: item });
    };

    const deleteNavItem = async (id) => {
      if (!confirm('Remove this navigation item?')) return;
      await this.api.deleteNavItem(id);
      this.toast('Navigation item removed', 'success');
      this.render('nav', { items: (await this.api.getNavItems()).data || [] });
    };

    const saveNavItem = async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {};
      new FormData(form).forEach((v, k) => data[k] = v);
      if (form.item_id.value) {
        await this.api.updateNavItem(form.item_id.value, data);
      } else {
        await this.api.createNavItem(data);
      }
      this.toast('Nav item saved', 'success');
      form.reset();
      this.render('nav', { items: (await this.api.getNavItems()).data || [], editingItem: null });
    };

    this.render('nav', { items, addNavItem, editNavItem, deleteNavItem, saveNavItem });
  }

  async renderHomepage() {
    const res = await this.api.getHomepageSections();
    const sections = res?.data || [];
    this.render('homepage', { sections });
  }

  async renderPrograms(params = {}) {
    const res = await this.api.getPrograms();
    const items = res?.data || [];

    if (params.new) {
      this.renderEntityForm('Program', '/programs', {}, items);
    } else if (params.editId) {
      const program = items.find(p => p.id === parseInt(params.editId));
      if (program) this.renderEntityForm('Edit Program', `/programs/${program.id}`, program, items);
      else this.navigate('programs');
    } else {
      this.renderEntityList('Programs', items, 'programs', 'program', true);
    }
  }

  async renderPlans(params = {}) {
    const res = await this.api.getPlans();
    const items = res?.data || [];

    if (params.new) {
      this.renderEntityForm('Plan', '/plans', {}, items);
    } else if (params.editId) {
      const plan = items.find(p => p.id === parseInt(params.editId));
      if (plan) this.renderEntityForm('Edit Plan', `/plans/${plan.id}`, plan, items);
      else this.navigate('plans');
    } else {
      this.renderEntityList('Membership Plans', items, 'plans', 'plan', false);
    }
  }

  async renderCoaches(params = {}) {
    const res = await this.api.getCoaches();
    const items = res?.data || [];

    if (params.new) {
      this.renderEntityForm('Coach', '/coaches', {}, items);
    } else if (params.editId) {
      const coach = items.find(c => c.id === parseInt(params.editId));
      if (coach) this.renderEntityForm('Edit Coach', `/coaches/${coach.id}`, coach, items);
      else this.navigate('coaches');
    } else {
      this.renderEntityList('Coaches', items, 'coaches', 'coach', false);
    }
  }

  async renderPages(params = {}) {
    const res = await this.api.getPages();
    const items = res?.data || [];

    if (params.new) {
      this.renderEntityForm('Page', '/pages', {}, items);
    } else if (params.editId) {
      const page = items.find(p => p.id === parseInt(params.editId));
      if (page) this.renderEntityForm('Edit Page', `/pages/${page.id}`, page, items, true);
    } else {
      this.renderEntityList('Pages', items, 'pages', 'page', false);
    }
  }

  renderEntityList(title, items, basePath, entityType, showSort = false) {
    const content = document.getElementById('content-area');
    let actions = `<a href="#/${basePath}/new" class="btn btn-primary">Add ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}</a>`;

    const tableHeaders = showSort
      ? `<th>#</th><th>Name</th><th>Slug</th><th>Visibility</th><th>Sort</th><th>Actions</th>`
      : `<th>ID</th><th>Name</th><th>Slug</th><th>Description</th><th>Actions</th>`;

    const rows = items.map(item => {
      if (showSort) {
        return `
          <tr>
            <td>${item.sort_order || 0}</td>
            <td>${item.title}</td>
            <td>${item.slug}</td>
            <td>${item.visibility ? 'Visible' : 'Hidden'}</td>
            <td>${item.sort_order || 0}</td>
            <td class="table-actions">
              <a href="#/${basePath}/edit/${item.id}" class="btn btn-ghost btn-sm">Edit</a>
              <a href="#" onclick="adminPanel.deleteItem('${basePath}', ${item.id}, '${entityType}')" class="btn btn-danger btn-sm">Delete</a>
            </td>
          </tr>
        `;
      }
      return `
        <tr>
          <td>${item.id}</td>
          <td>${item.title || item.name || item.slug}</td>
          <td>${item.slug}</td>
          <td>${(item.description || item.desc || '').substring(0, 50)}${item.description && item.description.length > 50 ? '...' : ''}</td>
          <td class="table-actions">
            <a href="#/${basePath}/edit/${item.id}" class="btn btn-ghost btn-sm">Edit</a>
            <a href="#" onclick="adminPanel.deleteItem('${basePath}', ${item.id}, '${entityType}')" class="btn btn-danger btn-sm">Delete</a>
          </td>
        </tr>
      `;
    }).join('');

    content.innerHTML = `
      <div class="card-header" style="margin-bottom: 16px;">
        <span class="card-title">${title}</span>
        ${actions}
      </div>
      <div class="table-container">
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async deleteItem(basePath, id, entityType) {
    if (!confirm(`Delete this ${entityType}?`)) return;

    const map = {
      programs: 'deleteProgram', plans: 'deletePlan', coaches: 'deleteCoach',
      pages: 'deletePage', testimonials: 'deleteTestimonial', templates: 'deleteTemplate',
      automations: 'deleteAutomation', media: 'deleteMedia'
    };

    if (this.api[map[basePath]]) {
      await this.api[map[basePath]](id);
      this.toast(`${entityType} deleted`, 'success');
      this.navigate(basePath);
    }
  }

  renderEntityForm(title, actionPath, item = {}, allItems = [], isPage = false) {
    const content = document.getElementById('content-area');
    const method = item.id ? 'PUT' : 'POST';
    const formAction = actionPath;

    let fields;
    if (isPage) {
      fields = [
        { label: 'Slug', name: 'slug', value: '' },
        { label: 'Title', name: 'title', value: '' },
        { label: 'Meta Title', name: 'meta_title', value: '' },
        { label: 'Meta Description', name: 'meta_description', value: '' },
        { label: 'Status', name: 'status', value: 'published', type: 'select', options: [
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Draft' }
        ] },
        { label: 'Template', name: 'template', value: 'default' },
        { label: 'Content Sections (JSON)', name: 'content_sections', value: '', type: 'textarea' }
      ];
    } else {
      const isPlan = actionPath.includes('/plans');
      const isProgram = actionPath.includes('/programs');
      const isCoach = actionPath.includes('/coaches');
      const isTestimonial = actionPath.includes('/testimonials');

      fields = [
        { label: 'Title', name: 'title', value: '' },
        { label: 'Slug', name: 'slug', value: '' },
        { label: 'Description', name: 'description', value: '', type: 'textarea' }
      ];

      if (isProgram) {
        fields.push(
          { label: 'Full Description', name: 'full_description', value: '', type: 'textarea' },
          { label: 'Difficulty', name: 'difficulty', value: '' },
          { label: 'Duration', name: 'duration', value: '' },
          { label: 'Frequency', name: 'frequency', value: '' },
          { label: 'Image URL', name: 'image', value: '' },
          { label: 'Benefits (JSON array)', name: 'benefits', value: '[]', type: 'textarea' },
          { label: 'CTA Text', name: 'cta_text', value: 'APPLY NOW' },
          { label: 'CTA Destination', name: 'cta_destination', value: '' }
        );
      }
      if (isPlan) {
        fields.push(
          { label: 'Price', name: 'price', value: '' },
          { label: 'Currency Code', name: 'currency_code', value: 'CHF' },
          { label: 'Currency Symbol', name: 'currency_symbol', value: 'CFA' },
          { label: 'Billing Period', name: 'billing_period', value: 'month' },
          { label: 'Badge Text', name: 'badge_text', value: '' },
          { label: 'Benefits (JSON array)', name: 'benefits', value: '[]', type: 'textarea' },
          { label: 'CTA Text', name: 'cta_text', value: 'SELECT' },
          { label: 'CTA Destination', name: 'cta_destination', value: '' }
        );
      }
      if (isCoach) {
        fields.push(
          { label: 'Title', name: 'title', value: '' },
          { label: 'Bio', name: 'bio', value: '', type: 'textarea' },
          { label: 'Credentials', name: 'credentials', value: '' },
          { label: 'Image URL', name: 'image', value: '' },
          { label: 'Specialties (JSON array)', name: 'specialties', value: '[]', type: 'textarea' },
          { label: 'Social Links (JSON)', name: 'social_links', value: '{}', type: 'textarea' }
        );
      }
      if (isTestimonial) {
        fields = [
          { label: 'Name', name: 'name', value: '' },
          { label: 'Quote', name: 'quote', value: '', type: 'textarea' },
          { label: 'Image URL', name: 'image', value: '' },
          { label: 'Rating (1-5)', name: 'rating', value: '5' },
        ];
      }
    }

    Object.keys(item).forEach(key => {
      const f = fields.find(f => f.name === key);
      if (f) f.value = item[key];
    });

    const formFields = fields.map(f => {
      let html;
      if (f.type === 'textarea') {
        html = `<textarea name="${f.name}" class="form-group" placeholder="Enter ${f.label.toLowerCase()}"${f.options ? '' : ''}>${f.value || f.value === 0 ? f.value : ''}</textarea>
          <label>${f.label}</label>`;
      } else if (f.type === 'select') {
        const opts = (f.options || []).map(o => `<option value="${o.value}" ${item[f.name] === o.value ? 'selected' : ''}>${o.label}</option>`).join('');
        html = `<select name="${f.name}">${opts}</select><label>${f.label}</label>`;
      } else {
        html = `<input type="${f.type || 'text'}" name="${f.name}" value="${f.value || ''}" /><label>${f.label}</label>`;
      }
      return `<div class="form-group-wrapper">${html}</div>`;
    }).join('');

    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${title}</span>
          <a href="#/${actionPath.split('/')[1]}" class="btn btn-ghost btn-sm">Back</a>
        </div>
        <div class="card-body">
          <form id="entity-form" method="${method}">
            ${formFields}
            <div class="form-row" style="gap:12px;">
              <label class="form-check">
                <input type="checkbox" name="visibility" ${!item.id || item.visibility ? 'checked' : ''} />
                <span>Visible on website</span>
              </label>
              <label class="form-check">
                <input type="checkbox" name="is_featured" ${item.id && item.is_featured ? 'checked' : ''} />
                <span>Featured / Most Popular</span>
              </label>
            </div>
            <button type="submit" class="btn btn-primary">Save</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('entity-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      const data = {};
      formData.forEach((v, k) => data[k] = v);
      data.visibility = form.visibility.checked ? 1 : 0;
      if ('is_featured' in data || form.is_featured) data.is_featured = form.is_featured?.checked ? 1 : 0;

      let res;
      if (item.id) {
        res = await this.api.put(formAction, data);
      } else {
        res = await this.api.post(formAction, data);
      }

      if (res && res.status >= 200 && res.status < 300) {
        this.toast(`${title} saved`, 'success');
        setTimeout(() => this.navigate(actionPath.replace('/api', '')), 500);
      } else {
        this.toast(res?.data?.error || 'Save failed', 'error');
      }
    });
  }

  async renderApplications(params = {}) {
    if (params.id) {
      const res = await this.api.get(`/applications/${params.id}`);
      const app = res?.data;
      if (!app) return this.navigate('applications');
      this.renderApplicationDetail(app);
    } else {
      const res = await this.api.getApplications();
      const items = res?.data || (Array.isArray(res?.data) ? res.data : []);
      this.renderApplicationList(items);
    }
  }

  renderApplicationList(items) {
    const content = document.getElementById('content-area');
    const filters = '';
    const rows = (items || []).map(a => `
      <tr>
        <td>${a.first_name} ${a.last_name}</td>
        <td>${a.email}</td>
        <td>${a.phone || '-'}</td>
        <td>${a.plan_title || '-'}</td>
        <td>${a.program_title || '-'}</td>
        <td><span class="badge badge-${this.statusBadge(a.status)}">${a.status}</span></td>
        <td>${new Date(a.created_at).toLocaleDateString()}</td>
        <td class="table-actions">
          <a href="#/applications/${a.id}" class="btn btn-ghost btn-sm">View</a>
        </td>
      </tr>
    `).join('');

    content.innerHTML = `
      <div class="card-header" style="margin-bottom: 16px;">
        <span class="card-title">Membership Applications</span>
      </div>
      <div class="filters">
        <select class="filter-status" onchange="adminPanel.filterApplications(this.value)">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="contacted">Contacted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Plan</th><th>Program</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async filterApplications(status) {
    const params = status ? { status } : {};
    const res = await this.api.getApplications(params);
    const items = res?.data || [];
    this.renderApplicationList(items);
  }

  async renderApplicationDetail(app) {
    const plans = (await this.api.getPlans()).data || [];
    const planName = app.plan_id ? (plans.find(p => p.id === app.plan_id)?.title || '') : '';
    const programs = (await this.api.getPrograms()).data || [];
    const programName = app.program_id ? (programs.find(p => p.id === app.program_id)?.title || '') : '';

    const content = document.getElementById('content-area');
    content.innerHTML = `
      <div class="card-header" style="margin-bottom: 16px;">
        <span class="card-title">Application #${app.id} — ${app.first_name} ${app.last_name}</span>
        <a href="#/applications" class="btn btn-ghost btn-sm">Back to List</a>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="form-row">
            <div>
              <h3 style="margin-bottom:12px;font-size:16px;">Applicant</h3>
              <p><strong>Name:</strong> ${app.first_name} ${app.last_name}</p>
              <p><strong>Email:</strong> ${app.email}</p>
              <p><strong>Phone:</strong> ${app.phone || '-'}</p>
              <p><strong>Age:</strong> ${app.age || '-'}</p>
            </div>
            <div>
              <h3 style="margin-bottom:12px;font-size:16px;">Selection</h3>
              <p><strong>Plan:</strong> ${planName || app.plan_id || '-'}</p>
              <p><strong>Program:</strong> ${programName || app.program_id || '-'}</p>
              <p><strong>Applied:</strong> ${new Date(app.created_at).toLocaleString()}</p>
            </div>
          </div>
          <div style="margin:20px 0;">
            <h3 style="margin-bottom:12px;font-size:16px;">Goals</h3>
            <p style="white-space:pre-wrap;background:#0f172a;padding:16px;border-radius:var(--admin-radius);border:1px solid var(--admin-border);">${app.goals || 'No goals specified.'}</p>
          </div>
          <div style="margin-bottom:20px;">
            <h3 style="margin-bottom:12px;font-size:16px;">Status</h3>
            <form id="status-form" method="PUT">
              <div class="form-row">
                <select name="status" id="new-status">
                  <option value="new" ${app.status === 'new' ? 'selected' : ''}>New</option>
                  <option value="reviewing" ${app.status === 'reviewing' ? 'selected' : ''}>Reviewing</option>
                  <option value="contacted" ${app.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                  <option value="approved" ${app.status === 'approved' ? 'selected' : ''}>Approved</option>
                  <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                  <option value="completed" ${app.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
                <button type="submit" class="btn btn-primary">Update</button>
              </div>
              <div class="form-group">
                <label>Internal Notes</label>
                <textarea name="notes" placeholder="Add notes about this application...">${app.internal_notes || ''}</textarea>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById('status-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      await this.api.updateApplicationStatus(app.id, form.status.value, form.notes.value);
      this.toast('Application status updated', 'success');
      setTimeout(() => this.renderApplicationDetail({...app, status: form.status.value, internal_notes: form.notes.value}), 500);
    });
  }

  async renderContacts(params = {}) {
    if (params.id) {
      const res = await this.api.get(`/contacts`);
      const items = res?.data || (Array.isArray(res?.data) ? res.data : []);
      const contact = items.find(c => c.id === parseInt(params.id));
      if (!contact) return this.navigate('contacts');
      this.renderContactDetail(contact);
    } else {
      const res = await this.api.getContacts();
      const items = res?.data || [];
      this.renderContactList(items);
    }
  }

  renderContactList(items) {
    const rows = (items || []).map(c => `
      <tr>
        <td>${c.first_name} ${c.last_name}</td>
        <td>${c.email}</td>
        <td>${c.phone || '-'}</td>
        <td>${c.inquiry_type}</td>
        <td><span class="badge badge-${this.statusBadge(c.status)}">${c.status}</span></td>
        <td>${new Date(c.created_at).toLocaleString()}</td>
        <td class="table-actions">
          <a href="#/contacts/${c.id}" class="btn btn-ghost btn-sm">View</a>
          <a href="#" onclick="adminPanel.deleteContact(${c.id})" class="btn btn-danger btn-sm">Delete</a>
        </td>
      </tr>
    `).join('');

    document.getElementById('content-area').innerHTML = `
      <div class="card-header" style="margin-bottom:16px;">
        <span class="card-title">Contact Submissions</span>
        <button onclick="adminPanel.changeContactStatus('', 'all')" class="btn btn-ghost btn-sm">All</button>
        <button onclick="adminPanel.changeContactStatus('new', 'new')" class="btn btn-ghost btn-sm">New</button>
        <button onclick="adminPanel.changeContactStatus('responded', 'responded')" class="btn btn-ghost btn-sm">Responded</button>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async changeContactStatus(status, label) {
    const params = status ? { status } : {};
    const res = await this.api.getContacts(params);
    const items = res?.data || [];
    this.renderContactList(items);
  }

  async deleteContact(id) {
    if (!confirm('Delete this contact submission?')) return;
    await this.api.del('/contacts/' + id);
    this.toast('Contact deleted', 'success');
    this.renderContacts();
  }

  renderContactDetail(contact) {
    document.getElementById('content-area').innerHTML = `
      <div class="card-header" style="margin-bottom: 16px;">
        <span class="card-title">Contact Message #${contact.id}</span>
        <a href="#/contacts" class="btn btn-ghost btn-sm">Back</a>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="form-row">
            <div><p><strong>Name:</strong> ${contact.first_name} ${contact.last_name}</p>
              <p><strong>Email:</strong> ${contact.email}</p>
              <p><strong>Phone:</strong> ${contact.phone || '-'}</p></div>
            <div><p><strong>Type:</strong> ${contact.inquiry_type}</p>
              <p><strong>Status:</strong> ${contact.status}</p>
              <p><strong>Date:</strong> ${new Date(contact.created_at).toLocaleString()}</p></div>
          </div>
          <div style="margin:20px 0;">
            <h3 style="margin-bottom:12px;font-size:16px;">Message</h3>
            <p style="white-space:pre-wrap;background:#0f172a;padding:16px;border-radius:var(--admin-radius);border:1px solid var(--admin-border);">${contact.message || 'No message.'}</p>
          </div>
          <form id="contact-status-form" method="PUT">
            <div class="form-row">
              <select name="status">
                <option value="new" ${contact.status === 'new' ? 'selected' : ''}>New</option>
                <option value="read" ${contact.status === 'read' ? 'selected' : ''}>Read</option>
                <option value="responded" ${contact.status === 'responded' ? 'selected' : ''}>Responded</option>
                <option value="archived" ${contact.status === 'archived' ? 'selected' : ''}>Archived</option>
              </select>
              <button type="submit" class="btn btn-primary">Update Status</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('contact-status-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      await this.api.updateContactStatus(contact.id, form.status.value);
      this.toast('Status updated', 'success');
    });
  }

  async renderDayPasses(params = {}) {
    if (params.id) {
      const res = await this.api.getDayPassRequests();
      const items = res?.data || [];
      const item = items.find(d => d.id === parseInt(params.id));
      if (!item) return this.navigate('day-passes');
      this.renderDayPassDetail(item);
    } else {
      const res = await this.api.getDayPassRequests();
      const items = res?.data || [];
      this.renderDayPassList(items);
    }
  }

  renderDayPassList(items) {
    const rows = (items || []).map(d => `
      <tr>
        <td>${d.first_name} ${d.last_name}</td>
        <td>${d.email}</td>
        <td>${d.phone || '-'}</td>
        <td>${d.visit_date ? new Date(d.visit_date).toLocaleDateString() : '-'}</td>
        <td>${d.visit_time || '-'}</td>
        <td><span class="badge badge-${this.statusBadge(d.status)}">${d.status}</span></td>
        <td>${new Date(d.created_at).toLocaleString()}</td>
        <td class="table-actions">
          <a href="#/day-passes/${d.id}" class="btn btn-ghost btn-sm">View</a>
          <a href="#" onclick="adminPanel.deleteDayPass(${d.id})" class="btn btn-danger btn-sm">Delete</a>
        </td>
      </tr>
    `).join('');

    document.getElementById('content-area').innerHTML = `
      <div class="card-header" style="margin-bottom:16px;">
        <span class="card-title">Day Pass Requests</span>
        <button onclick="adminPanel.changeDayPassStatus('', 'all')" class="btn btn-ghost btn-sm">All</button>
        <button onclick="adminPanel.changeDayPassStatus('new', 'new')" class="btn btn-ghost btn-sm">New</button>
        <button onclick="adminPanel.changeDayPassStatus('confirmed', 'confirmed')" class="btn btn-ghost btn-sm">Confirmed</button>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Date</th><th>Time</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async changeDayPassStatus(status, label) {
    const params = status ? { status } : {};
    const res = await this.api.getDayPassRequests(params);
    const items = res?.data || [];
    this.renderDayPassList(items);
  }

  async deleteDayPass(id) {
    if (!confirm('Delete this day pass request?')) return;
    await this.api.deleteDayPassRequest(id);
    this.toast('Day pass request deleted', 'success');
    this.renderDayPasses();
  }

  renderDayPassDetail(item) {
    document.getElementById('content-area').innerHTML = `
      <div class="card-header" style="margin-bottom: 16px;">
        <span class="card-title">Day Pass Request #${item.id}</span>
        <a href="#/day-passes" class="btn btn-ghost btn-sm">Back</a>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="form-row">
            <div><p><strong>Name:</strong> ${item.first_name} ${item.last_name}</p>
              <p><strong>Email:</strong> ${item.email}</p>
              <p><strong>Phone:</strong> ${item.phone || '-'}</p></div>
            <div><p><strong>Visit Date:</strong> ${item.visit_date ? new Date(item.visit_date).toLocaleDateString() : '-'}</p>
              <p><strong>Visit Time:</strong> ${item.visit_time || '-'}</p>
              <p><strong>Guests:</strong> ${item.guests}</p>
              <p><strong>Status:</strong> ${item.status}</p></div>
          </div>
          <form id="daypass-status-form" method="PUT">
            <div class="form-row">
              <select name="status">
                <option value="new" ${item.status === 'new' ? 'selected' : ''}>New</option>
                <option value="confirmed" ${item.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="cancelled" ${item.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>Completed</option>
              </select>
              <button type="submit" class="btn btn-primary">Update Status</button>
            </div>
            <div class="form-group">
              <label for="daypass-notes">Internal Notes</label>
              <textarea id="daypass-notes" name="notes" placeholder="Add notes..."></textarea>
            </div>
          </form>
        </div>
      `;

    document.getElementById('daypass-status-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const notes = form.notes.value.trim();
      await this.api.updateDayPassStatus(item.id, form.status.value, notes);
      this.toast('Status updated', 'success');
    });
  }

  async renderSubscribers() {
    const res = await this.api.getSubscribers();
    const items = res?.data?.items || [];
    const total = res?.data?.total || 0;
    const rows = (items || []).map(s => `
      <tr>
        <td>${s.email}</td>
        <td>${s.first_name || ''} ${s.last_name || ''}</td>
        <td><span class="badge badge-${this.statusBadge(s.status)}">${s.status}</span></td>
        <td><span class="badge ${s.consent_status === 'granted' ? 'badge-active' : 'badge-archived'}">${s.consent_status}</span></td>
        <td>${new Date(s.signup_date).toLocaleDateString()}</td>
        <td class="table-actions">
          ${s.status === 'active' ? `<a href="#" onclick="adminPanel.unsubscribe(${s.id})" class="btn btn-danger btn-sm">Unsubscribe</a>` : ''}
          <a href="#" onclick="adminPanel.deleteSubscriber(${s.id})" class="btn btn-ghost btn-sm">Delete</a>
        </td>
      </tr>
    `).join('');

    document.getElementById('content-area').innerHTML = `
      <div class="card-header" style="margin-bottom:16px;">
        <span class="card-title">Newsletter Subscribers (${total})</span>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Email</th><th>Name</th><th>Status</th><th>Consent</th><th>Subscribed</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async unsubscribe(id) {
    if (!confirm('Unsubscribe this user?')) return;
    await this.api.put(`/subscribers/${id}/unsubscribe`, {});
    this.toast('User unsubscribed', 'success');
    this.renderSubscribers();
  }

  async deleteSubscriber(id) {
    if (!confirm('Delete this subscriber?')) return;
    await this.api.del(`/subscribers/${id}`);
    this.toast('Subscriber deleted', 'success');
    this.renderSubscribers();
  }

  async renderTestimonials() {
    const res = await this.api.getTestimonials();
    const items = res?.data || [];
    const rows = (items || []).map(t => `
      <tr>
        <td>${t.name}</td>
        <td>${t.quote.substring(0, 60)}...</td>
        <td>${t.rating || 5}★</td>
        <td><span class="badge ${t.visibility ? 'badge-active' : 'badge-archived'}">${t.visibility ? 'Visible' : 'Hidden'}</span></td>
        <td class="table-actions">
          <a href="#/testimonials/edit/${t.id}" class="btn btn-ghost btn-sm">Edit</a>
          <a href="#" onclick="adminPanel.deleteItem('testimonials', ${t.id}, 'testimonial')" class="btn btn-danger btn-sm">Delete</a>
        </td>
      </tr>
    `).join('');

    document.getElementById('content-area').innerHTML = `
      <div class="card-header" style="margin-bottom: 16px;">
        <span class="card-title">Testimonials</span>
        <a href="#/testimonials/edit/new" class="btn btn-primary">Add Testimonial</a>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Name</th><th>Quote</th><th>Rating</th><th>Visibility</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async renderTemplates(params = {}) {
    const res = await this.api.getTemplates();
    const items = res?.data || [];

    if (params.editId || params.new) {
      const tpl = params.new ? {} : items.find(t => t.id === parseInt(params.editId));
      this.renderTemplateForm(params.new ? 'Add Template' : 'Edit Template', tpl, items);
    } else {
      const rows = (items || []).map(t => `
        <tr>
          <td>${t.name}</td>
          <td>${t.template_key}</td>
          <td>${t.category}</td>
          <td><span class="badge ${t.is_active ? 'badge-active' : 'badge-archived'}">${t.is_active ? 'Active' : 'Inactive'}</span></td>
          <td class="table-actions">
            <a href="#/templates/edit/${t.id}" class="btn btn-ghost btn-sm">Edit</a>
            <a href="#" onclick="adminPanel.deleteItem('templates', ${t.id}, 'template')" class="btn btn-danger btn-sm">Delete</a>
          </td>
        </tr>
      `).join('');

      document.getElementById('content-area').innerHTML = `
        <div class="card-header" style="margin-bottom:16px;">
          <span class="card-title">Message Templates</span>
          <a href="#/templates/new" class="btn btn-primary">New Template</a>
        </div>
        <div class="table-container">
          <table>
            <thead><tr><th>Name</th><th>Key</th><th>Category</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }
  }

  renderTemplateForm(title, item, allItems) {
    const content = document.getElementById('content-area');
    const formAction = item.id ? `/api/templates/${item.id}` : '/api/templates';

    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${title}</span>
          <a href="#/templates" class="btn btn-ghost btn-sm">Back</a>
        </div>
        <div class="card-body">
          <form id="template-form" method="${item.id ? 'PUT' : 'POST'}">
            <div class="form-row">
              <div class="form-group"><label>Template Key</label><input type="text" name="template_key" value="${item.template_key || ''}" /></div>
              <div class="form-group"><label>Name</label><input type="text" name="name" value="${item.name || ''}" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Category</label>
                <select name="category">
                  <option value="customer" ${item.category === 'customer' ? 'selected' : ''}>Customer</option>
                  <option value="admin" ${item.category === 'admin' ? 'selected' : ''}>Admin</option>
                  <option value="newsletter" ${item.category === 'newsletter' ? 'selected' : ''}>Newsletter</option>
                </select>
              </div>
              <div class="form-group"><label>Subject</label><input type="text" name="subject" value="${item.subject || ''}" /></div>
            </div>
            <div class="form-group"><label>HTML Content</label><textarea name="html_content" style="min-height:150px;">${item.html_content || ''}</textarea></div>
            <div class="form-group"><label>Text Content</label><textarea name="text_content" style="min-height:100px;">${item.text_content || ''}</textarea></div>
            <div class="form-check"><input type="checkbox" name="is_active" ${item.id || item.is_active ? 'checked' : ''} /><label>Active</label></div>
            <button type="submit" class="btn btn-primary">Save</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('template-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {};
      new FormData(form).forEach((v, k) => data[k] = v);
      data.is_active = form.is_active.checked ? 1 : 0;

      let res;
      if (item.id) res = await this.api.updateTemplate(item.id, data);
      else res = await this.api.createTemplate(data);

      if (res && res.status >= 200 && res.status < 300) {
        this.toast('Template saved', 'success');
        setTimeout(() => this.navigate('templates'), 500);
      } else {
        this.toast(res?.data?.error || 'Save failed', 'error');
      }
    });
  }

  async renderAutomations(params = {}) {
    const res = await this.api.getAutomations();
    const items = res?.data || [];
    const templates = (await this.api.getTemplates()).data || [];

    if (params.new) {
      this.renderAutomationForm({}, templates);
    } else if (params.editId) {
      const auto = items.find(a => a.id === parseInt(params.editId));
      if (auto) this.renderAutomationForm(auto, templates);
    } else {
      const rows = (items || []).map(a => {
        const tpl = templates.find(t => t.id === a.template_id);
        return `
          <tr>
            <td>${a.trigger_event}</td>
            <td>${tpl?.name || a.template_id}</td>
            <td>${a.channel}</td>
            <td><span class="badge ${a.is_enabled ? 'badge-active' : 'badge-archived'}">${a.is_enabled ? 'Enabled' : 'Disabled'}</span></td>
            <td class="table-actions">
              <a href="#/automations/edit/${a.id}" class="btn btn-ghost btn-sm">Edit</a>
              <a href="#" onclick="adminPanel.deleteItem('automations', ${a.id}, 'automation')" class="btn btn-danger btn-sm">Delete</a>
            </td>
          </tr>
        `;
      }).join('');

      document.getElementById('content-area').innerHTML = `
        <div class="card-header" style="margin-bottom:16px;">
          <span class="card-title">Email Automations</span>
          <a href="#/automations/new" class="btn btn-primary">New Automation</a>
        </div>
        <div class="table-container">
          <table>
            <thead><tr><th>Trigger</th><th>Template</th><th>Channel</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }
  }

  renderAutomationForm(item, templates) {
    const content = document.getElementById('content-area');
    const formAction = item.id ? `/api/automations/${item.id}` : '/api/automations';
    const tplOptions = templates.map(t => `<option value="${t.id}" ${item.template_id === t.id ? 'selected' : ''}>${t.name}</option>`).join('');
    const triggers = ['application_submitted', 'application_approved', 'contact_submitted', 'subscriber_joined', 'welcome'];

    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${item.id ? 'Edit' : 'Add'} Automation</span>
          <a href="#/automations" class="btn btn-ghost btn-sm">Back</a>
        </div>
        <div class="card-body">
          <form id="automation-form" method="${item.id ? 'PUT' : 'POST'}">
            <div class="form-group"><label>Trigger Event</label>
              <select name="trigger_event">${triggers.map(t => `<option value="${t}" ${item.trigger_event === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>Template</label><select name="template_id">${tplOptions}</select></div>
            <div class="form-row">
              <div class="form-group"><label>Channel</label>
                <select name="channel">
                  <option value="email" ${item.channel === 'email' ? 'selected' : ''}>Email</option>
                  <option value="sms" ${item.channel === 'sms' ? 'selected' : ''}>SMS</option>
                  <option value="in_app" ${item.channel === 'in_app' ? 'selected' : ''}>In-App</option>
                  <option value="push" ${item.channel === 'push' ? 'selected' : ''}>Push</option>
                </select>
              </div>
              <div class="form-group" style="align-content:flex-end;">
                <label class="form-check"><input type="checkbox" name="is_enabled" ${!item.id || item.is_enabled ? 'checked' : ''} /><span>Enabled</span></label>
              </div>
            </div>
            <div class="form-group"><label>Conditions (JSON)</label><textarea name="conditions_json">${item.conditions_json || '{}'}</textarea></div>
            <button type="submit" class="btn btn-primary">Save</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('automation-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {};
      new FormData(form).forEach((v, k) => data[k] = v);
      data.is_enabled = form.is_enabled.checked ? 1 : 0;

      let res;
      if (item.id) res = await this.api.updateAutomation(item.id, data);
      else res = await this.api.createAutomation(data);

      if (res && res.status >= 200 && res.status < 300) {
        this.toast('Automation saved', 'success');
        setTimeout(() => this.navigate('automations'), 500);
      } else {
        this.toast(res?.data?.error || 'Save failed', 'error');
      }
    });
  }

  async renderMedia() {
    const res = await this.api.getMedia();
    const items = res?.data || [];
    const content = document.getElementById('content-area');

    const mediaItems = (items || []).map(m => `
      <div class="media-item" key="${m.id}">
        <img src="/uploads/${encodeURIComponent(m.filename)}" alt="${m.alt_text || m.original_name}" />
        <div class="media-info">
          <div class="media-name">${m.original_name}</div>
          <div class="media-size">${(m.size / 1024).toFixed(0)} KB</div>
        </div>
        <div class="media-actions">
          <a href="#" onclick="adminPanel.copyMediaPath('${m.path}')" class="btn btn-ghost btn-sm">Copy</a>
          <a href="#" onclick="adminPanel.deleteItem('media', ${m.id}, 'media')" class="btn btn-danger btn-sm">Delete</a>
        </div>
      </div>
    `).join('');

    content.innerHTML = `
      <div class="card-header" style="margin-bottom:16px;">
        <span class="card-title">Media Library</span>
        <label class="btn btn-primary" style="padding:6px 16px;">
          Upload
          <input type="file" id="media-upload" accept="image/*" style="display:none;" />
        </label>
      </div>
      <div class="media-grid">${mediaItems}</div>
    `;

    document.getElementById('media-upload').addEventListener('change', (e) => this.uploadMedia(e));
  }

  copyMediaPath(path) {
    navigator.clipboard.writeText(path);
    this.toast('Copied to clipboard', 'info');
  }

  async uploadMedia(e) {
    const files = e.target.files;
    if (!files.length) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt_text', file.name);
      const res = await this.api.uploadMedia(formData);
      if (res?.status >= 200 && res.status < 300) {
        this.toast(`${file.name} uploaded`, 'success');
      } else {
        this.toast(`${file.name} failed: ${res?.data?.error || 'Unknown error'}`, 'error');
      }
    }
    this.renderMedia();
  }

  async renderIntegrations() {
    const res = await this.api.get('/integration-configs');
    const items = res?.data || [];

    const providers = [
      { type: 'email', name: 'Email Provider', options: ['sendgrid', 'mailgun', 'resend', 'smtp'] },
      { type: 'sms', name: 'SMS Provider', options: ['twilio', 'vonage'] },
      { type: 'payment', name: 'Payment Provider', options: ['stripe', 'paypal'] },
      { type: 'analytics', name: 'Analytics', options: ['google-analytics', 'plausible', 'umami'] },
      { type: 'crm', name: 'CRM', options: ['hubspot', 'salesforce', 'pipedrive'] }
    ];

    const content = document.getElementById('content-area');
    content.innerHTML = `
      <div class="card-header" style="margin-bottom:20px;">
        <span class="card-title">Integrations</span>
      </div>
      ${providers.map(p => {
        const existing = items.find(i => i.integration_type === p.type);
        const status = existing?.status || 'not_configured';
        const statusLabel = {
          not_configured: 'Not Configured',
          configured: 'Configured',
          connected: 'Connected',
          error: 'Error',
          disabled: 'Disabled'
        }[status];
        const statusBadge = {
          not_configured: 'badge-new',
          configured: 'badge-reviewed',
          connected: 'badge-active',
          error: 'badge-rejected',
          disabled: 'badge-archived'
        }[status];

        return `
          <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
              <span class="card-title">${p.name}</span>
              <span class="badge ${statusBadge}">${statusLabel}</span>
            </div>
            <div class="card-body">
              ${status === 'not_configured' ? `<p class="text-muted">Configure ${p.name.toLowerCase()} to enable automated notifications and communications.</p>` : ''}
              ${status === 'connected' ? `<p class="text-success">Integration is active and receiving data.</p>` : ''}
              ${status === 'error' ? `<p class="text-danger">Integration error: ${existing?.config_json ? 'Check configuration' : 'Connection failed'}</p>` : ''}
              ${!existing ? `<p class="text-muted">API key and configuration not set.</p>` : ''}
              <button onclick="adminPanel.editIntegration('${p.type}')" class="btn btn-ghost btn-sm">Configure</button>
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  async editIntegration(type) {
    const res = await this.api.get('/integration-configs');
    const items = res?.data || [];
    const existing = items.find(i => i.integration_type === type);
    this.renderIntegrationForm(type, existing);
  }

  renderIntegrationForm(type, existing) {
    const content = document.getElementById('content-area');
    const config = existing?.config_json ? JSON.parse(existing.config_json) : {};

    const configFields = {
      email: [{ label: 'API Key', name: 'api_key' }, { label: 'From Email', name: 'from_email' }, { label: 'From Name', name: 'from_name' }],
      sms: [{ label: 'API Key', name: 'api_key' }, { label: 'From Phone', name: 'from_phone' }],
      payment: [{ label: 'Publishable Key', name: 'publishable_key' }, { label: 'Secret Key', name: 'secret_key' }],
      analytics: [{ label: 'Tracking ID', name: 'tracking_id' }, { label: 'Property ID', name: 'property_id' }],
      crm: [{ label: 'API URL', name: 'api_url' }, { label: 'API Key', name: 'api_key' }]
    };

    const fields = configFields[type] || [];
    let html = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Configure ${type.toUpperCase()} Provider</span>
          <a href="#/integrations" class="btn btn-ghost btn-sm">Back</a>
        </div>
        <div class="card-body">
          <form id="integration-form">
    `;

    fields.forEach(f => {
      html += `<div class="form-group"><label>${f.label}</label><input type="text" name="${f.name}" value="${config[f.name] || ''}" /></div>`;
    });

    html += `
            <div class="form-group"><label>Status</label>
              <select name="status">
                <option value="configured" ${existing?.status === 'configured' ? 'selected' : ''}>Configured</option>
                <option value="disabled" ${existing?.status === 'disabled' ? 'selected' : ''}>Disabled</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">Save</button>
          </form>
        </div>
      </div>
    `;

    content.innerHTML = html;

    document.getElementById('integration-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {};
      new FormData(form).forEach((v, k) => data[k] = v);

      let res;
      if (existing) {
        res = await this.api.put(`/api/integration-configs/${existing.id}`, {
          provider: 'unknown', integration_type: type, config_json: JSON.stringify(data),
          status: data.status
        });
      } else {
        res = await this.api.post('/api/integration-configs', {
          provider: type, integration_type: type, config_json: JSON.stringify({
            api_key: data.api_key, from_email: data.from_email, from_name: data.from_name,
            from_phone: data.from_phone, publishable_key: data.publishable_key, secret_key: data.secret_key,
            tracking_id: data.tracking_id, property_id: data.property_id, api_url: data.api_url
          }),
          status: data.status
        });
      }

      if (res && res.status >= 200 && res.status < 300) {
        this.toast('Integration saved', 'success');
        this.navigate('integrations');
      } else {
        this.toast(res?.data?.error || 'Save failed', 'error');
      }
    });
  }

  async renderAudit() {
    const res = await this.api.get('/audit-log');
    const items = res?.data || [];
    const rows = (items || []).map(l => `
      <tr>
        <td>${new Date(l.created_at).toLocaleString()}</td>
        <td>${l.admin_id ? 'Admin #' + l.admin_id : 'System'}</td>
        <td>${l.action}</td>
        <td>${l.entity_type || '-'}</td>
        <td>${l.entity_id || '-'}</td>
        <td>${l.details ? l.details.substring(0, 50) : '-'}</td>
      </tr>
    `).join('');

    document.getElementById('content-area').innerHTML = `
      <div class="card-header" style="margin-bottom:16px;">
        <span class="card-title">Audit Log</span>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Date</th><th>Admin</th><th>Action</th><th>Entity</th><th>ID</th><th>Details</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async renderAdmins() {
    const res = await this.api.get('/admin-users');
    const items = res?.data || [];
    const rows = (items || []).map(u => `
      <tr>
        <td>${u.email}</td>
        <td><span class="badge ${u.role === 'owner' ? 'badge-danger' : 'badge-active'}">${u.role}</span></td>
        <td>${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
        <td><span class="text-muted">••••••</span></td>
      </tr>
    `).join('');

    document.getElementById('content-area').innerHTML = `
      <div class="card-header" style="margin-bottom:16px;">
        <span class="card-title">Admin Users</span>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Email</th><th>Role</th><th>Last Login</th><th>Password</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="margin-top:16px;">
        <div class="card">
          <div class="card-header"><span class="card-title">Create Admin User</span></div>
          <div class="card-body">
            <form id="create-admin-form">
              <div class="form-row">
                <div class="form-group"><label>Email</label><input type="email" name="email" required /></div>
                <div class="form-group"><label>Password</label><input type="password" name="password" required /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Role</label>
                  <select name="role">
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="content_manager">Content Manager</option>
                    <option value="communications_manager">Communications Manager</option>
                  </select>
                </div>
                <div class="form-group" style="align-content:flex-end;">
                  <button type="submit" class="btn btn-primary">Create</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById('create-admin-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {};
      new FormData(e.target).forEach((v, k) => data[k] = v);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.api.token },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok) {
        this.toast('Admin user created', 'success');
        e.target.reset();
        setTimeout(() => this.renderAdmins(), 500);
      } else {
        this.toast(result.error || 'Failed to create user', 'error');
      }
    });
  }

  async renderHomepage() {
    const res = await this.api.getHomepageSections();
    const items = res?.data || [];
    const content = document.getElementById('content-area');

    const sectionMap = {
      hero: 'Hero', experience: 'Experience', training: 'Training', membership: 'Membership',
      about: 'About Section', approach: 'Our Approach', coaches: 'Coaches', testimonials: 'Testimonials',
      contact: 'Contact', cta: 'Call to Action', footer: 'Footer'
    };

    let html = `
      <div class="card-header" style="margin-bottom:20px;">
        <span class="card-title">Homepage Sections</span>
      </div>
    `;

    const allKeys = Object.keys(sectionMap);
    const existingKeys = items.map(i => i.section_key);
    const allSections = allKeys.map(k => ({ section_key: k, title: sectionMap[k], ...items.find(i => i.section_key === k) }));

    allSections.forEach(s => {
      html += `
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header" style="cursor:pointer;" onclick="adminPanel.toggleSection('${s.section_key}')">
            <span class="card-title">${sectionMap[s.section_key] || s.section_key}</span>
            <span class="badge ${s.visibility ? 'badge-active' : 'badge-archived'}">${s.visibility ? 'Visible' : 'Hidden'}</span>
          </div>
          <div id="section-content-${s.section_key}" style="display:${s.id ? 'block' : 'none'};">
            <div class="card-body">
              <form onsubmit="adminPanel.saveSection('${s.section_key}', event)">
                <input type="hidden" name="id" value="${s.id || ''}" />
                <div class="form-row">
                  <div class="form-group"><label>Section Title</label><input type="text" name="title" value="${s.title || ''}" /></div>
                  <div class="form-group"><label>Subtitle</label><input type="text" name="subtitle" value="${s.subtitle || ''}" /></div>
                </div>
                <div class="form-group"><label>Description</label><textarea name="description">${s.description || ''}</textarea></div>
                <div class="form-group"><label>Content (JSON)</label><textarea name="content_json" style="min-height:120px;">${s.content_json || '{}'}</textarea></div>
                <div class="form-row">
                  <div class="form-group"><label>Sort Order</label><input type="number" name="sort_order" value="${s.sort_order || 0}" /></div>
                  <div class="form-group" style="align-content:flex-end;">
                    <label class="form-check"><input type="checkbox" name="visibility" ${s.visibility ? 'checked' : ''} /><span>Visible</span></label>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary">Save</button>
              </form>
            </div>
          </div>
        </div>
      `;
    });

    content.innerHTML = html;
  }

  toggleSection(key) {
    const el = document.getElementById(`section-content-${key}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  async saveSection(key, e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {};
    formData.forEach((v, k) => data[k] = v);
    data.visibility = form.visibility.checked ? 1 : 0;
    data.content_json = data.content_json || '{}';

    let res;
    if (data.id) {
      res = await this.api.put(`/api/homepage-sections/${data.id}`, data);
    } else {
      data.section_key = key;
      res = await this.api.post('/api/homepage-sections', data);
    }

    if (res && res.status >= 200 && res.status < 300) {
      this.toast('Section saved', 'success');
    } else {
      this.toast(res?.data?.error || 'Save failed', 'error');
    }
  }

  renderAdminForm(config) {
    const content = document.getElementById('content-area');
    const formId = 'admin-form-' + Date.now();

    const fieldsHtml = (config.fields || []).map(f => {
      const value = f.value !== undefined && f.value !== null ? String(f.value) : '';
      let inputHtml;

      if (f.type === 'textarea') {
        inputHtml = `<textarea name="${f.name}" style="min-height:${f.rows ? f.rows * 20 + 20 : 120}px;">${value.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`;
      } else if (f.type === 'select') {
        const opts = (f.options || []).map(o => `<option value="${o.value}" ${value === o.value ? 'selected' : ''}>${o.label}</option>`).join('');
        inputHtml = `<select name="${f.name}">${opts}</select>`;
      } else {
        const type = f.type === 'checkbox' ? 'checkbox' : (f.type || 'text');
        if (type === 'checkbox') {
          inputHtml = `<input type="checkbox" name="${f.name}" ${value === '1' || value === 1 || value === true ? 'checked' : ''} />`;
        } else {
          inputHtml = `<input type="${type}" name="${f.name}" value="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" />`;
        }
      }

      return `
        <div class="form-group-wrapper" style="margin-bottom:20px;">
          <label style="display:block;font-size:13px;font-weight:500;color:var(--admin-text-muted);margin-bottom:6px;">${f.label}</label>
          ${inputHtml}
          ${f.help ? `<div class="form-help">${f.help}</div>` : ''}
        </div>
      `;
    }).join('');

    const description = config.description ? `<p style="color:var(--admin-text-muted);margin-bottom:20px;">${config.description}</p>` : '';

    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${config.title}</span>
        </div>
        <div class="card-body">
          ${description}
          <form id="${formId}">
            <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
              ${fieldsHtml}
            </div>
            <div style="margin-top:20px;">
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById(formId);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {};
      formData.forEach((v, k) => data[k] = v);

      const res = await this.api.request(config.saveUrl, {
        method: config.saveMethod,
        body: JSON.stringify(data)
      });

      if (res && res.status >= 200 && res.status < 300) {
        config.onSuccess && config.onSuccess();
      } else {
        this.toast(res?.data?.error || 'Save failed', 'error');
      }
    });
  }

  async renderSettings() {
    const res = await this.api.getSettings();
    const s = res?.data || {};

    const fields = [
      { label: 'Business Name', name: 'business_name', value: s.business_name, type: 'text' },
      { label: 'Business Tagline', name: 'business_tagline', value: s.business_tagline, type: 'text' },
      { label: 'Site Title', name: 'site_title', value: s.site_title, type: 'text' },
      { label: 'Site Description', name: 'site_description', value: s.site_description, type: 'textarea' },
      { label: 'Contact Email', name: 'contact_email', value: s.contact_email, type: 'email' },
      { label: 'Contact Phone', name: 'contact_phone', value: s.contact_phone, type: 'tel' },
      { label: 'Business Address', name: 'address', value: s.address, type: 'textarea' },
      { label: 'Business Hours (JSON)', name: 'business_hours', value: s.business_hours, type: 'textarea' },
      { label: 'Timezone', name: 'timezone', value: s.timezone, type: 'text' },
      { label: 'Currency Code', name: 'currency_code', value: s.currency_code, type: 'text' },
      { label: 'Currency Symbol', name: 'currency_symbol', value: s.currency_symbol, type: 'text' },
      { label: 'Website URL', name: 'website_url', value: s.website_url, type: 'url' },
      { label: 'Copyright Text', name: 'copyright_text', value: s.copyright_text, type: 'text' }
    ];

    this.renderAdminForm({
      title: 'Site Settings',
      description: 'Manage business information, contact details, and site configuration.',
      fields,
      saveUrl: '/settings',
      saveMethod: 'PUT',
      onSuccess: () => this.toast('Settings saved successfully', 'success')
    });
  }
}

function initAdmin() {
  if (window.location.pathname.includes('/login.html')) return;
  window.adminPanel = new AdminPanel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
