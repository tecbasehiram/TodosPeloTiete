import { endpoint } from '../modulos/variaveisGlobais.js';
import { customAlert } from '../modulos/modals.js';

localStorage.removeItem("usuarioInfo");
sessionStorage.removeItem('authStatus');
sessionStorage.removeItem('authTimestamp');

async function realizarLogin(){
    const usuario = document.getElementById("usuario").value;
    const senha = document.getElementById("password").value;

    if(!usuario || !senha) {
        customAlert("Preencha o usuario e a senha!");
        return;
    }

    try {
        document.getElementById("div-carregando-fundo").style.display = "flex";

        const response = await fetch(endpoint + '/api/auth/login', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
                username: usuario,
                password: senha
             })
        });

        document.getElementById("div-carregando-fundo").style.display = "none";
    
        const data = await response.json();

        if (!response.ok || data.status !== "SUCCESS") {
          customAlert(data.message || "Erro ao realizar login.");
          return;
        }

        localStorage.setItem("usuarioInfo", JSON.stringify(data.payload));
        
        sessionStorage.setItem('authStatus', 'authenticated');
        sessionStorage.setItem('authTimestamp', new Date().getTime());
        
        window.location.href = "../area-restrita/bem-vindo/bem-vindo-page.html"; 
    } catch (err) {
        console.log('Erro ao verificar usuario: ', err);
    }
}

document.getElementById('entrar-btn').addEventListener('click', (event) => {
    event.preventDefault();
    realizarLogin();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        realizarLogin();
    }
});