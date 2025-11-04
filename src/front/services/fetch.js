export const URL_BASE_API = "https://v1itkby3i6.ufs.sh/f/0Z3x5lFQsHoMA5dMpr0oIsXfxg9jVSmyL65q4rtKROwEDU3G";
export const OWN_API = "https://upgraded-fishstick-v6w4wxjg44j7fpxv7-3001.app.github.dev/";

async function register(userData) {
  //variable con el rol del usuario
  const role = userData.role;
  let endpointPath;

  //if si es doctor o paciente, cambia el endpoint
  if (role == 'paciente') {
    return registerPatient(userData)
  } else if (role == 'doctor') {
      return registerDoctor(userData)
  } else {
      return { success: false, message:"Rol no valido o no definido"}
  }
}

async function registerPatient(userData) {
  try {
    const response = await fetch (`${OWN_API}api/register/patient`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
      //devolver el error 400 o lo que sea
      const errorMessage = `Error: ${response.status} fallo al registrar`;
      console.error('error con el registro de paciente', errorMessage);
      return {success: false, message: errorMessage};
    }

    console.log('Registro de paciente exitoso', data);
    return {success: true, data: data, role: 'paciente'}

  } catch (error) {
    //error de red
    console.error('error de red al registrar el paciente', error);
    return{success: false, message: 'error de conexion'}
  }
}

