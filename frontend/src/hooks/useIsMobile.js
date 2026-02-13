
import { useState, useEffect } from 'react';

/**
 * Hook para detectar si el dispositivo es móvil basado en el ancho de pantalla.
 * @param {number} breakpoint - Ancho máximo para considerar móvil (default 768px)
 * @returns {boolean} isMobile
 */
const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
};

export default useIsMobile;
