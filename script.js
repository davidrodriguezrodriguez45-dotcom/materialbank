let isRegistering = false;
let currentUser = JSON.parse(localStorage.getItem('mb_current_user')) || null;

let users = JSON.parse(localStorage.getItem('mb_users')) || [];
let materials = JSON.parse(localStorage.getItem('mb_materials')) || [
    { code: 'MAT-001', name: 'Multímetro Digital', stock: 10, available: 8 },
    { code: 'MAT-002', name: 'Cautín de Soldadura', stock: 5, available: 5 }
];
let loans = JSON.parse(localStorage.getItem('mb_loans')) || [];
let classroomItems = JSON.parse(localStorage.getItem('mb_classroom')) || [];
let damageReports = JSON.parse(localStorage.getItem('mb_reports')) || [];

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    initAuth();
    initModals();
    renderAll();
    initQRGenerator();
});

function saveData() {
    localStorage.setItem('mb_users', JSON.stringify(users));
    localStorage.setItem('mb_materials', JSON.stringify(materials));
    localStorage.setItem('mb_loans', JSON.stringify(loans));
    localStorage.setItem('mb_classroom', JSON.stringify(classroomItems));
    localStorage.setItem('mb_reports', JSON.stringify(damageReports));
    localStorage.setItem('mb_current_user', JSON.stringify(currentUser));
}

function checkSession() {
    if (currentUser) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        document.getElementById('current-user-name').textContent = currentUser.name || 'Usuario';
        
        const userRole = currentUser.role || 'Aprendiz';
        document.getElementById('user-role').textContent = userRole;

        buildSidebarMenu(userRole);

        const btnNewMaterial = document.getElementById('open-material-modal');
        if (btnNewMaterial) {
            btnNewMaterial.style.display = (userRole === 'Aprendiz') ? 'none' : 'inline-flex';
        }
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
}

// CONSTRUIR MENÚ SEGÚN ROL (Con "Añadir nuevo préstamo" para profesor y sin ver préstamos extra)
function buildSidebarMenu(role) {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';

    if (role === 'Aprendiz') {
        nav.innerHTML = `
            <button class="nav-btn active" data-target="section-inventory">📦 Inventario</button>
            <button class="nav-btn" data-target="section-loans">📋 Préstamos</button>
            <button class="nav-btn" data-target="section-qr">📲 Generador QR</button>
        `;
    } else if (role === 'Profesor') {
        nav.innerHTML = `
            <button class="nav-btn active" data-target="section-classroom">🏫 Inventario del Salón</button>
            <button class="nav-btn" data-target="section-report-damage">⚠️ Reportar Daño / Faltante</button>
        `;
    } else if (role === 'Coordinación') {
        nav.innerHTML = `
            <button class="nav-btn active" data-target="section-coord-dashboard">📨 Bandeja de Alertas (${damageReports.filter(r=>r.status==='Pendiente').length})</button>
            <button class="nav-btn" data-target="section-classroom">🏫 Ver Estado de Aulas</button>
            <button class="nav-btn" data-target="section-inventory">📦 Inventario General</button>
        `;
    }

    initNavigation();
}

function initAuth() {
    const switchLink = document.getElementById('switch-link');
    const nameField = document.getElementById('name-field');
    const roleField = document.getElementById('role-field');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authBtn = document.getElementById('auth-btn');
    const switchText = document.getElementById('switch-text');

    switchLink.addEventListener('click', (e) => {
        e.preventDefault();
        isRegistering = !isRegistering;
        if (isRegistering) {
            nameField.style.display = 'block';
            roleField.style.display = 'block';
            authSubtitle.textContent = 'Crea tu cuenta institucional';
            authBtn.textContent = 'Registrarse';
            switchText.textContent = '¿Ya tienes cuenta?';
            switchLink.textContent = 'Inicia sesión';
        } else {
            nameField.style.display = 'none';
            roleField.style.display = 'none';
            authSubtitle.textContent = 'Control Escolar y Aulas';
            authBtn.textContent = 'Entrar al Sistema';
            switchText.textContent = '¿No tienes cuenta?';
            switchLink.textContent = 'Regístrate aquí';
        }
    });

    document.getElementById('auth-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('reg-name').value;
        const role = document.getElementById('reg-role').value;

        if (isRegistering) {
            if (!name) {
                alert('Ingresa tu nombre.');
                return;
            }
            const exists = users.find(u => u.email === email);
            if (exists) {
                alert('El correo ya está registrado.');
                return;
            }
            const newUser = { name, email, password, role };
            users.push(newUser);
            currentUser = newUser;
            alert('¡Registro exitoso como ' + role + '!');
        } else {
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
                currentUser = user;
            } else {
                alert('Credenciales incorrectas.');
                return;
            }
        }
        saveData();
        checkSession();
        renderAll();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('mb_current_user');
        checkSession();
    });

    document.getElementById('reset-db-btn').addEventListener('click', () => {
        if (confirm('¿Limpiar datos locales y empezar de cero?')) {
            localStorage.clear();
            location.reload();
        }
    });
}

