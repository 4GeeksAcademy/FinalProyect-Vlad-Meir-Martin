// Archivo de funciones para interactuar con la API del proyecto 4Geeks
// Incluye todas las funciones de login/registro y las de appointments movidas desde PatientDashboard.jsx

// =================================================================
// 🌐 CONFIGURACIÓN DE LA API
// =================================================================

// URL de la API externa para la carga inicial de centros (Seeding)
export const URL_BASE_API =
  "https://v1itkby3i6.ufs.sh/f/0Z3x5lFQsHoMA5dMpr0oIsXfxg9jVSmyL65q4rtKROwEDU3G";

// URL de tu propio backend (4Geeks/Flask)
export const OWN_API =
  "https://improved-space-invention-r4w9wj5r9q5pfxwqv-3001.app.github.dev/";

// =================================================================
// 🔐 HELPER PARA AUTENTICACIÓN
// =================================================================

/**
 * Obtiene el token JWT del localStorage
 * @throws {Error} Si no hay token disponible
 * @returns {string} Token JWT
 */
const getAuthToken = () => {
  const token = localStorage.getItem("jwt_token");
  if (!token) {
    throw new Error("No estás autenticado. Falta token.");
  }
  return token;
};

// =================================================================
// 👤 REGISTRO Y LOGIN
// =================================================================

// --- Registro ---

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
      const errorMessage = `Error: ${response.status} fallo al registrar: ${
        data.msg || "Error desconocido"
      }`;
      console.error("error con el registro de paciente", errorMessage);
      return { success: false, message: errorMessage };
    }

    console.log("Registro de paciente exitoso", data);
    return { success: true, data: data, role: "paciente" };
  } catch (error) {
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
      const errorMessage = `Error: ${response.status} fallo al registrar: ${
        data.msg || "Error desconocido"
      }`;
      console.error("error con el registro de doctor", errorMessage);
      return { success: false, message: errorMessage };
    }

    console.log("Registro de doctor exitoso", data);
    return { success: true, data: data, role: "doctor" };
  } catch (error) {
    console.error("error de red al registrar el doctor", error);
    return { success: false, message: "error de conexion" };
  }
}

/**
 * Función principal de registro que delega según el rol.
 */
export async function register(userData) {
  const role = userData.role;

  if (role === "paciente") {
    return registerPatient(userData);
  } else if (role === "doctor") {
    return registerDoctor(userData);
  } else {
    return { success: false, message: "Rol no valido o no definido" };
  }
}

// --- Login ---

async function loginUser(email, password, role) {
  const loginUrl = `${OWN_API}api/login/${role}`;

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
      console.error(`Error de login (${role}):`, data.msg);
      alert(`Error (${role}): ${data.msg || "Credenciales incorrectas"}`);
      return { success: false, message: data.msg };
    }

    localStorage.setItem("jwt_token", data.token);
    localStorage.setItem("user_role", role);

    console.log(`Login de ${role} exitoso.`);

    await getProfile(); // Llamamos a getProfile después del login
    return { success: true, message: "Login exitoso" };
  } catch (error) {
    console.error(`Error de red al iniciar sesión (${role}):`, error);
    alert("Error de conexión. Inténtalo más tarde.");
    return { success: false, message: "Error de conexión." };
  }
}

/**
 * Función principal de login que delega según el rol.
 */
export async function login(email, password, role) {
  const normalizedRole = role ? role.toLowerCase() : undefined;

  if (normalizedRole === "patient" || normalizedRole === "paciente") {
    return loginUser(email, password, "patient");
  } else if (normalizedRole === "doctor") {
    return loginUser(email, password, "doctor");
  } else {
    console.error("Rol de login no válido o no definido:", role);
    alert("Error: El rol (paciente o doctor) no está definido.");
    return { success: false, message: "Rol de usuario no válido." };
  }
}

/**
 * Obtener perfil (ruta protegida)
 */
export async function getProfile() {
  const token = localStorage.getItem("jwt_token");
  const role = localStorage.getItem("user_role");

  if (!token || !role) {
    console.log("No se encontró token o rol. Debes iniciar sesión.");
    return;
  }

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
      // navigate('/login'); // Esto debe manejarse en el componente
      return;
    }

    localStorage.setItem("current_user", JSON.stringify(userData));
    console.log("Datos del usuario guardados:", userData);
  } catch (error) {
    console.error("Error de red al obtener datos protegidos:", error);
  }
}

/**
 * Función de logout
 */
export const logout = () => {
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("current_user");
  console.log(
    "Sesión cerrada. Token, rol y datos de perfil eliminados de localStorage."
  );
};

// =================================================================
// 🏥 CENTROS DE SALUD Y DOCTORES (Movidas desde PatientDashboard.jsx)
// =================================================================

/**
 * Obtiene la lista de centros de salud desde la API
 * @returns {Promise<Array>} Array de objetos con información de centros
 * @throws {Error} Si hay error de conexión o respuesta
 */
export const fetchHealthCenters = async () => {
  try {
    const response = await fetch(`${OWN_API}api/centers`);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.map((center) => ({
      id: center.id,
      name: center.name,
      address: center.address || "Dirección no disponible",
    }));
  } catch (error) {
    console.error("Error al obtener centros de la API:", error);
    throw new Error(
      "No se pudo conectar con la API para cargar los centros. (Verifica tu configuración CORS en Flask)"
    );
  }
};

/**
 * Obtiene la lista de doctores desde la API
 * @returns {Promise<Array>} Array de objetos con información de doctores
 * @throws {Error} Si hay error de conexión o respuesta
 */
