// Estado de la aplicacion
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
    chatConversacionContent: document.getElementById('chatConversacionContent')
};

// Inicializar la aplicacion
document.addEventListener('DOMContentLoaded', () => {
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
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
        });
    });
}

// Inicializar inputs de fecha con fecha de hoy
function initializeDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    elements.fechaHasta.value = today;
    state.fechaHasta = today;
    
    // Establecer fecha desde como hace 7 dias
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
            throw new Error('Error HTTP: ' + response.status);
        }
        
        const data = await response.json();
        
        if (data.chats && Array.isArray(data.chats)) {
            state.chats = data.chats;
            populateChatSelect(data.chats);
        } else {
            throw new Error('Formato de respuesta invalido');
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
    
    // Boton generar
    elements.btnGenerar.addEventListener('click', generarResumen);
}

// Validar formulario
function validateForm() {
    const isValid = state.selectedChat && state.fechaDesde && state.fechaHasta;
    elements.btnGenerar.disabled = !isValid;
}

// Generar resumen y cargar conversacion
async function generarResumen() {
    try {
        // Ocultar secciones anteriores
        if (elements.resumenSection) {
            elements.resumenSection.classList.add('hidden');
        }
        
        // Limpiar conversacion anterior
        const chatContent = document.getElementById('chatConversacionContent');
        if (chatContent) {
            chatContent.innerHTML = '';
        }
        
        // Mostrar loading
        if (elements.loadingSpinner) {
            elements.loadingSpinner.classList.remove('hidden');
        }
        elements.btnGenerar.disabled = true;
        
        // Preparar datos para el POST
        const payload = {
            idGrupo: state.selectedChat,
            fechaDesde: state.fechaDesde,
            fechaHasta: state.fechaHasta
        };
        
        console.log('Enviando payload:', payload);
        
        // Hacer POST al webhook
        const response = await fetch(CONFIG.WEBHOOK_POST_CONVERSATION, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('Error HTTP: ' + response.status);
        }
        
        const data = await response.json();
        console.log('Respuesta recibida:', data);
        
        // Guardar datos
        state.conversacionData = data;
        
        // Mostrar resumen
        if (data.resumen) {
            displayResumen(data.resumen);
        }
        
        // Mostrar conversacion
        if (data.conversacion) {
            displayConversacion(data.conversacion);
        }
        
        showNotification('Resumen generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al generar resumen:', error);
        showNotification('Error al generar el resumen. Por favor, intente nuevamente.', 'error');
    } finally {
        if (elements.loadingSpinner) {
            elements.loadingSpinner.classList.add('hidden');
        }
        elements.btnGenerar.disabled = false;
    }
}

// Mostrar resumen
function displayResumen(resumen) {
    if (!elements.resumenContent || !elements.resumenSection) {
        console.error('Error: elementos de resumen no encontrados');
        return;
    }
    
    // Convertir saltos de linea a HTML
    const resumenHTML = resumen.replace(/\n/g, '<br>');
    elements.resumenContent.innerHTML = '<div>' + resumenHTML + '</div>';
    elements.resumenSection.classList.remove('hidden');
}

// Mostrar conversacion
function displayConversacion(conversacion) {
    const chatContent = document.getElementById('chatConversacionContent');
    
    if (!chatContent) {
        console.error('Error: chatConversacionContent no encontrado');
        return;
    }
    
    // Limpiar contenido anterior
    chatContent.innerHTML = '';
    
    // Si la conversacion es un string (formato de texto)
    if (typeof conversacion === 'string') {
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordWrap = 'break-word';
        pre.style.fontFamily = 'inherit';
        pre.style.padding = '20px';
        pre.style.backgroundColor = '#1a1a1a';
        pre.style.borderRadius = '8px';
        pre.style.lineHeight = '1.6';
        pre.style.color = '#e0e0e0';
        pre.textContent = conversacion;
        chatContent.appendChild(pre);
    }
    // Si es un array de mensajes
    else if (Array.isArray(conversacion)) {
        conversacion.forEach(msg => {
            const mensajeDiv = document.createElement('div');
            mensajeDiv.className = 'mensaje';
            mensajeDiv.style.marginBottom = '15px';
            mensajeDiv.style.padding = '10px';
            mensajeDiv.style.backgroundColor = '#2a2a2a';
            mensajeDiv.style.borderRadius = '8px';
            
            const timestamp = msg.timestamp || msg.created_at || '';
            const usuario = msg.nombre || msg.telefono || msg.Envia || 'Usuario';
            const mensaje = msg.mensaje || msg.Mensaje || '';
            
            mensajeDiv.innerHTML = 
                '<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">' +
                    '<strong style="color: #4CAF50;">' + escapeHtml(usuario) + '</strong>' +
                    '<span style="color: #888; font-size: 0.9em;">' + formatDateTime(timestamp) + '</span>' +
                '</div>' +
                '<div style="color: #e0e0e0;">' + escapeHtml(mensaje) + '</div>';
            
            chatContent.appendChild(mensajeDiv);
        });
    }
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
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mostrar notificacion
function showNotification(message, type) {
    type = type || 'info';
    console.log('[' + type.toUpperCase() + '] ' + message);
}