function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
            
            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.target);
            if (target) target.classList.add('active');
        });
    });
}

function initModals() {
    const openMat = document.getElementById('open-material-modal');
    if (openMat) openMat.onclick = () => document.getElementById('material-modal').style.display = 'flex';
    
    const openLoan = document.getElementById('open-loan-modal');
    if (openLoan) openLoan.onclick = () => { populateSelects(); document.getElementById('loan-modal').style.display = 'flex'; };

    const openClassroom = document.getElementById('open-classroom-modal');
    if (openClassroom) openClassroom.onclick = () => document.getElementById('classroom-modal').style.display = 'flex';

    const openDmg = document.getElementById('open-damage-modal');
    if (openDmg) openDmg.onclick = () => document.getElementById('damage-modal').style.display = 'flex';

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = (e) => e.target.closest('.modal').style.display = 'none';
    });

    // Guardar material sin categoría
    document.getElementById('material-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('mat-code').value;
        const name = document.getElementById('mat-name').value;
        const stock = parseInt(document.getElementById('mat-stock').value);

        materials.push({ code, name, stock, available: stock });
        saveData();
        renderAll();
        document.getElementById('material-modal').style.display = 'none';
        e.target.reset();
    });

    document.getElementById('loan-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('loan-material-select').value;
        const qty = parseInt(document.getElementById('loan-qty').value);
        const mat = materials.find(m => m.code === code);

        if (mat.available < qty) {
            alert('Stock insuficiente.');
            return;
        }

        mat.available -= qty;
        loans.push({
            id: Date.now().toString().slice(-4),
            materialName: mat.name,
            user: currentUser.name,
            qty,
            date: new Date().toLocaleDateString(),
            status: 'Activo'
        });

        saveData();
        renderAll();
        document.getElementById('loan-modal').style.display = 'none';
    });

    document.getElementById('classroom-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('cls-name').value;
        const location = document.getElementById('cls-location').value;
        const qty = parseInt(document.getElementById('cls-qty').value);
        const status = document.getElementById('cls-status').value;
        const obs = document.getElementById('cls-obs').value;

        classroomItems.push({ name, location, qty, status, obs });
        saveData();
        renderAll();
        document.getElementById('classroom-modal').style.display = 'none';
        e.target.reset();
    });

    document.getElementById('damage-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const classroom = document.getElementById('dmg-classroom').value;
        const item = document.getElementById('dmg-item').value;
        const type = document.getElementById('dmg-type').value;
        const desc = document.getElementById('dmg-desc').value;

        damageReports.push({
            id: Date.now(),
            teacher: currentUser.name,
            classroom,
            item,
            type,
            desc,
            date: new Date().toLocaleDateString(),
            status: 'Pendiente'
        });

        saveData();
        renderAll();
        document.getElementById('damage-modal').style.display = 'none';
        e.target.reset();
        alert('¡Reporte enviado exitosamente a Coordinación!');
    });
}

function populateSelects() {
    const loanSelect = document.getElementById('loan-material-select');
    if (!loanSelect) return;
    loanSelect.innerHTML = '';
    materials.forEach(m => {
        loanSelect.innerHTML += `<option value="${m.code}">${m.name} (Disponibles: ${m.available})</option>`;
    });
}

function renderAll() {
    renderInventory();
    renderLoans();
    renderClassroom();
    renderReports();
    renderCoordDashboard();
}

function renderInventory() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    materials.forEach(m => {
        const status = m.available > 0 ? '<span style="color:green; font-weight:600;">Disponible</span>' : '<span style="color:red; font-weight:600;">Agotado</span>';
        const deleteBtn = (currentUser && currentUser.role !== 'Aprendiz') 
            ? `<button class="btn-danger" onclick="deleteMaterial('${m.code}')">Eliminar</button>` 
            : '<span style="color:#94a3b8; font-size:0.8rem;">N/A</span>';

        tbody.innerHTML += `
            <tr>
                <td>${m.code}</td>
                <td>${m.name}</td>
                <td>${m.stock}</td>
                <td>${m.available}</td>
                <td>${status}</td>
                <td>${deleteBtn}</td>
            </tr>
        `;
    });
}