async function registerDoctor(userData) {
  try {
    const response = await fetch (`${OWN_API}api/register/doctor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    

    const data = await response.json();

    if (!response.ok) {
      //devolver el error 400 o lo que sea
      const errorMessage = `Error: ${response.status} fallo al registrar`;
      console.error('error con el registro de doctor', errorMessage);
      return {success: false, message: errorMessage};
    }

    console.log('Registro de doctor exitoso', data);
    return {success: true, data: data, role: 'doctor'};

  }catch (error) {
    //error de red
    console.error('error de red al registrar el doctor', error);
    return{success: false, message: 'error de conexion'}
  }
}

async function fetchAndRegisterNavarraCenters() {
      try {
        // 1. Llamamos al endpoint que crearemos en routes.py
        const response = await fetch(`${OWN_API}api/centers/seed/navarra`, { 
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: '{}'
        });

        // 2. Procesamos la respuesta de NUESTRO backend
        const data = await response.json();
        
        if (!response.ok) {
            // Si el backend falló
            throw new Error(data.message || "Error en el backend al cargar centros");
        }

        // Si el backend tuvo éxito
        console.log("Respuesta del backend (seed):", data.message);
        return { success: true, message: data.message };

    } catch (error) {
        // Error de red al intentar contactar NUESTRO backend
        console.error('Error al contactar el backend para cargar centros:', error);
        return { success: false, message: error.message || 'Error de conexión al iniciar la carga' };
    }
}

async function login(email, password, role) {

  // Aseguramos que el rol esté definido y en minúsculas
  const normalizedRole = role ? role.toLowerCase() : undefined;

  // Lógica de delegación
  if (normalizedRole === "patient" || normalizedRole === "paciente") {
    // Usamos 'patient' para la ruta del backend
    return loginPatient(email, password, "patient");
  } else if (normalizedRole === "doctor") {
    return loginDoctor(email, password, "doctor");
  } else {
    // Si el rol es 'undefined' o no válido
    console.error("Rol de login no válido o no definido:", role);
    alert("Error: El rol (paciente o doctor) no está definido.");
    return { success: false, message: "Rol de usuario no válido." };
  }
}


//Maneja el fetch de login para Pacientes

async function loginPatient(email, password, role) {
  const loginUrl = `${OWN_API}api/login/patient`;

  try {
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de login (Paciente):", data.msg);
      alert(`Error (Paciente): ${data.msg || "Credenciales incorrectas"}`);
      return { success: false, message: data.msg };
    }

    localStorage.setItem("jwt_token", data.token);
    localStorage.setItem("user_role", role);

    console.log("Login de paciente exitoso.");

    await getProfile(); // Llamamos a getProfile después del login
    return { success: true, message: "Login exitoso" };
  } catch (error) {
    console.error("Error de red al iniciar sesión (Paciente):", error);
    alert("Error de conexión. Inténtalo más tarde.");
    return { success: false, message: "Error de conexión." };
  }
}
// Maneja el fetch de login para Doctores

async function loginDoctor(email, password, role) {
  const loginUrl = `${OWN_API}api/login/doctor`;

  try {
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      console.error("Error de login (Doctor):", data.msg);
      alert(`Error (Doctor): ${data.msg || "Credenciales incorrectas"}`);
      return { success: false, message: data.msg };
    }

    localStorage.setItem("jwt_token", data.token);
    localStorage.setItem("user_role", role);
    console.log("Login de doctor exitoso.");

    await getProfile(); // Llamamos a getProfile después del login
    return { success: true, message: "Login exitoso" };
    
    } catch (error) {
    console.error("Error de red al iniciar sesión (Doctor):", error);
    return { success: false, message: "Error de conexión." };
      }
  }
// Obtener perfil (ruta protegida)

async function getProfile() {
  // 1. Recuperamos el token y el rol de localStorage
  const token = localStorage.getItem("jwt_token");
  const role = localStorage.getItem("user_role");

  if (!token || !role) {
    console.log("No se encontró token o rol. Debes iniciar sesión.");
    return;
  }
  // 2. Determinamos la URL protegida correcta
  const protectedUrl = `${OWN_API}api/protected/${role}`;

  try {
    const response = await fetch(protectedUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const userData = await response.json();

    if (!response.ok) {
      // Manejo de errores
      console.error("Error al obtener datos protegidos:", userData.msg);
      alert("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");

      localStorage.removeItem("jwt_token");
      localStorage.removeItem("user_role");
      // window.location.href = '/login';
      return;
    }

    // Guardamos los datos completos del usuario en localStorage
    localStorage.setItem("current_user", JSON.stringify(userData));

    console.log("Datos del usuario guardados:", userData);
  } catch (error) {
    console.error("Error de red al obtener datos protegidos:", error);
  }
}

// FUNCIÓN DE LOGOUT 

 const logout = () => {
 
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("current_user"); 
    console.log('Sesión cerrada. Token, rol y datos de perfil eliminados de localStorage.');
};

//APPOINMENTS
async function getPatientAppointments() {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            return { success: false, message: 'oye, que no estás logueado...' };
        }
        
        // sacamos el id de la sesión. ¡siempre hay que mirar el id!
        const userDataString = localStorage.getItem('current_user');
        if (!userDataString) {
            console.error('error: no hay datos del usuario, ¿qué haces?');
            return { success: false, message: 'datos de usuario desaparecidos.' };
        }
        const userData = JSON.parse(userDataString);
        const user_id = userData.id;

        if (!user_id) {
            console.error('error: ¡el id no está disponible!');
            return { success: false, message: 'id de paciente perdido.' };
        }

        // vamos a por esas citas, a ver qué dice el servidor...
        const response = await fetch(`${OWN_API}api/patient/${user_id}/appointments`, {
            headers: {
                Authorization: `Bearer ${token.trim()}`
            }
        });

        if (response.ok) {
            // vamos a intentar leer el cuerpo como json, cueste lo que cueste, 
            // siempre que la respuesta no esté vacía.
            
            // primero, clonamos la respuesta para poder leerla dos veces (una como JSON, otra como texto)
            const clonedResponse = response.clone();
            
            try {
                // intentamos leerlo como json (esto es lo que quieres ver)
                const data = await response.json(); 
                
                console.log('¡json detectado y recibido! esto es lo que vino:', data);
                return { success: true, data: data };
                
            } catch (e) {
                // si falla el parseo json, es que el servidor nos mandó algo que no es json.
                // leemos el texto para debug.
                const responseText = await clonedResponse.text();
                
                console.log('respuesta 200 ok, pero falló el parseo json.');
                console.log('contenido del servidor (texto):', responseText.substring(0, 150) + (responseText.length > 150 ? '...' : ''));

                // devolvemos lista vacía por seguridad en el frontend.
                return { success: true, data: [] }; 
            }
        } else {
            // ¡ups, código de error (401, 404, 500...)! toca investigar qué ha pasado.
            let errorData = {};

            // intentamos leer el error como si fuera json, por si acaso es un error bien formateado.
            try {
                errorData = await response.json();
            } catch (e) {
                // si falla, es que nos ha mandado un html cutre o un texto plano, lo leemos así.
                errorData.msg = await response.text();
            }

            const errorMessage = `error ${response.status}: ${errorData.msg || 'fallo desconocido del servidor.'}`;
            console.error('error traer appointments', errorMessage);
            return { success: false, message: errorMessage };
        }

    } catch (error) {
        // esto es un fallo de red, el servidor está dormido o la conexión va mal.
        console.error('error de red al obtener citas', error);
        return { success: false, message: 'error de conexión (servidor de vacaciones)' }
    }
}

async function createAppointment(appointmentData) {
  try {
    const token = localStorage.getItem('jwt_token');
      if (!token) {
        return {success: false, message: 'No estás autenticado.'};
        }

    const response = await fetch (`${OWN_API}api/appointment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(appointmentData)
    });

    const data = await response.json();

    if (!response.ok) {
      //devolver el error 400 o lo que sea
      const errorMessage = `Error: ${response.status} fallo al crear cita`;
      console.error('error al crear cita', errorMessage);
      return {success: false, message: errorMessage};
    }

    console.log('Cita creada con éxito', data);
    return {success: true, data: data};

  }catch (error) {
    //error de red
    console.error('error de red al registrar la cita', error);
    return{success: false, message: 'error de conexion'}
  }
}

