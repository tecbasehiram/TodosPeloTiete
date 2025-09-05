import { endpoint } from '../modulos/variaveisGlobais.js';
import { fetchComAutoRefresh } from '../modulos/fetchComAutoRefresh.js';
import { customAlert } from '../modulos/modals.js';

const CACHE_DURATION_MINUTES = 1440;

export async function protegerPagina(cargosPermitidos = [], path = "../..") {

    const authCache = sessionStorage.getItem('authStatus');
    const cacheTimestamp = sessionStorage.getItem('authTimestamp');
    const isCacheValid = authCache && cacheTimestamp && (new Date().getTime() - cacheTimestamp < CACHE_DURATION_MINUTES * 60 * 1000);
    const usuarioInfo = localStorage.getItem('usuarioInfo');

    if(!usuarioInfo) {
        customAlert("Você não tem permissão para acessar esta página.", () => { 
            window.location.href = `${path}/login/login-page.html`; 
        });
        return; 
    }

    const usuarioCargo = JSON.parse(usuarioInfo).Cargo;

    if (cargosPermitidos.length > 0 && !cargosPermitidos.includes(usuarioCargo)) {
        customAlert("Você não tem permissão para acessar esta página.", async () => { 
            window.location.href = `${path}/area-restrita/perfil/perfil-page.html`; 
            
        });
        return; 
    }

    if (isCacheValid) {
        document.querySelector('.conteudo-restrito').classList.remove("d-none");
        return; 
    }

    try {
        const response = await fetchComAutoRefresh(endpoint + '/api/auth/status', {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {

            sessionStorage.setItem('authStatus', 'authenticated');
            sessionStorage.setItem('authTimestamp', new Date().getTime());

            document.querySelector('.conteudo-restrito').classList.remove("d-none");

        } else {
            throw new Error("Sessão inválida ou expirada.");
        }

    } catch (error) {
        console.error("Falha na autenticação:", error.message);

        localStorage.removeItem('usuarioInfo');
        sessionStorage.removeItem('authStatus');
        sessionStorage.removeItem('authTimestamp');

        await customAlert("Sua sessão expirou. Você será redirecionado para a tela de login.", () => { 
            window.location.href  = `${path}/login/login-page.html`; 
        });
    } finally {
        document.querySelector('.conteudo-restrito').classList.remove("d-none");
    }
}