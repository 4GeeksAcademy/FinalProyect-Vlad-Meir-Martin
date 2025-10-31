import Login from "./Login.jsx";
import Register from "./Register.jsx";
import CitasForm from "../components/CitasForm.jsx";
import HeroSection from "../components/HeroSection.jsx";
import PatientDashboard from "./PatientDashboard.jsx";
import DoctorDashboard from "./DoctorDashboard.jsx";
import { fetchAndRegisterNavarraCenters } from "../services/fetch.js";
import rigoImageUrl from "../assets/img/rigo-baby.jpg";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import React, { useEffect } from 'react';

export const Home = () => {

	const { store, dispatch } = useGlobalReducer()

	useEffect(() => {
        
        // Comprobamos si ya hemos cargado los centros antes
        const hasLoadedCenters = localStorage.getItem('centersLoaded');
        // Si NO los hemos cargado, ejecutamos la función
        if (!hasLoadedCenters) {
            // Definimos una función async interna para poder usar 'await'
            const loadInitialData = async () => {
                console.log("Cargando y registrando centros por primera vez...");
                try {
                    const result = await fetchAndRegisterNavarraCenters();
                    
                    if (result.success) {
                        console.log("Centros registrados:", result.message || result.data);
                        // Ponemos la "bandera" en localStorage para no volver a hacerlo
                        localStorage.setItem('centersLoaded', 'true');
                    } else {
                        console.error("Error al registrar centros:", result.message);
                    }
                } catch (error) {
                    console.error("Error fatal al cargar datos:", error.message);
                }
            };

            loadInitialData();
        } else {
            console.log("Los centros ya estaban cargados. No se hace nada.");
        }

    }, []);
	return (
		<div className="text-center mt-5">

			<Register />
			<HeroSection />

		</div>
	);
}; 