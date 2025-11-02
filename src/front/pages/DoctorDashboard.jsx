import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { logout } from '../services/fetch'; 
import '../css/DoctorDashboard.css'; 

//  Manejo de Fechas 

const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
const getTodayDateKey = () => new Date().toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });

// Datos  Simulación 

const initialAppointments = [
    { id: 100, dateKey: '20/10/2025', time: '08:00', patient: 'Pedro Solís', reason: 'Primera consulta', status: 'Pendiente' },
    { id: 101, dateKey: '22/10/2025', time: '09:00', patient: 'Ana López García', reason: 'Revisión anual', status: 'En consulta' },
    { id: 102, dateKey: '22/10/2025', time: '10:00', patient: 'Carlos Ruiz Sanz', reason: 'Dolor crónico', status: 'Pendiente' },
    { id: 103, dateKey: '23/10/2025', time: '11:30', patient: 'Marta Díaz Torres', reason: 'Seguimiento', status: 'Pendiente' },
    { id: 104, dateKey: '24/10/2025', time: '12:30', patient: 'Javier Pérez Soto', reason: 'Consulta de resultados', status: 'Finalizada' },
    { id: 105, dateKey: '27/10/2025', time: '16:00', patient: 'Elena Gil Cano', reason: 'Medicación', status: 'Pendiente' },
    { id: 106, dateKey: '11/11/2025', time: '09:00', patient: 'Roberto Martín', reason: 'Chequeo', status: 'Pendiente' },
];

const AccordionItem = ({ title, icon, links, onLinkClick }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleLinkClick = (e, linkName, linkPath) => {
        e.preventDefault();
        onLinkClick(linkPath, linkName); 
    };

    return (
        <div className="accordion-item">
            <div 
                className="accordion-header" 
                onClick={() => setIsOpen(!isOpen)}
            >
                <div>
                    <span className="icon">{icon}</span> {title}
                </div>
                <span className={`arrow ${isOpen ? 'rotated' : ''}`}>&gt;</span>
            </div>

            <div className={`accordion-content ${isOpen ? 'active' : ''}`}>
                {links.map((link, index) => (
                    <a
                        key={index}
                        href={link.path}
                        className="secondary-link"
                        onClick={(e) => handleLinkClick(e, link.name, link.path)}
                    >
                        {link.name}
                    </a>
                ))}
            </div>
        </div>
    );
};


// 2. Componente MonthlyCalendar 

const MonthlyCalendar = ({ currentMonthDate, setCurrentMonthDate, selectedDay, setSelectedDay, appointmentsData }) => {

    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const daysInMonth = getDaysInMonth(currentMonthDate);
    const firstDayIndex = getFirstDayOfMonth(currentMonthDate);
    const emptyDaysCount = (firstDayIndex === 0) ? 6 : firstDayIndex - 1; 
    const monthName = currentMonthDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const todayDateKey = getTodayDateKey(); 
    
    const daysWithAppointments = useMemo(() => {
        const appointmentDays = new Set();
        const monthKey = (month + 1).toString().padStart(2, '0') + '/' + year;
        appointmentsData.forEach(app => {
            if (app.dateKey.endsWith(monthKey)) {
                appointmentDays.add(parseInt(app.dateKey.substring(0, 2)));
            }
        });
        return appointmentDays;
    }, [appointmentsData, month, year]);

    const handlePrevMonth = () => {
        setCurrentMonthDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
        setSelectedDay(null);
    };
    const handleNextMonth = () => {
        setCurrentMonthDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
        setSelectedDay(null);
    };
    
    const handleDayClick = (day, isWeekend) => {
        if (isWeekend) { 
            console.log("No se pueden seleccionar sábados o domingos.");
            return;
        }
        
        const newDate = new Date(year, month, day);
        setSelectedDay(newDate);
    };

    const calendarDays = [];
    
    for (let i = 0; i < emptyDaysCount; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="calendar-day empty-day"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        const dayOfWeekIndex = dayDate.getDay(); 
        
        const isSelected = selectedDay && day === selectedDay.getDate() && month === selectedDay.getMonth();
        const isToday = dayDate.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }) === todayDateKey;
        const hasAppointments = daysWithAppointments.has(day);
        const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6; 

        let dayClass = 'calendar-day';
        if (isSelected) dayClass += ' day-selected';
        if (isToday) dayClass += ' day-today';
        if (hasAppointments) dayClass += ' day-has-appointments';
        if (isWeekend) dayClass += ' day-weekend'; 
        
        calendarDays.push(
            <div 
                key={day} 
                className={dayClass}
                onClick={() => handleDayClick(day, isWeekend)}
            >
                {day}
                {hasAppointments && !isWeekend && <span className="appointment-dot"></span>} 
            </div>
        );
    }

    return (
        <div className="calendar-card">
            <div className="calendar-header">
                <button className="calendar-nav-btn" onClick={handlePrevMonth} aria-label="Mes anterior">&lt;</button>
                <h2>{monthName} 📅</h2>
                <button className="calendar-nav-btn" onClick={handleNextMonth} aria-label="Mes siguiente">&gt;</button>
            </div>
            
            <div className="calendar-grid-labels">
                <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
            </div>

            <div className="calendar-grid">
                {calendarDays}
            </div>
        </div>
    );
};


