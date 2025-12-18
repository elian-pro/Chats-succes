// Estado de la aplicación
const state = {
    chats: [],
    selectedChat: null,
    fechaDesde: null,
    fechaHasta: null,
    conversacionData: null,
    userColors: {}
};

// Elementos del DOM
const elements = {
    chatSelect: document.getElementById('chatSelect'),
    fechaDesde: document.getElementById('fechaDesde'),
    fechaHasta: document.getElementById('fechaHasta'),
    btnGenerar: document.getElementById('btnGenerar'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    resumenSection: document.getElementById('resumenSection'),
    resumenContent: document.getElementById('resumenContent'),
    conversacionSection: document.getElementById('conversacionSection'),
    conversacionInfo: document.getElementById('conversacionInfo'),
    conversacionContent: document.getElementById('conversacionContent')
};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 ZEBRA Dashboard iniciado');
    initializeTabs();
    initializeDateInputs();
    loadChats();
    setupEventListeners();
});

// Inicializar tabs
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            // Remover active de todos los tabs
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Agregar active al tab clickeado
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Función para cambiar de tab programáticamente
function switchToTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Remover active de todos
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    
    // Activar el tab específico
    const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(tabName);
    
    if (targetTab && targetContent) {
        targetTab.classList.add('active');
        targetContent.classList.add('active');
    }
}

// Inicializar inputs de fecha con fecha de hoy
function initializeDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    elements.fechaHasta.value = today;
    state.fechaHasta = today;
    
    // Establecer fecha desde como hace 7 días
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    elements.fechaDesde.value = weekAgoStr;
    state.fechaDesde = weekAgoStr;
}

// Cargar lista de chats desde el webhook
async function loadChats() {
    try {
        elements.chatSelect.innerHTML = '<option value="">Cargando chats...</option>';
        elements.chatSelect.disabled = true;
        
        const response = await fetch(CONFIG.WEBHOOK_GET_CHATS);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.chats && Array.isArray(data.chats)) {
            state.chats = data.chats;
            populateChatSelect(data.chats);
        } else {
            throw new Error('Formato de respuesta inválido');
        }
        
    } catch (error) {
        console.error('Error al cargar chats:', error);
        elements.chatSelect.innerHTML = '<option value="">Error al cargar chats</option>';
        showNotification('Error al cargar la lista de chats', 'error');
    } finally {
        elements.chatSelect.disabled = false;
    }
}

// Poblar el dropdown de chats
function populateChatSelect(chats) {
    elements.chatSelect.innerHTML = '<option value="">Seleccione un chat...</option>';
    
    chats.forEach(chat => {
        const option = document.createElement('option');
        option.value = chat;
        option.textContent = chat;
        elements.chatSelect.appendChild(option);
    });
}

// Configurar event listeners
function setupEventListeners() {
    // Chat select
    elements.chatSelect.addEventListener('change', (e) => {
        state.selectedChat = e.target.value;
        validateForm();
    });
    
    // Fecha desde
    elements.fechaDesde.addEventListener('change', (e) => {
        state.fechaDesde = e.target.value;
        validateForm();
    });
    
    // Fecha hasta
    elements.fechaHasta.addEventListener('change', (e) => {
        state.fechaHasta = e.target.value;
        validateForm();
    });
    
    // Botón generar
    elements.btnGenerar.addEventListener('click', generarResumen);
}

// Validar formulario
function validateForm() {
    const isValid = state.selectedChat && state.fechaDesde && state.fechaHasta;
    elements.btnGenerar.disabled = !isValid;
}

