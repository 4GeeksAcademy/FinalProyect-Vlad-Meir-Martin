import React, { useState, useEffect, useRef } from 'react';

// Estilos (manteniendo los originales)
const styles = {
    header: {
        backgroundColor: '#20B2AA', 
        color: 'white',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative', 
        zIndex: 10,
    },
    logo: {
        margin: 0,
        fontSize: '1.8em',
    },
    // Contenedor del enlace de Contacto y el Dropdown
    contactContainer: {
        color: 'white',
        textDecoration: 'none',
        marginLeft: '25px',
        fontSize: '1.1em',
        cursor: 'pointer',
        position: 'relative', 
    },
    // Estilos para el menú desplegable
    dropdownMenu: (isOpen) => ({
        display: isOpen ? 'block' : 'none',
        position: 'absolute',
        top: '100%', 
        right: '0',
        backgroundColor: 'white',
        color: '#333',
        minWidth: '280px',
        padding: '15px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        borderRadius: '4px',
        zIndex: 5,
        textAlign: 'left',
    }),
    email: {
        fontWeight: 'bold',
        color: '#20B2AA',
        textDecoration: 'none',
    },
    message: {
        margin: '0 0 10px 0',
        lineHeight: '1.4',
    }
};

export const Navbar = () => {
    // 1. Estado para controlar la visibilidad
    const [isContactOpen, setIsContactOpen] = useState(false);
    
    // 2. Referencia para apuntar al elemento del Contacto (el contenedor)
    const contactRef = useRef(null); 

    const toggleContact = () => {
        setIsContactOpen(!isContactOpen);
    };

    // 3. Hook useEffect para gestionar el clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Si la ventana está abierta Y el clic NO ocurrió dentro del contenedor del contacto (contactRef)
            if (isContactOpen && contactRef.current && !contactRef.current.contains(event.target)) {
                setIsContactOpen(false); // Cierra el menú
            }
        };

        // Añadir el listener al documento cuando el componente se monta
        document.addEventListener("mousedown", handleClickOutside);

        // Limpieza: Remover el listener cuando el componente se desmonta o se re-ejecuta el efecto
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isContactOpen]); // Dependencia: re-ejecutar si cambia el estado del menú

    return (
        <header style={styles.header}>
            <h1 style={styles.logo}> <strong> GG Salud </strong> </h1>
            <nav>
                {/* 4. Asignar la referencia al contenedor principal de Contacto */}
                <div 
                    style={styles.contactContainer} 
                    onClick={toggleContact}
                    ref={contactRef} // <--- ¡Añadido!
                >
                    Contacto
                    
                    {/* El Menú Desplegable */}
                    <div style={styles.dropdownMenu(isContactOpen)}>
                        <p style={styles.message}>
                            Ponte en contacto con nosotros: 
                            <br />
                            <a href="mailto:info.ggsalud@gmail.com" style={styles.email}>
                                info.ggsalud@gmail.com
                            </a>
                        </p>
                        <p style={{ margin: 0, fontSize: '0.9em' }}>
                            Estaremos encantados de poder asesorarles.
                        </p>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Navbar;