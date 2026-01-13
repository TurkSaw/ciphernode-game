class AdminManager {
    constructor() {
        this.isAdmin = false;
        this.modal = null;
        this.users = [];
        this.currentPage = 1;
    }

    init(user) {
        // Check if user has admin privileges (support both new role system and legacy boolean)
        if (user && (user.role === 'admin' || user.role === 'superadmin' || user.is_admin)) {
            this.isAdmin = true;
            this.showAdminButton();
            console.log('🛡️ Admin privileges detected');
        } else {
            this.isAdmin = false;
            this.hideAdminButton();
        }
    }

    showAdminButton() {
        const btn = document.getElementById('admin-btn');
        if (btn) btn.style.display = 'block';
    }

    hideAdminButton() {
        const btn = document.getElementById('admin-btn');
        if (btn) btn.style.display = 'none';
    }

    async openPanel() {
        if (!this.isAdmin) return;

        const modal = document.getElementById('admin-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadStats();
            this.loadUsers(1);
        }
    }

    closePanel() {
        const modal = document.getElementById('admin-modal');
        if (modal) modal.style.display = 'none';
    }

    async loadStats() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('admin-total-users').innerText = data.totalUsers;
                document.getElementById('admin-total-games').innerText = data.totalGames;
            }
        } catch (error) {
            console.error('Failed to load admin stats:', error);
        }
    }

    async loadUsers(page = 1) {
        try {
            this.currentPage = page;
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/admin/users?page=${page}&limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                this.renderUserList(result.users);
                // Simple pagination logic could be added here
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    renderUserList(users) {
        const list = document.getElementById('admin-user-list');
        if (!list) return;

        list.innerHTML = '';
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'admin-user-row';

            const isBanned = user.banned;
            const role = user.role || (user.is_admin ? 'admin' : 'user');

            // Only Superadmin can see role selector, others see badge
            // Ideally we check this.userRole but for now we rely on backend check mostly
            // We can infer current role from UI checks or token, but let's just show selector for all admins 
            // and let backend block if not superadmin.

            let roleHtml = `<span class="role-badge ${role}">${role}</span>`;
            // If I am superadmin (hack: check if I can see delete buttons etc), allow select
            // Ideally proper checking.
            roleHtml = `
                <select class="role-select" onchange="window.adminManager.changeRole('${user.id}', this.value)">
                    <option value="user" ${role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="superadmin" ${role === 'superadmin' ? 'selected' : ''}>Superadmin</option>
                </select>
            `;

            item.innerHTML = `
                <div class="user-cell-info">
                    <span class="user-cell-name">${user.username}</span>
                    <span class="user-cell-email">${user.email}</span>
                </div>
                <div>${roleHtml}</div>
                <div>
                    <span class="status-badge ${isBanned ? 'banned' : 'active'}">
                        ${isBanned ? 'BANNED' : 'ACTIVE'}
                    </span>
                </div>
                <div style="color:var(--primary); font-family:var(--font-mono);">${user.level || 1}</div>
                <div class="action-btn-group">
                    <button class="icon-btn" title="${isBanned ? 'Unban' : 'Ban'}" 
                            onclick="window.adminManager.toggleBan('${user.id}', ${!isBanned})">
                        ${isBanned ? '🔓' : '🚫'}
                    </button>
                    ${role !== 'superadmin' ? `
                    <button class="icon-btn danger" title="Delete" 
                            onclick="window.adminManager.deleteUser('${user.id}', '${user.username}')">
                        🗑️
                    </button>` : ''}
                </div>
            `;
            list.appendChild(item);
        });
    }

    async toggleBan(userId, shouldBan) {
        if (!confirm(`Are you sure you want to ${shouldBan ? 'BAN' : 'UNBAN'} this user?`)) return;

        try {
            const token = localStorage.getItem('authToken');
            const action = shouldBan ? 'ban' : 'unban';
            const response = await fetch(`/api/admin/users/${userId}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                // Refresh list
                this.loadUsers(this.currentPage);
                // alert(`User ${shouldBan ? 'banned' : 'unbanned'} successfully.`);
            } else {
                const data = await response.json();
                alert('Error: ' + (data.error || 'Request failed'));
            }
        } catch (error) {
            console.error('Ban action failed:', error);
        }
    }

    switchTab(tabName) {
        // Toggle Active Tab in Sidebar
        document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.querySelector(`.admin-nav-item[onclick="window.adminManager.switchTab('${tabName}')"]`);
        if (navItem) navItem.classList.add('active');

        // Toggle Content
        document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
        const tabContent = document.getElementById(`admin-tab-${tabName}`);
        if (tabContent) {
            tabContent.style.display = 'block';

            // Set Header Titles based on tab
            const titleEl = document.getElementById('admin-page-title');
            const subEl = document.getElementById('admin-page-subtitle');

            if (tabName === 'overview') {
                titleEl.textContent = 'System Overview';
                subEl.textContent = 'Real-time status monitoring';
                this.loadStats();
            } else if (tabName === 'users') {
                titleEl.textContent = 'User Protocol';
                subEl.textContent = 'Manage access levels and permissions';
                this.loadUsers(1);
            } else if (tabName === 'chat') {
                titleEl.textContent = 'Comms Feed';
                subEl.textContent = 'Global communication logs';
            }
        }
    }

    async changeRole(userId, newRole) {
        if (!confirm(`Are you sure you want to change user role to ${newRole.toUpperCase()}?`)) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                this.loadUsers(this.currentPage);
                alert(`Role updated to ${newRole.toUpperCase()}`);
            } else {
                const data = await response.json();
                alert('Error: ' + (data.error || 'Failed to update role'));
            }
        } catch (error) {
            console.error('Role update failed:', error);
        }
    }

    async deleteUser(userId, username) {
        if (!confirm(`⚠️ DANGER: Are you sure you want to PERMANENTLY DELETE user '${username}'?\n\nThis action cannot be undone!`)) return;

        // Double confirmation for safety
        if (!confirm(`Last warning: This will completely erase '${username}' and all their progress.\n\nProceed with deletion?`)) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                this.loadUsers(this.currentPage);
                alert(`User '${username}' deleted successfully.`);
            } else {
                const data = await response.json();
                alert('Error: ' + (data.error || 'Failed to delete user'));
            }
        } catch (error) {
            console.error('Delete action failed:', error);
        }
    }

    async clearChat() {
        if (!confirm('Are you sure you want to DELETE ALL chat history? This cannot be undone.')) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/admin/chat/clear', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert('Chat history cleared.');
            } else {
                alert('Failed to clear chat.');
            }
        } catch (error) {
            console.error('Clear chat failed:', error);
        }
    }
}

// Global instance
window.adminManager = new AdminManager();
