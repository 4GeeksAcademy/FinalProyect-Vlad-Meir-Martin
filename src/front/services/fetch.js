export const URL_BASE_API =
  "https://v1itkby3i6.ufs.sh/f/0Z3x5lFQsHoMA5dMpr0oIsXfxg9jVSmyL65q4rtKROwEDU3G";
export const OWN_API =
  "https://crispy-lamp-v6w4wxjg49jj3p9j6-3001.app.github.dev/";

async function register(userData) {
  //variable con el rol del usuario
  const role = userData.role;
  let endpointPath;

  //if si es doctor o paciente, cambia el endpoint
  if (role == "paciente") {
    return registerPatient(userData);
  } else if (role == "doctor") {
    return registerDoctor(userData);
  } else {
    return { success: false, message: "Rol no valido o no definido" };
  }
}

//aqui nos enfocamos unicamente a mandar la info a la API
async function registerPatient(userData) {
  try {
    const response = await fetch(`${OWN_API}api/register/patient`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      //devolver el error 400 o lo que sea
      const errorMessage = `Error: ${response.status} fallo al registrar`;
      console.error("error con el registro de paciente", errorMessage);
      return { success: false, message: errorMessage };
    }

    console.log("Registro de paciente exitoso", data);
    return { success: true, data: data, role: "paciente" };
  } catch (error) {
    //error de red
    console.error("error de red al registrar el paciente", error);
    return { success: false, message: "error de conexion" };
  }
}

async function registerDoctor(userData) {
  try {
    const response = await fetch(`${OWN_API}api/register/doctor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      //devolver el error 400 o lo que sea
      const errorMessage = `Error: ${response.status} fallo al registrar`;
      console.error("error con el registro de doctor", errorMessage);
      return { success: false, message: errorMessage };
    }

    console.log("Registro de doctor exitoso", data);
    return { success: true, data: data, role: "doctor" };
  } catch (error) {
    //error de red
    console.error("error de red al registrar el doctor", error);
    return { success: false, message: "error de conexion" };
  }
}

async function fetchAndRegisterNavarraCenters() {
  // Esta función ya NO llama a la API de Navarra.
  // Ahora, llama a NUESTRO PROPIO backend para que él haga el trabajo.
  try {
    // 1. Llamamos al nuevo endpoint que crearemos en routes.py
    const response = await fetch(`${OWN_API}api/centers/seed/navarra`, {
      method: "POST", // Usamos POST porque inicia una acción (escribir en la BBDD)
      headers: {
        "Content-Type": "application/json",
      },
      // No necesitamos body, solo estamos "despertando" el endpoint
    });

    // 2. Procesamos la respuesta de NUESTRO backend
    const data = await response.json();

    if (!response.ok) {
      // Si el backend falló (ej: no pudo conectar con Navarra, o no pudo guardar)
      throw new Error(data.message || "Error en el backend al cargar centros");
    }

    // Si el backend tuvo éxito (ya sea cargando o reportando que ya estaban cargados)
    console.log("Respuesta del backend (seed):", data.message);
    return { success: true, message: data.message };
  } catch (error) {
    // Error de red al intentar contactar NUESTRO backend
    console.error("Error al contactar el backend para cargar centros:", error);
    return {
      success: false,
      message: error.message || "Error de conexión al iniciar la carga",
    };
  }
}

async function registerBatch(centers) {
  try {
    const response = await fetch(`${OWN_API}/centers/batch`, {
      // Llama al nuevo endpoint
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(centers), // Envía el array completo
    });

    if (!response.ok) throw new Error("Error en el registro batch");

    const data = await response.json();
    console.log("Centros registrados exitosamente (batch):", data);
    return { success: true, data: data };
  } catch (error) {
    console.error("Error al registrar centros en tu API:", error);
    return {
      success: false,
      message: "Error al guardar centros en el backend",
    };
  }
}

//a partir de aqui no he tocado nada
//para login digo yo que podemos hacer lo mismo.
async function login(email, password, role) {
  // Aseguramos que el rol esté definido y en minúsculas
  //const normalizedRole = role ? role.toLowerCase() : undefined;
  const normalizedRole = `patient`;

  // Lógica de delegación (igual que en tu register)
  if (normalizedRole === "patient" || normalizedRole === "paciente") {
    // Usamos 'patient' para la ruta del backend
    return loginPatient(email, password, "patient");
  } else if (normalizedRole === "doctor") {
    return loginDoctor(email, password, "doctor");
  } else {
    // Si el rol es 'undefined' o no válido, fallamos aquí.
    // Esto previene el error "/login/undefined"
    console.error("Rol de login no válido o no definido:", role);
    alert("Error: El rol (paciente o doctor) no está definido.");
    return { success: false, message: "Rol de usuario no válido." };
  }
}

/**
 * Maneja el fetch de login para Pacientes
 * (Esta función es llamada por login() y no necesita ser exportada)
 */
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

/**
 * Maneja el fetch de login para Doctores
 * (Esta función es llamada por login() y no necesita ser exportada)
 */
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
    alert("Error de conexión. Inténtalo más tarde.");
    return { success: false, message: "Error de conexión." };
  }
}

// -------------------------------------------------------------------
// OBTENER PERFIL (Función proporcionada por el usuario, con corrección)
// -------------------------------------------------------------------

/**
 * Obtiene los datos del usuario logueado desde la ruta protegida.
 */
async function getProfile() {
  const token = localStorage.getItem("jwt_token");
  const role = localStorage.getItem("user_role");

  if (!token || !role) {
    console.log("No se encontró token o rol. Debes iniciar sesión.");
    return;
  }

  // 🔽 CORRECCIÓN: Tus rutas protegidas están en el blueprint 'api',
  // por lo que la URL debe incluir el prefijo /api
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
      console.error("Error al obtener datos protegidos:", userData.msg);
      alert("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("user_role");
      return;
    }

    localStorage.setItem("current_user", JSON.stringify(userData));
    console.log("Datos del usuario guardados:", userData);
  } catch (error) {
    console.error("Error de red al obtener datos protegidos:", error);
  }
}

export {
  register,
  registerPatient,
  registerDoctor,
  login,
  fetchAndRegisterNavarraCenters,
  registerBatch,
};