// Generar resumen y cargar conversación
async function generarResumen() {
    try {
        console.log('🔄 Iniciando generación de resumen...');
        
        // Ocultar secciones anteriores
        elements.resumenSection.classList.add('hidden');
        elements.conversacionSection.classList.add('hidden');
        
        // Mostrar loading
        elements.loadingSpinner.classList.remove('hidden');
        elements.btnGenerar.disabled = true;
        
        // Preparar datos para el POST
        const payload = {
            idGrupo: state.selectedChat,
            fechaDesde: state.fechaDesde,
            fechaHasta: state.fechaHasta
        };
        
        console.log('📤 Enviando payload:', payload);
        
        // Hacer POST al webhook
        const response = await fetch(CONFIG.WEBHOOK_POST_CONVERSATION, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Respuesta recibida:', data);
        
        // Guardar datos
        state.conversacionData = data;
        
        // ============ MOSTRAR RESUMEN ============
        if (data.resumen) {
            console.log('📝 Mostrando resumen...');
            displayResumen(data.resumen);
        } else {
            console.error('❌ No hay resumen en la respuesta');
        }
        
        // ============ MOSTRAR CONVERSACIÓN ============
        if (data.conversacion && Array.isArray(data.conversacion)) {
            console.log('💬 Mostrando conversación con', data.conversacion.length, 'mensajes');
            displayConversacion(data.conversacion, data.diccionario);
            
            // Cambiar automáticamente a la pestaña Chat
            setTimeout(() => {
                switchToTab('chat');
            }, 500);
        } else {
            console.log('ℹ️ No hay conversación en la respuesta');
        }
        
        showNotification('Resumen generado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error al generar resumen:', error);
        showNotification('Error al generar el resumen. Por favor, intente nuevamente.', 'error');
    } finally {
        elements.loadingSpinner.classList.add('hidden');
        elements.btnGenerar.disabled = false;
    }
}

// Mostrar resumen CON SALTOS DE LÍNEA
function displayResumen(resumen) {
    console.log('📄 displayResumen() ejecutándose...');
    console.log('Texto recibido (primeros 150 chars):', resumen.substring(0, 150));
    
    // Reemplazar el marcador personalizado por <br>
    let html = resumen
        .replace(/###NEWLINE###/g, '<br>')  // Tu marcador actual
        .replace(/\|\|SALTO\|\|/g, '<br>')  // Alternativa
        .replace(/\\n/g, '<br>')            // Fallback para \n escapados
        .replace(/\n/g, '<br>');            // Fallback para \n reales
    
    // Mejorar formato de markdown
    html = html.replace(/##\s+(.+?)(<br>|$)/g, '<strong style="display:block; font-size:1.2em; margin:1em 0 0.5em; color:#fff;">$1</strong><br>');
    html = html.replace(/###\s+(.+?)(<br>|$)/g, '<strong style="display:block; font-size:1.1em; margin:0.8em 0 0.3em; color:#4a9eff;">$1</strong><br>');
    html = html.replace(/---/g, '<hr style="border:none; border-top:1px solid #3a3a3a; margin:1em 0;">');
    
    console.log('HTML generado (primeros 200 chars):', html.substring(0, 200));
    
    elements.resumenContent.innerHTML = html;
    elements.resumenSection.classList.remove('hidden');
    
    console.log('✅ Resumen mostrado correctamente');
}

// Mostrar conversación
function displayConversacion(conversacion, diccionario) {
    console.log('💬 displayConversacion() ejecutándose con', conversacion.length, 'mensajes');
    
    // Limpiar contenido anterior
    elements.conversacionContent.innerHTML = '';
    
    // Verificar que conversacionSection esté visible
    elements.conversacionSection.classList.remove('hidden');
    
    // Asignar colores únicos a cada usuario
    assignUserColors(conversacion, diccionario);
    
    // Mostrar información general
    displayConversacionInfo(conversacion);
    
    // Crear elementos de mensaje
    conversacion.forEach((msg, index) => {
        const mensajeElement = createMensajeElement(msg, diccionario);
        elements.conversacionContent.appendChild(mensajeElement);
    });
    
    console.log('✅ Conversación mostrada. Total elementos:', elements.conversacionContent.children.length);
}

// Asignar colores a usuarios
function assignUserColors(conversacion, diccionario) {
    const uniqueUsers = new Set();
    
    conversacion.forEach(msg => {
        const userId = msg.telefono || msg.Envia;
        uniqueUsers.add(userId);
    });
    
    let colorIndex = 0;
    uniqueUsers.forEach(userId => {
        state.userColors[userId] = colorIndex % 10;
        colorIndex++;
    });
}

// Mostrar información de la conversación
function displayConversacionInfo(conversacion) {
    const totalMensajes = conversacion.length;
    const uniqueUsers = new Set(conversacion.map(msg => msg.telefono || msg.Envia)).size;
    const fechaInicio = conversacion[0]?.timestamp || conversacion[0]?.created_at;
    const fechaFin = conversacion[conversacion.length - 1]?.timestamp || conversacion[conversacion.length - 1]?.created_at;
    
    elements.conversacionInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label">Total de mensajes</span>
            <span class="info-value">${totalMensajes}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Participantes</span>
            <span class="info-value">${uniqueUsers}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Período</span>
            <span class="info-value">${formatDateTime(fechaInicio)} - ${formatDateTime(fechaFin)}</span>
        </div>
    `;
}

// Crear elemento de mensaje
function createMensajeElement(mensaje, diccionario) {
    const div = document.createElement('div');
    div.className = 'mensaje';
    
    const userId = mensaje.telefono || mensaje.Envia;
    const userName = mensaje.nombre || diccionario?.[userId] || userId;
    const colorIndex = state.userColors[userId] || 0;
    
    div.setAttribute('data-color', colorIndex);
    
    const timestamp = mensaje.timestamp || mensaje.created_at;
    const mensajeTexto = mensaje.mensaje || mensaje.Mensaje || '';
    
    div.innerHTML = `
        <div class="mensaje-header">
            <span class="mensaje-usuario">${userName}</span>
            <span class="mensaje-tiempo">${formatDateTime(timestamp)}</span>
        </div>
        <div class="mensaje-texto">${escapeHtml(mensajeTexto)}</div>
    `;
    
    return div;
}

// Formatear fecha y hora
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('es-MX', options);
    } catch (error) {
        return dateString;
    }
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Funcionalidad del botón Admin
document.querySelector('.btn-admin')?.addEventListener('click', () => {
    alert('Funcionalidad de Admin próximamente');
});
