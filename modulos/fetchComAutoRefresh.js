import { endpoint } from '../modulos/variaveisGlobais.js';
import { customAlert } from '../modulos/modals.js';

export async function fetchComAutoRefresh(url, options = {}, path="../..") {
  options.credentials = 'include';

  let response = await fetch(url, options);

  if (response.status === 401 || response.status === 403) {
    console.warn('AccessToken expirado, tentando renovar...');

    const refresh = await fetch(endpoint + '/api/auth/refresh', {
      method: 'GET',
      credentials: 'include',
    });

    if (refresh.ok) {
      console.log('Token renovado, tentando novamente:', url);
      response = await fetch(url, options);
    } else {
      console.error('Refresh falhou. Usuário deve fazer login novamente.');
      await customAlert("Sua sessão expirou. Você será redirecionado para a tela de login.", () => {
        window.location.href = `${path}/login/login-page.html`;
      });
      return;
    }
  }

  return response;
}