async function updateAppointment(appointmentId, updateData) {
  try {
    const token = localStorage.getItem('jwt_token');
      if (!token) {
        return {success: false, message: 'No estás autenticado.'};
        }


    const response = await fetch (`${OWN_API}api/appointment/${appointmentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    if (!response.ok) {
      //devolver el error 400 o lo que sea
      const errorMessage = `Error: ${response.status} fallo al modificar cita`;
      console.error('error al modificar cita', errorMessage);
      return {success: false, message: errorMessage};
    }

    console.log('Modificación exitosa', data);
    return {success: true, data: data};

  }catch (error) {
    //error de red
    console.error('error de red al modificar la cita', error);
    return{success: false, message: 'error de conexion'}
  }
}

async function cancelAppointment(appointmentId) {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        return {success: false, message: 'No estás autenticado.'};
        }

      const response = await fetch (`${OWN_API}api/appointment/${appointmentId}/cancel`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      //devolver el error 400 o lo que sea
      const errorMessage = `Error: ${response.status} fallo al cancelar cita`;
      console.error('error al cancelar cita', errorMessage);
      return {success: false, message: errorMessage};
    }

    console.log('Cita cancelada', data);
    return {success: true, data: data};

  }catch (error) {
    //error de red
    console.error('error de red al cancelar cita', error);
    return{success: false, message: 'error de conexion'}
  }
}

const getDoctorAppointments = async () => {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
        return { success: false, message: "No autenticado. Por favor, inicie sesión." };
    }

    try {
        // La URL no necesita el ID del doctor, ya que el backend lo obtiene del token.
        const response = await fetch(`${OWN_API}api/doctor/appointments`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.trim()}`, // Usando el .trim() corregido
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data: data };
        } else {
            const errorData = await response.json();
            return { success: false, message: errorData.msg || `Error ${response.status}: Fallo al cargar las citas del doctor.` };
        }

    } catch (error) {
        console.error("Error de red al obtener las citas del doctor:", error);
        return { success: false, message: "Error de conexión al servidor." };
    }
};

export { 
  register, 
  registerPatient, 
  registerDoctor, 
  login,
  logout,
  fetchAndRegisterNavarraCenters,
  getPatientAppointments,
  getDoctorAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment
}