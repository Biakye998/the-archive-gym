class AdminAPI {
  constructor() {
    this.baseURL = '/api';
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await fetch(`${this.baseURL}${url}`, { ...options, headers });
    if (response.status === 401) {
      this.clearToken();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return null;
    }
    const data = await response.json().catch(() => null);
    return { status: response.status, data: response.ok ? data : (data || { error: response.statusText }) };
  }

  async login(email, password) {
    const res = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      this.setToken(data.token);
    }
    return { ok: res.ok, data };
  }

  async logout() {
    this.clearToken();
  }

  async get(url) { return this.request(url); }
  async post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); }
  async put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); }
  async del(url) { return this.request(url, { method: 'DELETE' }); }

  async getSettings() { return this.get('/settings'); }
  async updateSettings(settings) { return this.put('/settings', settings); }
  async getPrograms() { return this.get('/programs'); }
  async getProgram(id) { return this.get(`/programs/${id}`); }
  async createProgram(data) { return this.post('/programs', data); }
  async updateProgram(id, data) { return this.put(`/programs/${id}`, data); }
  async deleteProgram(id) { return this.del(`/programs/${id}`); }
  async getPlans() { return this.get('/plans'); }
  async getPlan(id) { return this.get(`/plans/${id}`); }
  async createPlan(data) { return this.post('/plans', data); }
  async updatePlan(id, data) { return this.put(`/plans/${id}`, data); }
  async deletePlan(id) { return this.del(`/plans/${id}`); }
  async getCoaches() { return this.get('/coaches'); }
  async getCoach(id) { return this.get(`/coaches/${id}`); }
  async createCoach(data) { return this.post('/coaches', data); }
  async updateCoach(id, data) { return this.put(`/coaches/${id}`, data); }
  async deleteCoach(id) { return this.del(`/coaches/${id}`); }
  async getPages() { return this.get('/pages'); }
  async getPage(slug) { return this.get(`/pages/${slug}`); }
  async createPage(data) { return this.post('/pages', data); }
  async updatePage(id, data) { return this.put(`/pages/${id}`, data); }
  async deletePage(id) { return this.del(`/pages/${id}`); }
  async getApplications(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/applications${qs ? '?' + qs : ''}`);
  }
  async getApplication(id) { return this.get(`/applications/${id}`); }
  async updateApplicationStatus(id, status, notes) { return this.put(`/applications/${id}/status`, { status, notes }); }
  async getContacts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/contacts${qs ? '?' + qs : ''}`);
  }
  async updateContactStatus(id, status) { return this.put(`/contacts/${id}/status`, { status }); }
  async getDayPassRequests(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/day-pass-requests${qs ? '?' + qs : ''}`);
  }
  async getDayPassRequest(id) { return this.get(`/day-pass-requests/${id}`); }
  async updateDayPassStatus(id, status, notes) { return this.put(`/day-pass-requests/${id}/status`, { status, notes }); }
  async deleteDayPassRequest(id) { return this.del(`/day-pass-requests/${id}`); }
  async getSubscribers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/subscribers${qs ? '?' + qs : ''}`);
  }
  async getTestimonials() { return this.get('/testimonials/all'); }
  async createTestimonial(data) { return this.post('/testimonials', data); }
  async updateTestimonial(id, data) { return this.put(`/testimonials/${id}`, data); }
  async deleteTestimonial(id) { return this.del(`/testimonials/${id}`); }
  async getTemplates() { return this.get('/templates'); }
  async getTemplate(id) { return this.get(`/templates/${id}`); }
  async createTemplate(data) { return this.post('/templates', data); }
  async updateTemplate(id, data) { return this.put(`/templates/${id}`, data); }
  async deleteTemplate(id) { return this.del(`/templates/${id}`); }
  async getAutomations() { return this.get('/automations'); }
  async createAutomation(data) { return this.post('/automations', data); }
  async updateAutomation(id, data) { return this.put(`/automations/${id}`, data); }
  async deleteAutomation(id) { return this.del(`/automations/${id}`); }
  async getMedia() { return this.get('/media'); }
  async deleteMedia(id) { return this.del(`/media/${id}`); }
  async getNavItems() { return this.get('/nav-items/all'); }
  async createNavItem(data) { return this.post('/nav-items', data); }
  async updateNavItem(id, data) { return this.put(`/nav-items/${id}`, data); }
  async deleteNavItem(id) { return this.del(`/nav-items/${id}`); }
  async getHomepageSections() { return this.get('/homepage-sections'); }
  async updateHomepageSection(id, data) { return this.put(`/homepage-sections/${id}`, data); }
  async uploadMedia(formData) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const response = await fetch(`${this.baseURL}/media/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    return { status: response.status, data: await response.json().catch(() => null) };
  }
}

window.adminAPI = new AdminAPI();
