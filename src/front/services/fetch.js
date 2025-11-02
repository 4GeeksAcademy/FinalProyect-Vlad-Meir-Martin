export const URL_BASE_API = "https://v1itkby3i6.ufs.sh/f/0Z3x5lFQsHoMA5dMpr0oIsXfxg9jVSmyL65q4rtKROwEDU3G";
export const OWN_API = "https://laughing-happiness-97w9vj9wv94w295w-3001.app.github.dev/";

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

export { register, registerPatient, registerDoctor, login, fetchAndRegisterNavarraCenters, logout }
