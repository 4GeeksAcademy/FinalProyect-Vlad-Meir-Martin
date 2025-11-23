import React, { useState } from 'react';
import '../css/Register.css';
import { OWN_API, register } from '../services/fetch';
// Importamos useNavigate para la redirección post-registro (opcional, pero buena práctica)
import { useNavigate } from 'react-router-dom'; 


function Register() {

    const navigate = useNavigate(); // Hook para la redirección

    // Estados de información básica
    const [first_name, setFirst_name] = useState('');
    const [last_name, setLast_name] = useState('');
    const [birth_date, setBirth_date] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    // Estados de Doctor
    const [role, setRole] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [specialty, setSpecialty] = useState(''); // 💡 NUEVO ESTADO PARA ESPECIALIDAD

    // Estados de seguridad
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Estado para mensajes de usuario
    const [message, setMessage] = useState({}); // Usamos objeto para consistencia

    const isValidEmail = (email) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    const handleRoleChange = (selectedRole) => {
        setRole(selectedRole);
        // Limpiamos los campos específicos si el rol cambia a Paciente
        if (selectedRole !== 'doctor') {
            setLicenseNumber('');
            setSpecialty(''); // 💡 Limpiamos la especialidad
        }
    };

    const handleRegistration = async (event) => {
        event.preventDefault();
        setMessage({}); // Limpiamos el mensaje

        
        // 1. VALIDACIONES BÁSICAS
        if (!first_name || !last_name || !birth_date || !email || !password || !confirmPassword) {
            setMessage({ text: 'Todos los campos básicos son obligatorios. 📝', type: 'error' });
            return;
        }

        if (!role) {
            setMessage({ text: 'Debes seleccionar si eres Médico o Paciente. 🧑‍⚕️/🧍', type: 'error' });
            return;
        }

        // 2. VALIDACIONES DE DOCTOR
        if (role === 'doctor') {
            const licenseRegex = /^\d{9}$/;
            if (!licenseNumber || !licenseRegex.test(licenseNumber)) {
                setMessage({ text: 'El Número de Matrícula debe tener exactamente 9 dígitos. 🔢', type: 'error' });
                return;
            }
            // 💡 NUEVA VALIDACIÓN PARA ESPECIALIDAD
            if (!specialty || specialty.trim().length < 3) {
                setMessage({ text: 'Por favor, introduce la especialidad médica.', type: 'error' });
                return;
            }
        }

        // 3. OTRAS VALIDACIONES
        if (!isValidEmail(email)) {
            setMessage({ text: 'Por favor, introduce un correo electrónico válido. 📧', type: 'error' });
            return;
        }

        const phoneRegex = /^\d{9,}$/;
        if (!phoneRegex.test(phoneNumber)) {
            setMessage({ text: 'Por favor, introduce un número de teléfono válido (mín. 9 dígitos). 📞', type: 'error' });
            return;
        }

        if (password.length < 6) {
            setMessage({ text: 'La contraseña debe tener al menos 6 caracteres. 🔑', type: 'error' });
            return;
        }

        if (password !== confirmPassword) {
            setMessage({ text: 'Las contraseñas no coinciden. Por favor, revísalas. ❌', type: 'error' });
            return;
        }

        // 4. PREPARAR DATOS Y LLAMAR A LA API

        const registrationData = { 
            first_name, last_name, birth_date, email, phoneNumber, password, role 
        };

        if (role === 'doctor') {
            registrationData.licenseNumber = licenseNumber;
            registrationData.specialty = specialty; // 💡 Añadimos la especialidad
        }

        setMessage({
            text: `Registrando como ${role.toUpperCase()}...`,
            type: 'info'
        })

        console.log(registrationData)
        console.log('enviando datos de registro a la API...')
        
        // Ejecución del registro
        const result = await register(registrationData)

        if (result && result.success) {
            setMessage({ text: `Registro exitoso como ${result.role.toUpperCase()}! Serás redirigido. 🎉`, type: 'success' });
            
            // Limpiar campos después del éxito
            setFirst_name(''); setLast_name(''); setBirth_date(''); setEmail('');
            setLicenseNumber(''); setSpecialty(''); setPhoneNumber(''); setRole('');
            setPassword(''); setConfirmPassword('');

            // 💡 Redirección después del registro exitoso (ej. a la página de Login)
            setTimeout(() => {
                navigate('/Login');
            }, 2000);

        } else if (result && result.message) {
            setMessage({
                text: `Fallo en el registro: ${result.message}`,
                type: 'error'
            });
        } else {
            setMessage({
                text: 'Fallo desconocido en el registro. Inténtalo de nuevo más tarde.',
                type: 'error'
            });
        }
    };


    return (
        <div className="register-container">
            <h2>Crear una Cuenta Nueva</h2>

            <form onSubmit={handleRegistration} className="register-form">

                {/* --- Campos de Información Básica --- */}
                <div className="form-group"><label htmlFor="name">Nombre:</label><input type="text" id="first_name" value={first_name} onChange={(e) => setFirst_name(e.target.value)} placeholder="Tu nombre" required /></div>
                <div className="form-group"><label htmlFor="lastName">Apellidos:</label><input type="text" id="last_name" value={last_name} onChange={(e) => setLast_name(e.target.value)} placeholder="Tus apellidos" required /></div>
                <div className="form-group"><label htmlFor="birthdate">Fecha de Nacimiento:</label><input type="date" id="birth_date" value={birth_date} onChange={(e) => setBirth_date(e.target.value)} required /></div>
                <div className="form-group"><label htmlFor="email">Correo Electrónico:</label><input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ejemplo@dominio.com" required /></div>
                <div className="form-group"><label htmlFor="phoneNumber">Número de Teléfono:</label><input type="tel" id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Ej. 600112233" /></div>

                <hr className="divider" />

                {/* --- Selección de Rol --- */}
                <div className="form-group role-selection">
                    <label>Selecciona tu Rol:</label>
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={role === 'doctor'}
                                onChange={() => handleRoleChange('doctor')}
                            />
                            Médico 🧑‍⚕️
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={role === 'paciente'}
                                onChange={() => handleRoleChange('paciente')}
                            />
                            Paciente 🧍
                        </label>
                    </div>
                </div>

                {/* CAMPO DE NUMERO DE LICENCIA */}
                {role === 'doctor' && (
                    <>
                        <div className="form-group license-group">
                            <label htmlFor="licenseNumber">Número de Matrícula de Colegiado (9 dígitos):</label>
                            <input
                                type="number"
                                id="licenseNumber"
                                value={licenseNumber}
                                onChange={(e) => setLicenseNumber(e.target.value)}
                                placeholder="Introduce tu matrícula (Ej: 123456789)"
                                required={role === 'doctor'}
                                maxLength="9"
                            />
                        </div>
                        
                        {/* CAMPO DE ESPECIALIDAD */}
                        <div className="form-group specialty-group">
                            <label htmlFor="specialty">Especialidad:</label>
                            <input
                                type="text"
                                id="specialty"
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                                placeholder="Ej. Cardiología, Pediatría, etc."
                                required={role === 'doctor'}
                            />
                        </div>
                    </>
                )}

                <hr className="divider" />

                {/* --- Campos de Contraseña --- */}
                <div className="form-group"><label htmlFor="password">Contraseña (Mín. 6 chars):</label><input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crea una contraseña segura" required /></div>
                <div className="form-group"><label htmlFor="confirmPassword">Repetir Contraseña:</label><input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" required /></div>


                <button type="submit" className="register-button">
                    REGISTRARME
                </button>
            </form>


            {message.text && (
                <div
                    className="message"
                    style={{
                        color: message.type === 'error' ? '#e74c3c' : '#2ecc71',
                        fontWeight: 'bold',
                        marginTop: '15px'
                    }}
                >
                    {message.text}
                </div>
            )}
        </div>
    );
}

export default Register;