import { endpoint } from '../modulos/variaveisGlobais.js';
import { customAlert } from '../modulos/modals.js';

localStorage.removeItem("usuarioInfo");
sessionStorage.removeItem('authStatus');
sessionStorage.removeItem('authTimestamp');

async function redefinirSenha(token){
    const senha = document.getElementById("password").value;
    const confirmarSenha = document.getElementById("confirm-password").value;

    if(!confirmarSenha || !senha) {
        await customAlert("Preencha os campos de senha!");
        return;
    }

    if (senha !== confirmarSenha) {
      await customAlert("As senhas não coincidem.");
      return;
    }   

    try {
        document.getElementById("div-carregando-fundo").style.display = "flex";

        const response = await fetch(endpoint + '/api/auth/resetPassword', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                token: token,
                newPassword: confirmarSenha
             })
        });

        document.getElementById("div-carregando-fundo").style.display = "none";
    
        const data = await response.json();

        if (!response.ok || data.status !== "SUCCESS") {
          await customAlert(data.message || "Erro ao redefinir a senha.");
          return;
        } else {
            await customAlert(data.message || "Sucesso ao redefinir a senha.");
            window.location.href = "../login/login-page.html";
        }
        
    } catch (err) {
        console.log('Erro ao verificar usuario: ', err);
    }
}

document.addEventListener("DOMContentLoaded", async function () {
  const urlParams = new URLSearchParams(window.location.search);

  const token = urlParams.get('token');

  if(!token) {
    await customAlert("Token inválido!");
    window.location.href = "../login/login-page.html"
  }

  document.getElementById('redefinir-btn').addEventListener('click', (event) => {
    event.preventDefault();
    redefinirSenha(token);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      redefinirSenha(token);
    }
  });
});