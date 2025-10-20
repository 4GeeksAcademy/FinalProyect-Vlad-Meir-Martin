import Login from "./Login.jsx";
import Register from "./Register.jsx";
import CitasForm from "../components/CitasForm.jsx";
import HeroSection from "../components/HeroSection.jsx";
import PatientDashboard from "./PatientDashboard.jsx"; 
import DoctorDashboard from "./DoctorDashboard.jsx";

import rigoImageUrl from "../assets/img/rigo-baby.jpg";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";


export const Home = () => {

  const {store, dispatch} =useGlobalReducer()

	return (
		<div className="text-center mt-5">

			<h1>Pagina de inicio de la aplicacion.</h1>
			<ul>
				<li>Bienvenida</li>
				<li>Informacion sobre aplicacion</li>
				<li>Boton para acceder a Login</li>
				<li>Zona de contactos</li>
			</ul>

		</div>
	);
}; 