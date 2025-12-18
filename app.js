// Estado de la aplicacion
const state = {
    chats: [],
    selectedChat: null,
    fechaDesde: null,
    fechaHasta: null,
    conversacionData: null,
    userColors: {}
};

// Elementos del DOM - se inicializan despues
const elements = {};

// Funcion para obtener elemento de forma segura
function getElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.error('[ERROR] Elemento no encontrado:', id);
    } else {
        console.log('[OK] Elemento encontrado:', id);
    }
    return el;
}

// Inicializar la aplicacion
document.addEventListener('DOMContentLoaded', () => {
    console.log('[INIT] Inicializando aplicacion...');
    
    // Inicializar elementos del DOM
    elements.chatSelect = getElement('chatSelect');
    elements.fechaDesde = getElement('fechaDesde');
    elements.fechaHasta = getElement('fechaHasta');
    elements.btnGenerar = getElement('btnGenerar');
    elements.loadingSpinner = getElement('loadingSpinner');
    elements.resumenSection = getElement('resumenSection');
    elements.resumenContent = getElement('resumenContent');
    elements.chatConversacionContent = getElement('chatConversacionContent');
    
    // Verificar que todos los elementos criticos existen
    const elementosCriticos = ['chatSelect', 'fechaDesde', 'fechaHasta', 'btnGenerar'];
    const todosExisten = elementosCriticos.every(key => elements[key] !== null);
    
    if (!todosExisten) {
        console.error('[ERROR] Faltan elementos criticos del DOM');
        alert('Error: No se pudieron cargar todos los elementos de la pagina');
        return;
    }
    
    console.log('[OK] Todos los elementos cargados correctamente');
    
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
    if (elements.fechaHasta) {
        elements.fechaHasta.value = today;
        state.fechaHasta = today;
    }
    
    // Establecer fecha desde como hace 7 dias
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    if (elements.fechaDesde) {
        elements.fechaDesde.value = weekAgoStr;
        state.fechaDesde = weekAgoStr;
    }
}

// Cargar lista de chats desde el webhook
async function loadChats() {
    if (!elements.chatSelect) return;
    
    try {
        elements.chatSelect.innerHTML = '<option value="">Cargando chats...</option>';
        elements.chatSelect.disabled = true;
        
        console.log('[FETCH] Cargando chats desde:', CONFIG.WEBHOOK_GET_CHATS);
        const response = await fetch(CONFIG.WEBHOOK_GET_CHATS);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[OK] Chats recibidos:', data);
        
        if (data.chats && Array.isArray(data.chats)) {
            state.chats = data.chats;
            populateChatSelect(data.chats);
        } else {
            throw new Error('Formato de respuesta invalido');
        }
        
    } catch (error) {
        console.error('[ERROR] Error al cargar chats:', error);
        elements.chatSelect.innerHTML = '<option value="">Error al cargar chats</option>';
        showNotification('Error al cargar la lista de chats', 'error');
    } finally {
        elements.chatSelect.disabled = false;
    }
}

// Poblar el dropdown de chats
function populateChatSelect(chats) {
    if (!elements.chatSelect) return;
    
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
    if (elements.chatSelect) {
        elements.chatSelect.addEventListener('change', (e) => {
            state.selectedChat = e.target.value;
            validateForm();
        });
    }
    
    if (elements.fechaDesde) {
        elements.fechaDesde.addEventListener('change', (e) => {
            state.fechaDesde = e.target.value;
            validateForm();
        });
    }
    
    if (elements.fechaHasta) {
        elements.fechaHasta.addEventListener('change', (e) => {
            state.fechaHasta = e.target.value;
            validateForm();
        });
    }
    
    if (elements.btnGenerar) {
        elements.btnGenerar.addEventListener('click', generarResumen);
    }
}

// Validar formulario
function validateForm() {
    if (!elements.btnGenerar) return;
    
    const isValid = state.selectedChat && state.fechaDesde && state.fechaHasta;
    elements.btnGenerar.disabled = !isValid;
}

// Generar resumen y cargar conversacion
async function generarResumen() {
    console.log('[START] Generando resumen...');
    
    try {
        // Ocultar secciones anteriores de forma segura
        if (elements.resumenSection) {
            elements.resumenSection.classList.add('hidden');
        }
        
        if (elements.chatConversacionContent) {
            elements.chatConversacionContent.innerHTML = '';
        }
        
        // Mostrar loading
        if (elements.loadingSpinner) {
            elements.loadingSpinner.classList.remove('hidden');
        }
        
        if (elements.btnGenerar) {
            elements.btnGenerar.disabled = true;
        }
        
        // Preparar datos para el POST
        const payload = {
            idGrupo: state.selectedChat,
            fechaDesde: state.fechaDesde,
            fechaHasta: state.fechaHasta
        };
        
        console.log('[POST] Enviando payload:', payload);
        console.log('[POST] URL:', CONFIG.WEBHOOK_POST_CONVERSATION);
        
        // Hacer POST al webhook
        const response = await fetch(CONFIG.WEBHOOK_POST_CONVERSATION, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('[RESPONSE] Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ERROR] Response:', errorText);
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[OK] Datos recibidos:', data);
        
        // Guardar datos
        state.conversacionData = data;
        
        // Mostrar resumen
        if (data.resumen) {
            displayResumen(data.resumen);
        } else {
            console.warn('[WARN] No se recibio resumen');
        }
        
        // Mostrar conversacion
        if (data.conversacion) {
            displayConversacion(data.conversacion);
        } else {
            console.warn('[WARN] No se recibio conversacion');
        }
        
        showNotification('Resumen generado exitosamente', 'success');
        
    } catch (error) {
        console.error('[ERROR] Al generar resumen:', error);
        alert('Error al generar el resumen: ' + error.message + '\n\nRevisa la consola para mas detalles.');
        showNotification('Error al generar el resumen. Por favor, intente nuevamente.', 'error');
    } finally {
        // Ocultar loading
        if (elements.loadingSpinner) {
            elements.loadingSpinner.classList.add('hidden');
        }
        
        if (elements.btnGenerar) {
            elements.btnGenerar.disabled = false;
        }
    }
}

// Mostrar resumen
function displayResumen(resumen) {
    if (!elements.resumenContent || !elements.resumenSection) {
        console.error('[ERROR] No se pueden mostrar el resumen: elementos no encontrados');
        return;
    }
    
    console.log('[DISPLAY] Mostrando resumen');
    
    // Convertir \n a saltos de linea HTML
    const resumenHTML = resumen.replace(/\n/g, '<br>');
    elements.resumenContent.innerHTML = '<div>' + resumenHTML + '</div>';
    elements.resumenSection.classList.remove('hidden');
}

// Mostrar conversacion en el tab Chat
function displayConversacion(conversacion) {
    if (!elements.chatConversacionContent) {
        console.error('[ERROR] No se puede mostrar conversacion: elemento no encontrado');
        return;
    }
    
    console.log('[DISPLAY] Mostrando conversacion');
    
    // Limpiar contenido anterior
    elements.chatConversacionContent.innerHTML = '';
    
    // Si la conversacion es un string (texto), mostrarla como tal
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
        elements.chatConversacionContent.appendChild(pre);
    } 
    // Si es un array (mensajes individuales), procesarlos
    else if (Array.isArray(conversacion)) {
        conversacion.forEach(msg => {
            const mensajeDiv = document.createElement('div');
            mensajeDiv.style.marginBottom = '15px';
            mensajeDiv.style.padding = '10px';
            mensajeDiv.style.backgroundColor = '#2a2a2a';
            mensajeDiv.style.borderRadius = '8px';
            
            const timestamp = msg.timestamp || msg.created_at || '';
            const usuario = msg.telefono || msg.Envia || 'Usuario';
            const mensaje = msg.mensaje || msg.Mensaje || '';
            
            mensajeDiv.innerHTML = 
                '<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">' +
                    '<strong style="color: #4CAF50;">' + escapeHtml(usuario) + '</strong>' +
                    '<span style="color: #888; font-size: 0.9em;">' + formatDateTime(timestamp) + '</span>' +
                '</div>' +
                '<div style="color: #e0e0e0;">' + escapeHtml(mensaje) + '</div>';
            
            elements.chatConversacionContent.appendChild(mensajeDiv);
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mostrar notificacion (simple)
function showNotification(message, type) {
    type = type || 'info';
    console.log('[' + type.toUpperCase() + '] ' + message);
}
