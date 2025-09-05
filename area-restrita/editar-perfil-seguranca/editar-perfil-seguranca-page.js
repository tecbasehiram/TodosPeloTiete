import { endpoint } from '../../modulos/variaveisGlobais.js';
import { customAlert, customConfirm } from '../../modulos/modals.js';
import { fetchComAutoRefresh } from '../../modulos/fetchComAutoRefresh.js';

const telaCarregamento = document.getElementById("div-carregando-fundo");

async function editarUsuarioPassword() {
    const isInvalidCurrentPassword = document.getElementById("currentPassword").classList.contains("is-invalid");
    const isInvalidNewPassword = document.getElementById("newPassword").classList.contains("is-invalid");
    const isInvalidConfirmPassword = document.getElementById("confirmPassword").classList.contains("is-invalid");

    const currentPassword = document.getElementById("currentPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if(isInvalidCurrentPassword || isInvalidNewPassword || isInvalidConfirmPassword) {
      customAlert("As senhas precisam ser validas");
      return;
    }
  
    const confirmacao = await customConfirm("Tem certeza que deseja atualizar a senha?");
    if(confirmacao) {
        document.getElementById("div-carregando-fundo").style.display = "flex";
        try {
            
          telaCarregamento.style.display = "flex";

          const response = await fetchComAutoRefresh(endpoint + '/api/auth/editarUsuarioPassword', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              CurrentPassword: currentPassword,
              NewPassword: confirmPassword
            })
          });
            
          const data = await response.json();

          telaCarregamento.style.display = "none";

          if (response.ok) {
              
            customAlert("Senha do usuário atualizado com sucesso!", () => {      
              window.location.href = "../../area-restrita/perfil/perfil-page.html";
            });
          } else {
            customAlert(`${data.message}`);
          }
      } catch (error) {
        telaCarregamento.style.display = "none";
        console.error("Erro ao atualizar a senha do usuário:", error);
        customAlert(`${data.message}`);
      }
    }
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("editar-btn").addEventListener("click", () => {
    editarUsuarioPassword();
  });
});