export const fetchDoctors = async () => {
  try {
    const response = await fetch(`${OWN_API}api/doctors`);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.map((doctor) => ({
      id: doctor.id,
      name: doctor.last_name,
      specialty: doctor.specialty || "Especialidad no definida",
      center_id: doctor.center_id || doctor.centerId,
    }));
  } catch (error) {
    console.error("Error al obtener doctores de la API:", error);
    throw new Error("No se pudo conectar con la API para cargar los doctores.");
  }
};

/**
 * Carga inicial de centros de Navarra (Seeding)
 * NOTA: Esta función llama a tu backend, el cual se encarga de usar URL_BASE_API internamente.
 */
export async function fetchAndRegisterNavarraCenters() {
  try {
    // Tu backend (OWN_API) es el que se encarga de usar URL_BASE_API para obtener los datos.
    const response = await fetch(`${OWN_API}api/centers/seed/navarra`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ external_api_url: URL_BASE_API }), // Enviamos la URL externa si el backend la necesita
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error en el backend al cargar centros");
    }

    console.log("Respuesta del backend (seed):", data.message);
    return { success: true, message: data.message };
  } catch (error) {
    console.error("Error al contactar el backend para cargar centros:", error);
    return {
      success: false,
      message: error.message || "Error de conexión al iniciar la carga",
    };
  }
}

// =================================================================
// 📅 APPOINTMENTS (Movidas desde PatientDashboard.jsx)
// =================================================================

/**
 * Crea una nueva cita en la API (POST)
 * @param {Object} appointmentData - Datos de la cita
 * @param {number} appointmentData.doctor_id - ID del doctor
 * @param {number} appointmentData.patient_id - ID del paciente
 * @param {number} appointmentData.center_id - ID del centro
 * @param {string} appointmentData.appointment_date - Fecha en formato "DD-M-YYYY H:M"
 * @returns {Promise<Object>} Objeto con success (boolean) y data o message
 */
export const createAppointment = async (appointmentData) => {
  try {
    const token = getAuthToken();

    const response = await fetch(`${OWN_API}api/appointment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(appointmentData),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = `Error: ${response.status} Fallo al crear cita. ${
        data.msg || data.message || "Error desconocido"
      }`;
      console.error("Error al crear cita en la API", errorMessage, data);
      return { success: false, message: errorMessage };
    }

    console.log("Cita creada con éxito en la API", data);
    return { success: true, data: data };
  } catch (error) {
    console.error("Error de red al registrar la cita", error);
    return {
      success: false,
      message: error.message || "Error de conexión con el servidor.",
    };
  }
};

/**
 * Actualiza/Reagenda una cita existente (PUT)
 * @param {number} appointmentId - ID de la cita a modificar
 * @param {Object} updateData - Datos a actualizar
 * @param {string} updateData.appointment_date - Nueva fecha en formato "DD-M-YYYY H:M"
 * @param {number} updateData.doctor_id - ID del doctor
 * @returns {Promise<Object>} Objeto con success (boolean) y data o message
 */
export const updateAppointment = async (appointmentId, updateData) => {
  try {
    const token = getAuthToken();

    const response = await fetch(`${OWN_API}api/appointment/${appointmentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = `Error: ${
        response.status
      } fallo al modificar cita: ${data.msg || "Error desconocido"}`;
      console.error("error al modificar cita", errorMessage);
      return { success: false, message: errorMessage };
    }

    console.log("Modificación exitosa", data);
    return { success: true, data: data };
  } catch (error) {
    console.error("error de red al modificar la cita", error);
    return { success: false, message: error.message || "error de conexion" };
  }
};

/**
 * Cancela una cita existente (PUT)
 * @param {number} appointmentId - ID de la cita a cancelar
 * @returns {Promise<Object>} Objeto con success (boolean) y data o message
 */
export const cancelAppointment = async (appointmentId) => {
  try {
    const token = getAuthToken();

    const response = await fetch(
      `${OWN_API}api/appointment/${appointmentId}/cancel`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = `Error: ${response.status} fallo al cancelar cita: ${
        data.msg || "Error desconocido"
      }`;
      console.error("error al cancelar cita", errorMessage);
      return { success: false, message: errorMessage };
    }

    console.log("Cita cancelada", data);
    return { success: true, data: data };
  } catch (error) {
    console.error("error de red al cancelar cita", error);
    return { success: false, message: error.message || "error de conexion" };
  }
};

// =================================================================
// 👨‍⚕️ FUNCIONES ESPECÍFICAS DEL DOCTOR
// =================================================================

/**
 * Actualiza el centro de trabajo del doctor en la API (PUT)
 * Endpoint asumido: /api/doctor/center
 * @param {number} centerId - ID del centro seleccionado
 * @returns {Promise<Object>} Objeto con success (boolean) y data o message
 */

// fetch.js (Añadir este código)

export const getDoctorAppointments = async () => {
    const token = getAuthToken();
    if (!token) return [];

    try {
        const response = await fetch(`${OWN_API}api/doctor/appointments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error al cargar citas: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error en getDoctorAppointments:", error);
        return [];
    }
};

export const updateDoctorCenter = async (centerId) => {
  try {
    const token = getAuthToken(); // Asume que getAuthToken está definido

    const response = await fetch(`${OWN_API}api/doctor/center`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ center_id: centerId }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = `Error: ${
        response.status
      } Fallo al actualizar centro: ${
        data.msg || data.message || "Error desconocido"
      }`;
      console.error("Error al actualizar centro en la API", errorMessage, data);
      return { success: false, message: errorMessage };
    }

    console.log("Centro de trabajo actualizado con éxito en la API", data);
    return { success: true, data: data };
  } catch (error) {
    console.error("Error de red al actualizar el centro", error);
    return {
      success: false,
      message: error.message || "Error de conexión con el servidor.",
    };
  }
};
