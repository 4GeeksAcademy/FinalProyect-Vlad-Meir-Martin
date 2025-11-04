import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatientAppointments } from '../services/fetch';
import '../css/PatientDashboard.css';

// LÓGICA DE DÍAS Y HORAS

const generateHours = () => {
    const hours = [];
    for (let minutes = 540; minutes <= 840; minutes += 30) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        hours.push(time);
    }
    return hours;
};
const workingHours = generateHours();


const isUnavailableDay = (date) => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
};

const getAvailableHours = (date) => {
    if (!date || isUnavailableDay(date)) {
        return [];
    }

    const occupiedSlots = [];
    if (date.getDate() === 15) {
        occupiedSlots.push('09:00', '14:00');
    }

    return workingHours.filter(hour => !occupiedSlots.includes(hour));
};

const sortAppointmentsChronologically = (appointments) => {
    return [...appointments].sort((a, b) => {
        const dateA = new Date(a.date);
        dateA.setHours(parseInt(a.hour.substring(0, 2)), parseInt(a.hour.substring(3, 5)));

        const dateB = new Date(b.date);
        dateB.setHours(parseInt(b.hour.substring(0, 2)), parseInt(b.hour.substring(3, 5)));

        return dateA - dateB;
    });
};


// 1. COMPONENTE DE VISTA SECUNDARIA: AgendarCita

