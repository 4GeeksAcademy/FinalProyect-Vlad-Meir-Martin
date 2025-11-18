import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OWN_API, login, logout } from '../services/fetch';
import '../css/Login.css'; 


function Login() {
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({});
    const [loginRole, setLoginRole] = useState(null); // 💡 Estado para guardar el rol ('doctor' o 'patient')
    const navigate = useNavigate();

    // Función principal de Login
    const handleLogin = async (event) => {
        event.preventDefault(); 
        setMessage({});
        
        // 1. Validar el rol seleccionado
        if (!loginRole) {
            setMessage({ text: 'Por favor, selecciona si eres Doctor o Paciente antes de Acceder.', type: 'error' });
            return;
        }

        if (email.length < 3 || password.length < 6) {
            setMessage({ text: 'Por favor, introduce credenciales válidas.', type: 'error' });
            return;
        }

        setMessage({ text: `Intentando acceder como ${loginRole}...`, type: 'info' });

        try {
            // 2. Llamar a la función 'login' de fetch.js, pasándole el rol
            // ¡ATENCIÓN! Asegúrate de que tu función 'login' en fetch.js acepte el tercer argumento: login(email, password, role)
            const res = await login(email, password, loginRole); 

            if (!res?.success) {
                // Si la respuesta es error, lanza un error para que caiga en el catch
                throw new Error(res?.message || 'Credenciales inválidas');
            }
            
            // 3. Autenticación Exitosa
            // La función login() ya ha guardado el token y el usuario en localStorage, según tu fetch.js.
            
            // 4. Redirección Condicional
            const userId = res.user?.id; // Asumimos que res.user existe y tiene el ID
            
            if (loginRole === 'doctor') {
                setMessage({ text: `Inicio de sesión exitoso. ¡Bienvenido Doctor! 🧑‍⚕️`, type: 'success' });
                // Redirección a la ruta dinámica: /DoctorDashboard/:id
                navigate(`/DoctorDashboard/${userId}`, { replace: true });
            } else if (loginRole === 'patient') {
                setMessage({ text: `Inicio de sesión exitoso. ¡Bienvenido Paciente! 🧍`, type: 'success' });
                 // Redirección a la ruta dinámica: /PatientDashboard/:id
                navigate(`/PatientDashboard/${userId}`, { replace: true });
            }

            // Limpiar campos y rol
            setEmail('');
            setPassword('');
            setLoginRole(null); 

        } catch (err) {
            // Manejo de errores de conexión o credenciales inválidas
            console.error('Login error:', err);
            setMessage({ text: err.message || 'Error de conexión. Inténtalo más tarde.', type: 'error' });
        }
    };
    
    // Función para manejar la selección de rol
    const handleRoleSelection = (role) => {
        setLoginRole(role);
        setMessage({}); // Limpia mensajes al seleccionar rol
    };
    
    // Función de Registro (solo cambia el log)
    const handleRedirectToRegister = () => {
        console.log('--- Redirigiendo a la página de Registro ---');
        navigate('/Register'); // Redirección real a la página de Registro
    };
    
    // --- ESTILOS VISUALES PARA LOS BOTONES DE ROL 
    
    const getRoleButtonStyle = (role) => ({
        padding: '10px 20px',
        margin: '5px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
        backgroundColor: loginRole === role ? '#5c67f2' : '#cccccc', // Color si está seleccionado
        color: loginRole === role ? 'white' : '#333333',
        border: loginRole === role ? '2px solid #3d46a6' : '1px solid #999999',
    });
    // ---------------------------------------------------
    
    return (
        <div className="login-container">
            <h2>Iniciar Sesión</h2>
            
            <form onSubmit={handleLogin}>
                <table className="login-table">
                    <thead>
                        <tr>
                            <th colSpan="2" style={{ textAlign: 'center', color: '#5c67f2' }}>
                                Accede a tu cuenta
                            </th>
                        </tr>
                        <tr>
                            <td colSpan="2" style={{ textAlign: 'center', padding: '10px 0' }}>
                                <button 
                                    type="button"
                                    onClick={() => handleRoleSelection('doctor')}
                                    style={getRoleButtonStyle('doctor')}
                                >
                                    Doctor 🧑‍⚕️
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleRoleSelection('patient')}
                                    style={getRoleButtonStyle('patient')}
                                >
                                    Paciente 🧍
                                </button>
                            </td>
                        </tr>
                        {/* --------------------------- */}
                    </thead>
                    <tbody>
                        
                        <tr>
                            <th><label htmlFor="email">Usuario:</label></th>
                            <td>
                                <input
                                    type="text"
                                    id="email"
                                    name="email"
                                    placeholder="Correo electrónico"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </td>
                        </tr>
                    
                        <tr>
                            <th><label htmlFor="password">Contraseña:</label></th>
                            <td>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    placeholder="Tu contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </td>
                        </tr>
                    
                        <tr>
                            <td colSpan="2" className="register-link-cell" style={{ textAlign: 'center', paddingTop: '10px', paddingBottom: '10px' }}>
                                ¿Todavía no estás Registrado?
                                <button 
                                    type="button" 
                                    className="register-link-button" 
                                    onClick={handleRedirectToRegister}
                                >
                                    Pulsa aquí
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="submit-cell">
                                <button type="submit" className="login-button" disabled={!loginRole}>
                                    ACCEDER
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </form>
            
            
            {message.text && (
                <div 
                    className="message" 
                    style={{ color: message.type === 'error' ? 'red' : (message.type === 'info' ? 'blue' : 'green') }}
                >
                    {message.text}
                </div>
            )}
        </div>
    );
}


export default Login;