import React, { useState } from 'react';
import '../styles/Register.css';

const REGISTRATION_API_URL = 'https://fluffy-trout-69w6wjxrjg4w25w77-3001.app.github.dev/api/register';

function Register() {

    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    const [role, setRole] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [centerId, setCenterId] = useState('');
    const [workDays, setWorkDays] = useState('');


    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [message, setMessage] = useState('');

    const isValidEmail = (email) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    const handleRoleChange = (selectedRole) => {
        setRole(selectedRole);
        if (selectedRole !== 'doctor') {
            setLicenseNumber('');
        }
    };

    const handleRegistration = async (event) => {
        event.preventDefault();
        setMessage('');


        if (!name || !lastName || !dob || !email || !phoneNumber || !password || !confirmPassword) {
            setMessage({ text: 'Todos los campos básicos son obligatorios. 📝', type: 'error' });
            return;
        }


        if (!role) {
            setMessage({ text: 'Debes seleccionar si eres Médico o Paciente. 🧑‍⚕️/🧍', type: 'error' });
            return;
        }


        if (role === 'doctor') {
            const licenseRegex = /^\d{9}$/;
            if (!licenseNumber || !licenseRegex.test(licenseNumber)) {
                setMessage({ text: 'El Número de Matrícula debe tener exactamente 9 dígitos. 🔢', type: 'error' });
                return;
            }
        }


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

        setMessage({
            text: `¡Registro exitoso como ${role.toUpperCase()} para ${name}! Redirigiendo... 🎉`,
            type: 'success'
        });

        const registrationData = {
            "first_name": name,
            "last_name": lastName,
            "birth_date": dob,
            "email": email,
            "password": password,
            "role": role,
        };

        if (role === 'doctor') {
            registrationData.specialty = specialty;
            registrationData.centerID = centerId;
            registrationData.work_days = workDays;

        }

        try {
            const response = await fetch(REGISTRATION_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'aplication/json',
                },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage({
                    text: data.message || 'Viva la vida, te registraste',
                    type: success
                });

                //Considero mejor limpiar los campos si el registro fue exitoso, asi el usuario no tiene que volver a colocar todo
                setName('');
                setLastName('');
                setDob('');
                setEmail('');
                setPhoneNumber('');
                setRole('');
                setLicenseNumber('');
                setSpecialty('');
                setCenterId('');
                setWorkDays('');
                setPassword('');
                setConfirmPassword('');

            } else {
                //si ya esta registrado, error
                const errorText = data.msg || data.error || 'Error en el registro, ya esta dentro'
                setMessage({ text: errorText, type: 'error' });
            }
        } catch (error) {
            //error con la api
            console.error('error con la api', error);
            console.log(registrationData)
            setMessage({
                text: 'Error conexion a la Api al registrar',
                type: 'error'
            });
        }
    };


    return (
        <div className="register-container">
            <h2 className=''>Crear una Cuenta Nueva</h2>

            <form onSubmit={handleRegistration} className="register-form">


                <div className="form-group"><label htmlFor="name">Nombre:</label><input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required /></div>
                <div className="form-group"><label htmlFor="lastName">Apellidos:</label><input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tus apellidos" required /></div>
                <div className="form-group"><label htmlFor="dob">Fecha de Nacimiento:</label><input type="date" id="dob" value={dob} onChange={(e) => setDob(e.target.value)} required /></div>
                <div className="form-group"><label htmlFor="email">Correo Electrónico:</label><input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ejemplo@dominio.com" required /></div>
                <div className="form-group"><label htmlFor="phoneNumber">Número de Teléfono:</label><input type="tel" id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Ej. 600112233" required /></div>

                <hr className="divider" />


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


                {role === 'doctor' && (
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
                )}


                <hr className="divider" />


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