function deleteMaterial(code) {
    materials = materials.filter(m => m.code !== code);
    saveData();
    renderAll();
}

function renderLoans() {
    const tbody = document.getElementById('loans-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    loans.forEach((l, index) => {
        tbody.innerHTML += `
            <tr>
                <td>#${l.id}</td>
                <td>${l.materialName}</td>
                <td>${l.user}</td>
                <td>${l.qty}</td>
                <td>${l.date}</td>
                <td>${l.status}</td>
                <td>${l.status === 'Activo' ? `<button class="btn-success" onclick="returnLoan(${index})">Devolver</button>` : 'Devuelto'}</td>
            </tr>
        `;
    });
}

function returnLoan(index) {
    const loan = loans[index];
    const mat = materials.find(m => m.name === loan.materialName);
    if (mat) mat.available += loan.qty;
    loan.status = 'Devuelto';
    saveData();
    renderAll();
}

// INVENTARIO DEL SALÓN CON BOTÓN DE CAMBIAR ESTADO
function renderClassroom() {
    const tbody = document.getElementById('classroom-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (classroomItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b;">No hay elementos registrados en el salón. Usa el botón superior para agregarlos.</td></tr>`;
        return;
    }

    classroomItems.forEach((c, index) => {
        let badgeColor = 'green';
        if (c.status === 'Dañado') badgeColor = 'red';
        if (c.status === 'Faltante') badgeColor = 'orange';

        tbody.innerHTML += `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.location}</td>
                <td>${c.qty}</td>
                <td><span style="color:${badgeColor}; font-weight:600;" id="status-text-${index}">${c.status}</span></td>
                <td>${c.obs}</td>
                <td>
                    <button class="btn-warning" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;" onclick="toggleStatus(${index})">🔄 Estado</button>
                    <button class="btn-danger" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;" onclick="deleteClassroomItem(${index})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

// FUNCIÓN PARA ROTAR EL ESTADO (DISPONIBLE / DAÑADO / FALTANTE)
function toggleStatus(index) {
    const current = classroomItems[index].status;
    
    if (current === 'Activo / Bueno') {
        classroomItems[index].status = 'Dañado';
    } else if (current === 'Dañado') {
        classroomItems[index].status = 'Faltante';
    } else {
        classroomItems[index].status = 'Activo / Bueno';
    }

    saveData();
    renderAll();
}

function deleteClassroomItem(index) {
    classroomItems.splice(index, 1);
    saveData();
    renderAll();
}

function renderReports() {
    const tbody = document.getElementById('reports-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    damageReports.forEach(r => {
        tbody.innerHTML += `
            <tr>
                <td>${r.classroom}</td>
                <td><strong>${r.item}</strong></td>
                <td><span class="badge" style="background:#f59e0b">${r.type}</span></td>
                <td>${r.desc}</td>
                <td>${r.teacher}</td>
                <td>${r.date}</td>
                <td><span style="color:${r.status==='Pendiente'?'orange':'green'}; font-weight:bold;">${r.status}</span></td>
            </tr>
        `;
    });
}

function renderCoordDashboard() {
    const tbody = document.getElementById('coord-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (damageReports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b;">No hay reportes de daños pendientes.</td></tr>`;
        return;
    }

    damageReports.forEach((r, index) => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${r.teacher}</strong></td>
                <td>${r.classroom}</td>
                <td>${r.item} (${r.type})</td>
                <td>${r.desc}</td>
                <td>${r.date}</td>
                <td>
                    ${r.status === 'Pendiente' ? 
                        `<button class="btn-success" onclick="resolveReport(${index})">Marcar Atendido</button>` : 
                        '<span style="color:green; font-weight:600;">Atendido ✓</span>'}
                </td>
            </tr>
        `;
    });
}

function resolveReport(index) {
    damageReports[index].status = 'Atendido';
    saveData();
    renderAll();
}

function initQRGenerator() {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const qr = new QRious({
        element: canvas,
        size: 180,
        value: 'https://materialbank.local'
    });

    document.getElementById('generate-qr-btn').addEventListener('click', () => {
        const text = document.getElementById('qr-input').value;
        qr.value = text;
        const downloadBtn = document.getElementById('download-qr');
        downloadBtn.style.display = 'inline-block';
        downloadBtn.href = canvas.toDataURL('image/png');
    });
}