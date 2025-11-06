import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/PatientDashboard.css';
import {
    fetchHealthCenters,
    fetchDoctors,
    createAppointment,
    updateAppointment,
    cancelAppointment
} from '../services/fetch.js';

export const OWN_API = "https://improved-space-invention-r4w9wj5r9q5pfxwqv-3001.app.github.dev/";

// =================================================================
// 🛡️ FUNCIÓN DE PARSEO SEGURO PARA LOCALSTORAGE
// =================================================================

const safeJsonParse = (key) => {
    const item = localStorage.getItem(key);
    if (!item || item.trim() === "") {
        return null;
    }
    try {
        return JSON.parse(item);
    } catch (e) {
        console.error(`[LocalStorage Error] No se pudo parsear la clave: "${key}". Datos corruptos. Limpiando clave.`, e);
        localStorage.removeItem(key);
        return null;
    }
};

// =================================================================
// 🕒 LÓGICA DE DÍAS Y HORAS (CORREGIDA)
// =================================================================

const generateHours = () => {
    const hours = [];
    for (let minutes = 540; minutes <= 840; minutes += 30) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        // FIX: El padding de minutos (m) debe ser 2
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

const getAvailableHours = (date, selectedCenterName, activeAppointments) => {
    if (!date || isUnavailableDay(date)) {
        return [];
    }

    const occupiedSlots = [];
    // Slots ya reservados por el paciente (estado local)
    activeAppointments.forEach(cita => {
        const citaDate = new Date(cita.date);
        if (cita.center === selectedCenterName &&
            citaDate.getDate() === date.getDate() &&
            citaDate.getMonth() === date.getMonth() &&
            citaDate.getFullYear() === date.getFullYear()) {
            occupiedSlots.push(cita.hour);
        }
    });

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

// =================================================================
// 5. COMPONENTE: SelectDoctor (Seleccionar Especialidad - ¡Ahora es un SELECT!)
// =================================================================

const SelectDoctor = ({ center, allDoctors, onSelectDoctor, onGoToAgendarCita, onLoading, onError }) => {

    // Obtener todas las especialidades únicas para el centro
    const uniqueSpecialties = Array.from(new Set(
        allDoctors
            .filter(d => d.center_id === center.id)
            .map(d => d.specialty)
    )).sort();

    const [selectedSpecialty, setSelectedSpecialty] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);

    const handleSpecialtyChange = (e) => {
        const specialty = e.target.value;
        setSelectedSpecialty(specialty);

        // Encontrar el primer doctor disponible para esa especialidad en ese centro
        // Nota: Esto asume que cualquier doctor con la especialidad es válido por ahora.
        const doctor = allDoctors.find(d =>
            d.center_id === center.id && d.specialty === specialty
        );

        if (doctor) {
            setSelectedDoctor(doctor);
        } else {
            setSelectedDoctor(null);
        }
    };

    const handleConfirmSelection = () => {
        if (selectedDoctor) {
            onSelectDoctor(selectedDoctor); // Notificar al padre con el doctor
        }
    };

    return (
        <div className="cita-container">
            <h2>🧑‍⚕️ Seleccionar Especialidad</h2>

            <div className="info-center-display">
                <p>Centro de Salud Seleccionado: <strong>{center.name}</strong></p>
            </div>

            {onLoading && (
                <div className="placeholder-content notification-box">
                    <h3>Cargando Doctores...</h3>
                    <p>⏳ Por favor, espere.</p>
                </div>
            )}

            {onError && (
                <div className="placeholder-content notification-box error-notification">
                    <h3>❌ Error de Carga</h3>
                    <p>{onError}</p>
                </div>
            )}

            {!onLoading && !onError && uniqueSpecialties.length > 0 ? (
                <>
                    <p>Paso 2: Elige la especialidad que necesitas en <strong>{center.name}</strong>:</p>

                    <div className="specialty-select-container">
                        <select
                            value={selectedSpecialty}
                            onChange={handleSpecialtyChange}
                            className="specialty-dropdown"
                        >
                            <option value="" disabled>-- Seleccione una Especialidad --</option>
                            {uniqueSpecialties.map((specialty, index) => (
                                <option key={index} value={specialty}>{specialty}</option>
                            ))}
                        </select>
                    </div>

                    {selectedSpecialty && selectedDoctor && (
                        <div className="confirmation-box" style={{ marginTop: '20px' }}>
                            <p>
                                Especialidad seleccionada: <strong>{selectedDoctor.specialty}</strong>.
                                Se ha asignado provisionalmente al Médico: <strong>{selectedDoctor.name}</strong>.
                            </p>
                            <button
                                className="confirm-button"
                                onClick={handleConfirmSelection}
                            >
                                Seleccionar Especialidad y Continuar
                            </button>
                        </div>
                    )}
                </>
            ) : (
                !onLoading && !onError && <div className="placeholder-content">
                    <p>😔 No se encontraron especialidades disponibles para este centro.</p>
                </div>
            )}
        </div>
    );
};

// =================================================================
// 1. COMPONENTE: AgendarCita
// =================================================================

const AgendarCita = ({ patientName, selectedCenterName, selectedDoctor, onAppointmentConfirmed, activeAppointments, onGoToGestionarCitas, isModifying }) => {

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    const [selectedDate, setSelectedDate] = useState(null);
    const [availableHours, setAvailableHours] = useState([]);
    const [selectedHour, setSelectedHour] = useState(null);
    const [isConfirmed, setIsConfirmed] = useState(false);

    const dateToRender = new Date(currentYear, currentMonth, 1);
    const monthName = dateToRender.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const startingEmptyDays = (firstDayOfWeek + 6) % 7;

    useEffect(() => {
        setSelectedDate(null);
        setSelectedHour(null);
        setIsConfirmed(false);
    }, [selectedCenterName, selectedDoctor]);

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
        const hours = getAvailableHours(date, selectedCenterName, activeAppointments);
        setAvailableHours(hours);
    };
    const handleHourSelect = (hour) => {
        setSelectedHour(hour);
        setIsConfirmed(false);
    };

    const handleConfirmAppointment = async () => {
        if (selectedDate && selectedHour && selectedDoctor) {
            const appointmentDetails = {
                patient: patientName,
                center: selectedCenterName,
                doctor: selectedDoctor.name,
                specialty: selectedDoctor.specialty,
                date: selectedDate,
                hour: selectedHour,
                dateTimeFormatted: `${selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} a las ${selectedHour} hrs`
            };

            const success = await onAppointmentConfirmed(appointmentDetails);

            if (success) {
                setIsConfirmed(true);
            }
        }
    };

    const isPastDate = (day) => {
        const today = new Date();
        const currentDate = new Date(currentYear, currentMonth, day);
        return currentDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    };
    return (
        <div className="cita-container">
            <h2>📅 {isModifying ? 'Reagendar Cita' : 'Agendar Nueva Cita'}</h2>

            <div className="info-center-display">
                <p>Centro de Salud: <strong>{selectedCenterName}</strong></p>
                {selectedDoctor && <p>Médico: <strong>{selectedDoctor.name}</strong> ({selectedDoctor.specialty})</p>}
            </div>

            {isConfirmed ? (
                <div className="confirmation-row success-message">
                    <p>✅ <strong>¡Cita {isModifying ? 'Reagendada' : 'Confirmada'} con Éxito!</strong></p>

                    <div className="details-grid">
                        <span><strong>Paciente:</strong> {patientName}</span>
                        <span><strong>Centro:</strong> {selectedCenterName}</span>
                        {selectedDoctor && <span><strong>Médico:</strong> {selectedDoctor.name} ({selectedDoctor.specialty})</span>}
                        <span><strong>Fecha y Hora:</strong> {selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} a las {selectedHour} hrs</span>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <p style={{ fontWeight: 'bold' }}>¿Quiere gestionar sus citas agendadas?</p>
                        <button
                            className="confirm-button"
                            onClick={onGoToGestionarCitas}
                            style={{ backgroundColor: '#007bff' }}
                        >
                            Ver y Gestionar Mis Citas
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <p>Paso 3: Selecciona la fecha y hora. (Horario: Lun-Vie de 9:00 a 14:00)</p>

                    <div className="date-selector-mock">
                        <button onClick={goToPreviousMonth}>&lt;</button>
                        <span>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
                        <button onClick={goToNextMonth} disabled={currentYear >= 2030 && currentMonth === 11}>&gt;</button>
                    </div>

                    <div className="centered-calendar-container">

                        <div className="calendar-grid">
                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                                <div key={day} className="day-header"><strong>{day}</strong></div>
                            ))}
                            {[...Array(startingEmptyDays)].map((_, i) => <div key={`empty-${i}`} className="day-cell empty"></div>)}
                            {[...Array(daysInMonth)].map((_, i) => {
                                const day = i + 1;
                                const dateToCheck = new Date(currentYear, currentMonth, day);
                                const isUnavailable = isUnavailableDay(dateToCheck);
                                const hasAvailability = getAvailableHours(dateToCheck, selectedCenterName, activeAppointments).length > 0;
                                return (
                                    <div
                                        key={day}
                                        className={`day-cell 
                                            ${selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth ? 'selected' : ''} 
                                            ${isUnavailable ? 'unavailable-day' : 'working-day'}
                                            ${hasAvailability ? 'has-availability' : ''}
                                            ${isPastDate(day) ? 'past-day' : ''}
                                        `}
                                        onClick={() => !isPastDate(day) && handleDaySelect(day)}
                                    >
                                        {day}
                                        {hasAppointmentOnDay(day) && <span className="appointment-indicator">🔴</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {selectedDate && (
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
                                <p className="no-availability">😔 No hay horarios disponibles para el día seleccionado en <strong>{selectedCenterName}</strong>.</p>
                            )}
                        </div>
                    )}


                    {selectedHour && (
                        <div className="confirmation-box">
                            <p>Cita pre-seleccionada: <strong>{selectedDate.toLocaleDateString()} a las {selectedHour}</strong> en <strong>{selectedCenterName}</strong> con <strong>{selectedDoctor.name}</strong></p>
                            <button className="confirm-button" onClick={handleConfirmAppointment}>
                                {isModifying ? 'Confirmar Reagendamiento' : 'Confirmar Cita Ahora'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// =================================================================
// 2. COMPONENTE: GestionarCitas
// =================================================================

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

                                <span>
                                    <strong>Centro:</strong> {cita.centerInfo?.name || cita.center || 'Hospital General'}
                                    {cita.centerInfo?.address && <><br /><small>{cita.centerInfo.address}</small></>}
                                </span>

                                {cita.doctor && <span><strong>Médico:</strong> {cita.doctor} ({cita.specialty})</span>}

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

// =================================================================
// 3. COMPONENTE: SelectHealthCenter
// =================================================================

const SelectHealthCenter = ({ onSelectCenter, currentCenterName, allCenters, onLoading, onError }) => {

    const centers = allCenters;

    if (onLoading) {
        return (
            <div className="placeholder-content notification-box">
                <h3>Cargando Centros de Salud...</h3>
                <p>⏳ Por favor, espere mientras cargamos la lista de centros disponibles.</p>
            </div>
        );
    }

    if (onError) {
        return (
            <div className="placeholder-content notification-box error-notification">
                <h3>❌ Error de Carga</h3>
                <p>{onError}</p>
                <p><strong>Sugerencia:</strong> Si ves un error de **CORS**, debes instalar y configurar `Flask-CORS` en tu backend de Python.</p>
            </div>
        );
    }

    return (
        <div className="placeholder-content notification-box select-center-box">
            <h3>⚠️ Selección de Centro de Salud</h3>

            {currentCenterName ? (
                <p>El centro actualmente seleccionado es: <strong>{currentCenterName}</strong>. Si deseas <strong>cambiarlo</strong>, elige uno de la lista a continuación:</p>
            ) : (
                <p>Antes de poder agendar o gestionar citas, por favor, <strong>selecciona tu Centro de Salud</strong> principal:</p>
            )}


            <div className="centers-list">
                {centers.map(center => (
                    <button
                        key={center.id}
                        className={`center-button ${currentCenterName === center.name ? 'selected' : ''}`}
                        onClick={() => onSelectCenter(center)}
                    >
                        <strong>{center.name}</strong>

                        <br /><small>{center.address}</small>
                    </button>
                ))}
            </div>
        </div>
    );
};

// =================================================================
// 4. COMPONENTE PRINCIPAL: PatientDashboard
// =================================================================

const mapPathToView = (path) => {
    return path.split('/').pop();
};

// --- MENÚ LATERAL RESTAURADO ---
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
            { name: 'Seleccionar/Cambiar Centro', path: '/paciente/select-center' },
        ],
    },
];

const PatientDashboard = () => {

    const navigate = useNavigate();
    const [patientData, setPatientData] = useState({
        fullName: 'Paciente',
        hospital: 'Hospital'
    });

    const [loadingCenters, setLoadingCenters] = useState(true);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [apiError, setApiError] = useState(null);

    const [selectedHealthCenter, setSelectedHealthCenter] = useState(
        safeJsonParse('selectedHealthCenter')
    );
    const [selectedDoctor, setSelectedDoctor] = useState(
        safeJsonParse('selectedDoctor')
    );
    const [allCenters, setAllCenters] = useState([]);
    const [allDoctors, setAllDoctors] = useState([]);

    const [currentView, setCurrentView] = useState('welcome');
    const [openAccordion, setOpenAccordion] = useState('1. Citas médicas'); // Abierto por defecto
    const [activeAppointments, setActiveAppointments] = useState([]);
    const [isModifying, setIsModifying] = useState(false);
    const [appointmentToModifyIndex, setAppointmentToModifyIndex] = useState(null);

    const [historyStack, setHistoryStack] = useState(['welcome']);

    useEffect(() => {
        let userDataString = localStorage.getItem("current_user");
        if (!userDataString) {
            // Datos simulados si no hay usuario en localStorage
            userDataString = JSON.stringify({
                user: { first_name: "NombreReal", last_name: "ApellidoReal", id: 1 },
                hospitalName: "Nombre del Hospital"
            });
        }
        if (userDataString) {
            try {
                const data = JSON.parse(userDataString);
                const name = data.user?.first_name || data.first_name || 'Usuario';
                const lastName = data.user?.last_name || data.last_name || 'Invitado';
                const fullPatientName = `${name} ${lastName}`;
                setPatientData({
                    fullName: fullPatientName,
                    hospital: data.hospitalName || 'Hospital General',
                    id: data.user?.id || data.id || null
                });
            } catch (error) {
                console.error("Error al parsear datos del paciente:", error);
            }
        }

        const loadApiData = async () => {
            setLoadingCenters(true);
            setLoadingDoctors(true);
            setApiError(null);
            try {
                const [centersData, doctorsData] = await Promise.all([
                    fetchHealthCenters(),
                    fetchDoctors()
                ]);

                setAllCenters(centersData);
                setAllDoctors(doctorsData);

                if (selectedHealthCenter) {
                    const centerExists = centersData.some(c => c.id === selectedHealthCenter.id);
                    if (!centerExists) {
                        setSelectedHealthCenter(null);
                        setSelectedDoctor(null);
                    }
                }

            } catch (err) {
                console.error("Error al cargar datos de la API:", err.message);
                setApiError(err.message);
            } finally {
                setLoadingCenters(false);
                setLoadingDoctors(false);
            }
        };

        loadApiData();
    }, []);

    useEffect(() => {
        if (selectedHealthCenter) {
            localStorage.setItem('selectedHealthCenter', JSON.stringify(selectedHealthCenter));
        } else {
            localStorage.removeItem('selectedHealthCenter');
        }

        if (selectedDoctor) {
            localStorage.setItem('selectedDoctor', JSON.stringify(selectedDoctor));
        } else {
            localStorage.removeItem('selectedDoctor');
        }
    }, [selectedHealthCenter, selectedDoctor]);

    const handleLogout = () => {
        localStorage.removeItem("current_user");
        localStorage.removeItem("selectedHealthCenter");
        localStorage.removeItem("selectedDoctor");
        navigate('/login');
    };

    // --- NAVEGACIÓN (Sin useCallback para evitar 'stale state' y refrescos) ---

    const handleSelectCenter = (center) => {
        setSelectedHealthCenter(center);
        setSelectedDoctor(null);
        handleNavigationClick('/paciente/select-doctor');
    };

    const handleSelectDoctor = (doctor) => {
        setSelectedDoctor(doctor);
        handleNavigationClick('/paciente/agendar-cita');
    };

    const handleGoBack = () => {
        if (historyStack.length > 1) {
            const newStack = historyStack.slice(0, -1);
            const previousView = newStack[newStack.length - 1];

            if (previousView !== 'agendar-cita') {
                setIsModifying(false);
                setAppointmentToModifyIndex(null);
            }
            setHistoryStack(newStack);
            setCurrentView(previousView);
        } else {
            setCurrentView('welcome');
        }
    };

    const handleNavigationClick = (path) => {
        const viewKey = mapPathToView(path);

        // Lógica de flujo de citas
        if (viewKey === 'agendar-cita') {
            if (!selectedHealthCenter) {
                setCurrentView('select-center');
                setHistoryStack(prev => [...prev, 'select-center']);
                return;
            } else if (!selectedDoctor) {
                setCurrentView('select-doctor');
                setHistoryStack(prev => [...prev, 'select-doctor']);
                return;
            }
        }

        if (viewKey === 'select-doctor' && !selectedHealthCenter) {
            setCurrentView('select-center');
            setHistoryStack(prev => [...prev, 'select-center']);
            return;
        }

        // Navegación general
        if (viewKey !== currentView) {
            setHistoryStack(prev => {
                if (prev[prev.length - 1] === viewKey) return prev;
                const maxStackSize = 10;
                let newStack = prev.length >= maxStackSize ? prev.slice(1) : [...prev];
                return [...newStack, viewKey];
            });
            if (viewKey !== 'agendar-cita') {
                setIsModifying(false);
                if (viewKey !== 'gestionar-citas') {
                    setAppointmentToModifyIndex(null);
                }
            }
            setCurrentView(viewKey);
        }
    };

    // --- LÓGICA DE CITAS (CREAR Y MODIFICAR) ---
    const handleAppointmentConfirmed = async (appointmentDetails) => {
        // Formato de fecha requerido por la API: "DD-M-YYYY H:M"
        const appointmentDate = appointmentDetails.date;
        const [hour, minute] = appointmentDetails.hour.split(':').map(Number);

        // Creamos una cadena de fecha sin el padStart de 2 digitos para el mes/dia si no lo requiere el backend
        const appointmentDateString = `${appointmentDate.getDate()}-${(appointmentDate.getMonth() + 1)}-${appointmentDate.getFullYear()} ${hour}:${minute}`;

        // --- LÓGICA DE MODIFICACIÓN (PUT) ---
        if (isModifying && appointmentToModifyIndex !== null) {
            const originalAppointment = activeAppointments[appointmentToModifyIndex];
            const appointmentId = originalAppointment.apiId;

            if (!appointmentId) {
                alert("Error: No se puede modificar una cita que no tiene un ID de la API.");
                return false;
            }

            const apiData = {
                appointment_date: appointmentDateString,
                doctor_id: selectedDoctor.id, // Aseguramos que el doctor no ha cambiado si es el mismo centro/especialidad
            };
            const result = await updateAppointment(appointmentId, apiData);

            if (result.success) {
                // Crear el objeto de cita actualizado para el estado local
                const updatedAppointment = {
                    ...originalAppointment, // Mantiene IDs, paciente, doctor, centro
                    date: appointmentDetails.date, // Actualiza la fecha
                    hour: appointmentDetails.hour, // Actualiza la hora
                    dateTimeFormatted: appointmentDetails.dateTimeFormatted // Actualiza el string
                };

                const updatedAppointments = activeAppointments.map((cita, index) =>
                    index === appointmentToModifyIndex ? updatedAppointment : cita
                );
                setActiveAppointments(updatedAppointments);

                // Limpiar estado de modificación
                setIsModifying(false);
                setAppointmentToModifyIndex(null);
                return true; // Éxito
            } else {
                alert(`❌ Error al reagendar la cita: ${result.message}`);
                return false; // Fallo
            }
        }

        // --- LÓGICA DE CREACIÓN (POST) ---
        const apiData = {
            doctor_id: selectedDoctor.id,
            patient_id: patientData.id,
            center_id: selectedHealthCenter.id,
            appointment_date: appointmentDateString
        };

        const result = await createAppointment(apiData);

        if (result.success) {
            // Actualizar estado local solo si la API tuvo éxito
            const selectedCenterData = allCenters.find(c => c.id === selectedHealthCenter.id);
            const centerInfoForAppointment = selectedCenterData
                ? { name: selectedCenterData.name, address: selectedCenterData.address }
                : { name: appointmentDetails.center, address: 'Dirección no disponible' };

            const newAppointment = {
                ...appointmentDetails,
                centerInfo: centerInfoForAppointment,
                center: appointmentDetails.center,
                doctor: selectedDoctor.name,
                specialty: selectedDoctor.specialty,
                apiId: result.data.id // Guardar el ID de la API
            };

            const updatedAppointments = [...activeAppointments, newAppointment];
            setActiveAppointments(updatedAppointments);
            return true; // Éxito
        } else {
            alert(`❌ Error al agendar la cita: ${result.message}`);
            return false; // Fallo
        }
    };

    // --- LÓGICA REAGENDAR (Pre-carga el estado) ---
    const handleModifyClick = (originalIndex) => {
        const appToModify = activeAppointments[originalIndex];
        if (!appToModify) return;

        // 1. Poner en modo Modificación
        setAppointmentToModifyIndex(originalIndex);
        setIsModifying(true);

        // 2. Encontrar y setear el centro y doctor originales
        const originalCenter = allCenters.find(c => c.name === appToModify.centerInfo.name);
        const originalDoctor = allDoctors.find(d => d.name === appToModify.doctor && d.specialty === appToModify.specialty);

        if (originalCenter && originalDoctor) {
            setSelectedHealthCenter(originalCenter);
            setSelectedDoctor(originalDoctor);
            // 3. Navegar directo al calendario
            handleNavigationClick('/paciente/agendar-cita');
        } else {
            alert("No se pudo encontrar el doctor o centro original para reagendar. Por favor, seleccione un doctor y centro manualmente.");
            setIsModifying(false);
            setAppointmentToModifyIndex(null);
        }
    };

    // --- LÓGICA CANCELAR (Llama a la API) ---
    const handleCancelCita = async (indexToCancel) => {
        const appointmentToCancel = activeAppointments[indexToCancel];

        if (!appointmentToCancel || !appointmentToCancel.apiId) {
            alert("Error: No se puede cancelar esta cita (falta ID de API).");
            return;
        }

        if (window.confirm("¿Estás seguro de que quieres CANCELAR esta cita?")) {

            const result = await cancelAppointment(appointmentToCancel.apiId);

            if (result.success) {
                // Solo si la API tiene éxito, actualiza el estado local
                const newAppointments = activeAppointments.filter((_, index) => index !== indexToCancel);
                setActiveAppointments(newAppointments);
                setCurrentView('gestionar-citas');
                alert("Cita cancelada con éxito.");
            } else {
                alert(`Error al cancelar la cita: ${result.message}`);
            }
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

    // --- RENDERIZADO DE NOTIFICACIONES MEJORADO (Respuesta a la Imagen 1) ---
    const renderSelectCenterWarning = () => {

        const isWelcomeView = currentView === 'welcome';

        return (
            <div className="placeholder-content">
                <h3>Área de Contenido Principal</h3>

                {apiError && (
                    <div className="warning-notification error-notification api-error-box">
                        <div className="icon-wrapper">❌</div>
                        <div className="message-content">
                            <h4>Error de Conexión con el Servidor</h4>
                            <p>No se pudieron cargar los datos de la plataforma. Por favor, asegúrate de que el **backend está activo**.</p>
                            <small>Detalle técnico: {apiError.split(' (Verifica')[0]}</small>
                        </div>
                    </div>
                )}

                {!apiError && loadingCenters && (
                    <div className="info-notification api-loading-box">
                        <div className="icon-wrapper">⏳</div>
                        <div className="message-content">
                            <h4>Cargando Datos Iniciales...</h4>
                            <p>Estamos cargando la información de centros y doctores.</p>
                        </div>
                    </div>
                )}

                {!apiError && !loadingCenters && !selectedHealthCenter ? (
                    <div className="warning-notification select-required-box">
                        <div className="icon-wrapper">⚠️</div>
                        <div className="message-content">
                            <h4>¡Atención! Centro de Salud Requerido</h4>
                            <p>Debes <strong>escoger un Centro de Salud</strong> para poder usar el sistema de citas.</p>
                            <button className="quick-button button-select-center" onClick={() => handleNavigationClick('/paciente/select-center')}>
                                Seleccionar Centro de Salud
                            </button>
                        </div>
                    </div>
                ) : !apiError && !loadingCenters && selectedHealthCenter && !selectedDoctor ? (
                    <div className="warning-notification select-required-box">
                        <div className="icon-wrapper">⚠️</div>
                        <div className="message-content">
                            <h4>¡Atención! Especialidad Requerida</h4>
                            <p>Has seleccionado <strong>{selectedHealthCenter.name}</strong>. Ahora selecciona una especialidad para agendar tu cita.</p>
                            <button className="quick-button button-select-doctor" onClick={() => handleNavigationClick('/paciente/select-doctor')}>
                                Seleccionar Especialidad
                            </button>
                        </div>
                    </div>
                ) : !apiError && selectedHealthCenter && selectedDoctor && isWelcomeView ? (
                    <div className="info-notification ready-box">
                        <div className="icon-wrapper">✅</div>
                        <div className="message-content">
                            <h4>Todo Listo</h4>
                            <p>Tu centro es: <strong>{selectedHealthCenter.name}</strong>.</p>
                            <p>Tu especialidad: <strong>{selectedDoctor.specialty}</strong>. Ya puedes agendar citas.</p>
                        </div>
                    </div>
                ) : null}

                {isWelcomeView && <p style={{ marginTop: '20px' }}>Selecciona una opción del menú lateral o usa los botones de acceso rápido.</p>}

                {!isWelcomeView && !['agendar-cita', 'gestionar-citas', 'select-center', 'select-doctor'].includes(currentView) && (
                    <div className="info-notification under-construction-box">
                        <div className="icon-wrapper">🚧</div>
                        <div className="message-content">
                            <h4>Área en Construcción</h4>
                            <p>La funcionalidad para <strong>{currentView}</strong> aún no está implementada en este panel.</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // --- RENDERIZADO DE VISTAS ---
    const renderContent = () => {

        const sortedAppointmentsWithIndex = sortAppointmentsChronologically(activeAppointments).map((cita, index) => {
            const originalIndex = activeAppointments.findIndex(originalCita =>
                originalCita.apiId ? originalCita.apiId === cita.apiId : (originalCita.date === cita.date && originalCita.hour === cita.hour)
            );
            return { ...cita, originalIndex: originalIndex !== -1 ? originalIndex : index };
        });

        const centerName = selectedHealthCenter?.name || null;

        switch (currentView) {
            case 'agendar-cita':
                if (!selectedHealthCenter || !selectedDoctor) {
                    return renderSelectCenterWarning();
                }
                return (
                    <AgendarCita
                        patientName={patientData.fullName}
                        selectedCenterName={centerName}
                        selectedDoctor={selectedDoctor}
                        onAppointmentConfirmed={handleAppointmentConfirmed}
                        activeAppointments={activeAppointments}
                        onGoToGestionarCitas={() => handleNavigationClick('/paciente/gestionar-citas')}
                        isModifying={isModifying}
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
            case 'select-center':
                return (
                    <SelectHealthCenter
                        onSelectCenter={handleSelectCenter}
                        currentCenterName={centerName}
                        allCenters={allCenters}
                        onLoading={loadingCenters}
                        onError={apiError}
                    />
                );
            case 'select-doctor':
                if (!selectedHealthCenter) return renderSelectCenterWarning();
                return (
                    <SelectDoctor
                        center={selectedHealthCenter}
                        allDoctors={allDoctors}
                        onSelectDoctor={handleSelectDoctor}
                        onGoToAgendarCita={() => handleNavigationClick('/paciente/agendar-cita')}
                        onLoading={loadingDoctors}
                        onError={apiError}
                    />
                );
            case 'welcome':
            default:
                return renderSelectCenterWarning();
        }
    };

    // --- RENDER JSX PRINCIPAL ---

    return (
        <div className="dashboard-container">
            <div className="sidebar">
                <h2 className="main-title">👋 Panel de Paciente</h2>

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
                                    const viewKey = mapPathToView(link.path);

                                    // Deshabilitar "Agendar Cita" si falta centro o doctor
                                    const isDisabledLink = (viewKey === 'agendar-cita' && (!selectedHealthCenter || !selectedDoctor));

                                    return (
                                        <a
                                            key={linkIndex}
                                            href="#"
                                            className={`secondary-link ${isDisabledLink ? 'disabled-link' : ''}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (!isDisabledLink) {
                                                    handleNavigationClick(link.path);
                                                }
                                            }}
                                        >
                                            {link.name}
                                            {isDisabledLink && <span className="warning-indicator">⚠️</span>}
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
                        Cerrar Sesión
                    </button>
                </div>

                <p>Tu información de salud a un clic. Utiliza el menú lateral o el acceso rápido para navegar.</p>

                <div className="navigation-bar">
                    {historyStack.length > 1 ?
                        (
                            <button
                                className="go-back-button"
                                onClick={handleGoBack}
                            >
                                🔙 Volver atrás
                            </button>
                        ) : (
                            <div></div>
                        )}

                    {selectedHealthCenter && currentView !== 'select-center' && (
                        <button
                            className="change-center-button-global"
                            onClick={() => handleNavigationClick('/paciente/select-center')}
                        >
                            Cambiar Centro 🏥
                        </button>
                    )}
                </div>

                <div className="quick-access-buttons fixed-buttons">
                    <button
                        className="quick-button button-agenda"
                        onClick={() => handleQuickAccessClick('Tus citas')}
                        disabled={!selectedHealthCenter || !selectedDoctor}
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