const AgendarCita = ({ patientName, hospitalName, onAppointmentConfirmed, initialDate, activeAppointments }) => {

    const initialMonth = initialDate ? initialDate.getMonth() : new Date().getMonth();
    const initialYear = initialDate ? initialDate.getFullYear() : new Date().getFullYear();

    const [currentMonth, setCurrentMonth] = useState(initialMonth);
    const [currentYear, setCurrentYear] = useState(initialYear);

    const [selectedDate, setSelectedDate] = useState(null);
    const [availableHours, setAvailableHours] = useState([]);
    const [selectedHour, setSelectedHour] = useState(null);
    const [isConfirmed, setIsConfirmed] = useState(false);

    const dateToRender = new Date(currentYear, currentMonth, 1);
    const monthName = dateToRender.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const startingEmptyDays = (firstDayOfWeek + 6) % 7;

    const hasAppointmentOnDay = (day) => {
        return activeAppointments.some(cita =>
            cita.date.getDate() === day &&
            cita.date.getMonth() === currentMonth &&
            cita.date.getFullYear() === currentYear
        );
    };

    const goToPreviousMonth = () => {
        const today = new Date();
        if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) return;

        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
        setSelectedDate(null);
        setIsConfirmed(false);
    };

    const goToNextMonth = () => {
        if (currentYear >= 2030) return;

        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
        setSelectedDate(null);
        setIsConfirmed(false);
    };

    const handleDaySelect = (day) => {
        const date = new Date(currentYear, currentMonth, day);

        if (isUnavailableDay(date)) {
            setSelectedDate(null);
            setAvailableHours([]);
            setSelectedHour(null);
            setIsConfirmed(false);
            return;
        }

        setSelectedDate(date);
        setSelectedHour(null);
        setIsConfirmed(false);

        const hours = getAvailableHours(date);
        setAvailableHours(hours);
    };

    const handleHourSelect = (hour) => {
        setSelectedHour(hour);
        setIsConfirmed(false);
    };

    const handleConfirmAppointment = () => {
        if (selectedDate && selectedHour) {

            const appointmentDetails = {
                patient: patientName,
                hospital: hospitalName,
                date: selectedDate,
                hour: selectedHour,
                dateTimeFormatted: `${selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} a las ${selectedHour} hrs`
            };

            setIsConfirmed(true);
            onAppointmentConfirmed(appointmentDetails);
        }
    };


    return (
        <div className="cita-container">
            <h2>📅 Agendar Nueva Cita</h2>

            {isConfirmed && (
                <div className="confirmation-row">
                    <p>✅ <strong>Cita Confirmada</strong></p>
                    <div className="details-grid">
                        <span><strong>Paciente:</strong> {patientName}</span>
                        <span><strong>Hospital:</strong> {hospitalName}</span>
                        <span><strong>Fecha y Hora:</strong> {selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} a las {selectedHour} hrs</span>
                    </div>
                </div>
            )}



            <p>Paso 1: Selecciona la fecha y hora. (Horario: Lun-Vie de 9:00 a 14:00)</p>

            <div className="date-selector-mock">
                <button onClick={goToPreviousMonth}>&lt;</button>
                <span>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
                <button onClick={goToNextMonth} disabled={currentYear >= 2030 && currentMonth === 11}>&gt;</button>
            </div>

            <div className="centered-calendar-container">
                <div className="calendar-grid">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                        <div key={day} className="day-header">{day}</div>
                    ))}

                    {[...Array(startingEmptyDays)].map((_, i) => <div key={`empty-${i}`} className="day-cell empty"></div>)}

                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const dateToCheck = new Date(currentYear, currentMonth, day);
                        const isUnavailable = isUnavailableDay(dateToCheck);
                        const isOccupied = hasAppointmentOnDay(day);

                        return (
                            <div
                                key={day}
                                className={`day-cell 
                                    ${selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth ? 'selected' : ''} 
                                    ${isUnavailable ? 'unavailable-day' : 'working-day'}
                                    ${!isUnavailable && getAvailableHours(dateToCheck).length > 0 ? 'has-availability' : ''}
                                `}
                                onClick={() => handleDaySelect(day)}
                            >
                                {day}
                                {isOccupied && <span className="appointment-indicator">🔴</span>}
                            </div>
                        )
                    })}
                </div>
            </div>

            {selectedDate && !isConfirmed && (
                <div className="availability-panel">
                    <h3>Horas Disponibles para el {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>

                    {availableHours.length > 0 ? (
                        <div className="hours-list">
                            {availableHours.map(hour => (
                                <button
                                    key={hour}
                                    className={`hour-button ${selectedHour === hour ? 'selected-hour' : ''}`}
                                    onClick={() => handleHourSelect(hour)}
                                >
                                    {hour}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="no-availability">😔 No hay horarios disponibles para el día seleccionado.</p>
                    )}
                </div>
            )}

            {selectedHour && !isConfirmed && (
                <div className="confirmation-box">
                    <p>Cita pre-seleccionada: <strong>{selectedDate.toLocaleDateString()} a las {selectedHour}</strong></p>
                    <button className="confirm-button" onClick={handleConfirmAppointment}>
                        Confirmar Cita Ahora
                    </button>
                </div>
            )}
        </div>
    );
};


// 2. COMPONENTE DE VISTA SECUNDARIA: GestionarCitas

const GestionarCitas = ({ sortedAppointments, onModifyClick, onCancelCita }) => {
    return (
        <div className="cita-container">
            <h2>✏️ Gestionar Citas Agendadas</h2>

            {sortedAppointments && sortedAppointments.length > 0 ? (
                sortedAppointments.map((cita, index) => (
                    <div key={index} className="appointment-view gestion-item">
                        <h3>
                            {index + 1}. Cita {cita.date.getDate()} de {cita.date.toLocaleDateString('es-ES', { month: 'long' })}
                        </h3>
                        <div className="confirmation-row current-appointment">
                            <div className="details-grid">
                                <span><strong>Paciente:</strong> {cita.patient}</span>
                                <span><strong>Hospital:</strong> {cita.hospital}</span>
                                <span><strong>Fecha y Hora:</strong> {cita.dateTimeFormatted}</span>
                            </div>
                        </div>

                        <div className="modification-actions">
                            <button
                                className="confirm-button"
                                onClick={() => onModifyClick(cita.originalIndex)}
                            >
                                Reagendar
                            </button>


                            <button
                                className="quick-button button-cancelar cancel-btn"
                                onClick={() => onCancelCita(cita.originalIndex)}
                            >
                                ¿Cancelar su cita?
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="placeholder-content">
                    <p>No tienes citas activas para gestionar.</p>
                </div>
            )}
        </div>
    );
};


// 3. DATOS Y LÓGICA DE NAVEGACIÓN

const mapPathToView = (path) => {
    return path.split('/').pop();
};

const patientMenuData = [
    {
        title: '1. Citas médicas',
        icon: '📅',
        links: [
            { name: 'Agendar cita', path: '/paciente/agendar-cita' },
            { name: 'Gestionar citas', path: '/paciente/gestionar-citas' },
            { name: 'Historial de citas', path: '/paciente/historial-citas' },
            { name: 'Recordatorios automáticos', path: '/paciente/recordatorios' },
        ],
    },
    {
        title: '2. Resultados e informes médicos',
        icon: '🔬',
        links: [
            { name: 'Análisis clínicos y de laboratorio', path: '/paciente/analisis' },
            { name: 'Informes de radiología o diagnóstico', path: '/paciente/radiologia' },
            { name: 'Informes de alta hospitalaria', path: '/paciente/alta' },
            { name: 'Historial médico completo', path: '/paciente/historial-medico' },
        ],
    },
    {
        title: '3. Prescripciones y medicación',
        icon: '💊',
        links: [
            { name: 'Visualizar recetas activas', path: '/paciente/recetas-activas' },
            { name: 'Descargar receta electrónica', path: '/paciente/descargar-receta' },
            { name: 'Solicitar renovación o revisión', path: '/paciente/solicitar-renovacion' },
            { name: 'Historial de medicación', path: '/paciente/historial-medicacion' },
        ],
    },
    {
        title: '4. Facturación y seguros',
        icon: '💳',
        links: [
            { name: 'Visualizar facturas (pagadas o pendientes)', path: '/paciente/facturas' },
            { name: 'Realizar pagos online', path: '/paciente/pagos' },
            { name: 'Consultar cobertura o aseguradora', path: '/paciente/cobertura' },
        ],
    },
    {
        title: '5. Comunicación directa',
        icon: '💬',
        links: [
            { name: 'Mensajería segura con el médico', path: '/paciente/mensajeria' },
            { name: 'Solicitudes administrativas', path: '/paciente/solicitudes-adm' },
            { name: 'Alertas o notificaciones del hospital', path: '/paciente/alertas' },
        ],
    },
    {
        title: '6. Documentos personales',
        icon: '📁',
        links: [
            { name: 'Subir documentos externos', path: '/paciente/subir-docs' },
            { name: 'Descargar documentos del hospital', path: '/paciente/descargar-docs' },
        ],
    },
    {
        title: '7. Perfil y configuración',
        icon: '⚙️',
        links: [
            { name: 'Datos personales y de contacto', path: '/paciente/datos-personales' },
            { name: 'Preferencias de notificación', path: '/paciente/preferencias' },
            { name: 'Gestión de contraseñas y seguridad', path: '/paciente/seguridad' },
        ],
    },
];

// 4. COMPONENTE PRINCIPAL: PatientDashboard

const PatientDashboard = () => {
    const navigate = useNavigate();

    const [patientData, setPatientData] = useState({
        fullName: 'Paciente',
        hospital: 'Hospital'
    });

    const [currentView, setCurrentView] = useState('welcome');
    const [openAccordion, setOpenAccordion] = useState(null);
    const [activeAppointments, setActiveAppointments] = useState([]);
    const [isModifying, setIsModifying] = useState(false);
    const [appointmentToModifyIndex, setAppointmentToModifyIndex] = useState(null);

    //ReactAppointments
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)


    const hospitalName = patientData.hospital;

    useEffect(() => {
        let userDataString = localStorage.getItem("current_user");

        if (!userDataString) {
            console.warn("No se encontró 'current_user' en localStorage. Usando datos de prueba.");

            userDataString = JSON.stringify({
                user: {
                    first_name: "NombreReal",
                    last_name: "ApellidoReal",
                },
                hospitalName: "Nombre del Hospital"
            });
        }

        if (userDataString) {
            try {
                const data = JSON.parse(userDataString);

                const name = data.first_name || 'Usuario';
                const lastName = data.last_name || 'Invitado';
                const fullPatientName = `${name} ${lastName}`;

                setPatientData({
                    fullName: fullPatientName,
                    hospital: data.hospitalName || 'Hospital General'
                });
            } catch (error) {
                console.error("Error al parsear datos del paciente:", error);
            }
        }
    }, []);

    useEffect(() => {
        const fetchAppointments = async () => {
            setLoading(true);
            setError(null);

            const result = await getPatientAppointments();

            if (result.success) {
                setAppointments(result.data);
            } else {
                setError(result.message);
                console.error("Fallo al cargar desde la API:", result.message);
            }
            setLoading(false)
        };

        fetchAppointments();

    }, []);

    const handleLogout = () => {
        localStorage.removeItem("current_user");
        navigate('/login');
    };


    const handleNavigationClick = (path) => {
        const viewKey = mapPathToView(path);

        if (viewKey !== 'agendar-cita') {
            setIsModifying(false);
            if (viewKey !== 'gestionar-citas') {
                setAppointmentToModifyIndex(null);
            }
        }
        setCurrentView(viewKey);
    };

    const handleAppointmentConfirmed = (appointmentDetails) => {
        let newAppointments;

        if (isModifying && appointmentToModifyIndex !== null) {
            newAppointments = activeAppointments.map((cita, index) =>
                index === appointmentToModifyIndex ? appointmentDetails : cita
            );
            setIsModifying(false);
            setAppointmentToModifyIndex(null);
        } else {
            newAppointments = [...activeAppointments, appointmentDetails];
        }

        setActiveAppointments(newAppointments);
        setCurrentView('gestionar-citas');
    };

    const handleModifyClick = (originalIndex) => {
        setAppointmentToModifyIndex(originalIndex);
        setIsModifying(true);
        setCurrentView('agendar-cita');
    };

    const handleCancelCita = (indexToCancel) => {
        if (window.confirm("¿Estás seguro de que quieres CANCELAR esta cita?")) {
            const newAppointments = activeAppointments.filter((_, index) => index !== indexToCancel);
            setActiveAppointments(newAppointments);
            setCurrentView('gestionar-citas');
            console.log(`Cita N° ${indexToCancel + 1} Cancelada.`);
        }
    };

    const handleAccordionToggle = (title) => {
        setOpenAccordion(openAccordion === title ? null : title);
    };

    const handleQuickAccessClick = (action) => {
        const pathMap = {
            'Tus citas': '/paciente/agendar-cita',
            'Gestionar citas': '/paciente/gestionar-citas',
        };
        handleNavigationClick(pathMap[action]);
    };

    const renderContent = () => {

        const appointmentsForCalendar = appointments.map(apiCita => {
            // 1. Usamos la propiedad REAL: apiCita.appointment_date
            const dateObject = new Date(apiCita.appointment_date); 
            
            // 2. Formateo Robusto
            const dateFormatted = dateObject.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
            const hourFormatted = dateObject.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
            const dateTimeFormatted = `${dateFormatted} a las ${hourFormatted} hrs`;


            return {
                patient: patientData.fullName,
                hospital: hospitalName,
                
                // Propiedades usadas por GestionarCitas
                date: dateObject, // Objeto Date (para getDate() y toLocaleDateString())
                hour: hourFormatted, // Solo la hora
                dateTimeFormatted: dateTimeFormatted, // La cadena completa de fecha y hora
                originalIndex: apiCita.id 
            };
        });

        const citaToModify = appointmentToModifyIndex !== null ? appointmentsForCalendar.find(c => c.originalIndex === appointmentToModifyIndex) : null;

        if (loading) {
            return (
                <div className="placeholder-content loading-state">
                    <h3>Cargando Citas...</h3>
                    <p>Por favor, espere mientras se recuperan sus datos desde el servidor.</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="placeholder-content error-state">
                    <h3>❌ Error de Conexión o Autenticación</h3>
                    <p>**Detalle:** {error}</p>
                    <p className="error-note">Revisa tu conexión. Si tu sesión expiró, el <a href="#" onClick={() => navigate('/login')}>login</a> lo solucionará.</p>
                </div>
            );
        }

        const sortedAppointmentsWithIndex = sortAppointmentsChronologically(appointmentsForCalendar).map((cita) => {
            const originalIndex = cita.originalIndex; // Ya usamos el ID/Index de la API
            return { ...cita, originalIndex };
        });


        switch (currentView) {
            case 'agendar-cita':
                return (
                    <AgendarCita
                        patientName={patientData.fullName}
                        hospitalName={hospitalName}
                        onAppointmentConfirmed={handleAppointmentConfirmed}
                        initialDate={citaToModify ? citaToModify.date : null}
                        // Usamos los datos mapeados para el calendario
                        activeAppointments={appointmentsForCalendar} 
                    />
                );
            case 'gestionar-citas':
                return (
                    <GestionarCitas
                        sortedAppointments={sortedAppointmentsWithIndex}
                        onModifyClick={handleModifyClick}
                        onCancelCita={handleCancelCita}
                    />
                );
            case 'welcome':
            default:
                return (
                    <div className="placeholder-content">
                        <h3>Área de Contenido Principal</h3>
                        <p>Selecciona una opción del menú lateral o usa los botones de acceso rápido.</p>
                    </div>
                );
        }
    };

    return (
        <div className="dashboard-container">
            <div className="sidebar">
                <h2 className="main-title">👋 Panel de Control del Paciente</h2>

                {patientMenuData.map((item, index) => {
                    const isOpen = openAccordion === item.title;

                    return (
                        <div key={index} className="accordion-item">
                            <div
                                className="accordion-header"
                                onClick={() => handleAccordionToggle(item.title)}
                            >
                                <div>
                                    <span className="icon">{item.icon}</span> {item.title}
                                </div>
                                <span className={`arrow ${isOpen ? 'rotated' : ''}`}>&gt;</span>
                            </div>

                            <div className={`accordion-content ${isOpen ? 'active' : ''}`}>
                                {item.links.map((link, linkIndex) => {
                                    if (link.name === 'Modificar cita' || link.name === 'Cancelar cita') return null;

                                    return (
                                        <a
                                            key={linkIndex}
                                            href="#"
                                            className="secondary-link"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                let path = link.path;
                                                if (path.includes('modificar-cita') || path.includes('cancelar-cita')) {
                                                    path = '/paciente/gestionar-citas';
                                                }
                                                handleNavigationClick(path);
                                            }}
                                        >
                                            {link.name}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="content">
                <div className="header-row">
                    <h1>Bienvenido/a, {patientData.fullName}</h1>
                    <button className="logout-button" onClick={handleLogout}>
                        Salir
                    </button>
                </div>

                <p>Tu información de salud a un clic. Utiliza el menú lateral o el acceso rápido para navegar.</p>

                <div className="quick-access-buttons">

                    <button
                        className="quick-button button-agenda"
                        onClick={() => handleQuickAccessClick('Tus citas')}
                    >
                        <span className="button-icon">📅</span>
                        Tus citas
                    </button>

                    <button
                        className="quick-button button-modificar"
                        onClick={() => handleQuickAccessClick('Gestionar citas')}
                    >
                        <span className="button-icon">✏️</span>
                        Gestionar citas
                    </button>

                </div>

                {renderContent()}
            </div>
        </div>
    );
};

export default PatientDashboard;