// 3. Componente DailyAppointments 

const DailyAppointments = ({ appointments, onStatusChange }) => {
    
    const dateDisplay = appointments.length > 0 
        ? new Date(appointments[0].dateKey.split('/').reverse().join('-')).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'Selecciona una fecha';

    const getStatusClass = (status) => {
        switch (status) {
            case 'En consulta': return 'status-in-progress';
            case 'Finalizada': return 'status-completed';
            case 'Pendiente': return 'status-pending';
            default: return '';
        }
    };
    
    return (
        <div className="daily-appointments-card">
            <h3 className="appointment-header">Citas para: {dateDisplay} 🩺</h3>
            {appointments.length === 0 ? (
                <p className="no-appointments">No tienes citas programadas para esta fecha.</p>
            ) : (
                <div className="appointment-list">
                    {appointments.map((app) => (
                        <div key={app.id} className="appointment-item">
                            <div className="appointment-info">
                                <span className="appointment-time">{app.time}</span>
                                <strong className="appointment-patient">{app.patient}</strong>
                                <span className="appointment-reason">({app.reason})</span>
                            </div>
                              <div className="appointment-actions">
                                
                                <span className={`appointment-status ${getStatusClass(app.status)}`}>
                                    {app.status}
                                </span>

                                {app.status === 'Pendiente' && (
                                    <button 
                                        className="action-button secondary"
                                        onClick={() => onStatusChange(app.id, 'En consulta')}
                                        title="Marcar cita como En consulta"
                                    >
                                        ▶️ Iniciar
                                    </button>
                                )}
                                
                                {app.status === 'En consulta' && (
                                    <button 
                                        className="action-button tertiary"
                                        onClick={() => onStatusChange(app.id, 'Finalizada')}
                                        title="Marcar cita como Finalizada"
                                    >
                                        ✅ Finalizar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// 4. doctorMenuData (Datos de navegación)

const doctorMenuData = [
    {
        title: '1. Agenda y citas',
        icon: '📅',
        links: [
            { name: 'Calendario personal y de consultas', path: '/medico/agenda' },
            { name: 'Listado de pacientes citados', path: '/medico/citas-hoy' },
            { name: 'Reprogramar o cancelar citas', path: '/medico/modificar-cita' },
            { name: 'Disponibilidad automática', path: '/medico/bloquear-horas' },
            { name: 'Integración con Google Calendar', path: '/medico/integracion-agenda' },
        ],
    },
    {
        title: '2. Información de pacientes',
        icon: '📄',
        links: [
            { name: 'Notas médicas y evolución', path: '/medico/notas' },
            { name: 'Resultados de laboratorio o pruebas', path: '/medico/resultados' },
            { name: 'Adjuntar documentos o imágenes', path: '/medico/adjuntar-docs' },
            { name: 'Ver prescripciones anteriores', path: '/medico/prescripciones-previas' },
        ],
    },
    {
        title: '3. Gestión de prescripciones',
        icon: '✍️',
        links: [
            { name: 'Emitir o renovar recetas electrónicas', path: '/medico/emitir-receta' },
            { name: 'Registrar tratamientos', path: '/medico/registrar-tratamiento' },
            { name: 'Consultar alergias o contraindicaciones', path: '/medico/alergias' },
        ],
    },
    {
        title: '4. Comunicación',
        icon: '💬',
        links: [
            { name: 'Mensajería interna con pacientes y colegas', path: '/medico/mensajeria' },
            { name: 'Alertas del sistema', path: '/medico/alertas' },
            { name: 'Consultas interdepartamentales', path: '/medico/consultas-inter' },
        ],
   },
    {
        title: '5. Reportes y estadísticas',
        icon: '📈',
        links: [
            { name: 'Pacientes atendidos por día / mes', path: '/medico/reporte-atendidos' },
            { name: 'Tasa de ausencias (no-shows)', path: '/medico/tasa-ausencias' },
            { name: 'Carga de trabajo semanal o mensual', path: '/medico/carga-trabajo' },
            { name: 'Informes clínicos personalizados', path: '/medico/informes-personalizados' },
        ],
    },
    {
        title: '6. Administración y perfil',
        icon: '⚙️',
        links: [
            { name: 'Gestión de horarios y disponibilidad', path: '/medico/gestion-horarios' },
            { name: 'Actualización de datos profesionales', path: '/medico/perfil' },
            { name: 'Preferencias de notificación o agenda', path: '/medico/config-notif' },
        ],
    },
    {
        title: '7. Telemedicina (Opcional)',
        icon: '💻',
        links: [
            { name: 'Videoconsultas integradas', path: '/medico/videoconsultas' },
            { name: 'Chat en vivo con el paciente', path: '/medico/chat-vivo' },
            { name: 'Notas y diagnósticos postconsulta', path: '/medico/diagnosticos-tele' },
        ],
    },
];

// 5. Componente DoctorDashboard 

const DoctorDashboard = () => { 
    const navigate = useNavigate(); 
    const [doctorData, setDoctorData] = useState(null); 
    const [appointments, setAppointments] = useState(initialAppointments); 
    const [currentMonthDate, setCurrentMonthDate] = useState(new Date(2025, 9, 1));
    const [selectedDay, setSelectedDay] = useState(new Date(2025, 9, 20));
    
    useEffect(() => {
        const userDataString = localStorage.getItem("current_user");
        if (userDataString) {
            try {
                const data = JSON.parse(userDataString);
                setDoctorData({
                    title: data.title || 'Dr.',
                    name: data.first_name,
                    lastName: data.last_name, 
                    specialty: data.specialty || 'Especialidad',
                    
                });
            } catch (error) {
                console.error("Error al parsear los datos del usuario:", error);
                
                
            }
        } else {
            
             console.log("No hay datos de sesión, redirigiendo a Login.");
             navigate('/Login');
        }
    }, [navigate]); 

    // 3. MANEJO DE LOGOUT 
    const handleLogout = () => {
        logout(); 
        navigate('/Login', { replace: true }); // Redirige al Login
    };

    // 4. LÓGICA DE CITAS 
    const handleStatusChange = (appointmentId, newStatus) => {
        setAppointments(prevAppointments => {
            return prevAppointments.map(app => 
                app.id === appointmentId 
                    ? { ...app, status: newStatus } 
                    : app
            );
        });
        if (selectedDay) { setSelectedDay(new Date(selectedDay.getTime())); }
    };

    const filteredAppointments = useMemo(() => {
        if (!selectedDay) return [];
        const selectedDateKey = selectedDay.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
        return appointments.filter(app => app.dateKey === selectedDateKey);
    }, [selectedDay, appointments]); 

    // Muestra un mensaje de carga 
    if (!doctorData) {
        return <div className="loading-screen">Cargando perfil del doctor...</div>;
    }
    
    const doctorFullName = `${doctorData.name} ${doctorData.lastName}`;


    return (
        <div className="dashboard-container">
            <div className="sidebar">
                <h2 className="main-title-doctor">👨‍⚕️ Panel de Control del Médico</h2>
                
                {doctorMenuData.map((item, index) => (
                    <AccordionItem 
                        key={index}
                        title={item.title}
                        icon={item.icon}
                        links={item.links}
                        onLinkClick={() => {}} 
                    />
                ))}
            </div>

            <div className="content">
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h1>Bienvenido, {doctorData.title} {doctorFullName}</h1>
                    <button 
                        onClick={handleLogout} 
                        style={{ 
                            padding: '8px 15px', 
                            backgroundColor: '#dc3545', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            fontSize: '1em',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        title="Cerrar Sesión y volver al Login"
                    >
                        Salir 🚪
                    </button>
                </div>
                
                <p>Tu <strong>Área de Trabajo Clínico</strong> y Agenda. <strong>Especialidad:</strong> {doctorData.specialty}</p>
                
                <hr /> 

                <MonthlyCalendar 
                    currentMonthDate={currentMonthDate}
                    setCurrentMonthDate={setCurrentMonthDate}
                    selectedDay={selectedDay}
                    setSelectedDay={setSelectedDay}
                    appointmentsData={appointments} 
                />

                <DailyAppointments 
                    appointments={filteredAppointments} 
                    onStatusChange={handleStatusChange}
                />

                <div className="placeholder-content-doctor">
                    <h3>Acciones Rápidas</h3>
                    <p>Acceso a crear una nota rápida, generar un informe o revisar alertas urgentes.</p>
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;