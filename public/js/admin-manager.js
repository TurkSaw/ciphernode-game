class AdminManager {
    constructor() {
        this.isAdmin = false;
        this.modal = null;
        this.users = [];
        this.currentPage = 1;
    }

    init(user) {
        // Check if user has admin privileges
        if (user && user.is_admin) {
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
            item.className = 'admin-user-item';

            const isBanned = user.banned;
            const isAdmin = user.is_admin;
            const roleBadge = isAdmin ? '<span class="badge admin">ADMIN</span>' : '';
            const statusBadge = isBanned ? '<span class="badge banned">BANNED</span>' : '<span class="badge active">ACTIVE</span>';

            item.innerHTML = `
                <div class="user-info">
                    <span class="user-name">${user.username} ${roleBadge}</span>
                    <span class="user-email">${user.email}</span>
                </div>
                <div class="user-status">
                    ${statusBadge}
                </div>
                <div class="user-actions">
                    ${!isAdmin ? `
                        <button class="btn-sm ${isBanned ? 'success' : 'danger'}" 
                                onclick="window.adminManager.toggleBan('${user.id}', ${!isBanned})">
                            ${isBanned ? 'UNBAN' : 'BAN'}
                        </button>
                    ` : ''}
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
                alert(`User ${shouldBan ? 'banned' : 'unbanned'} successfully.`);
            } else {
                const data = await response.json();
                alert('Error: ' + (data.error || 'Request failed'));
            }
        } catch (error) {
            console.error('Ban action failed:', error);
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
