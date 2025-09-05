import { endpoint } from '../../modulos/variaveisGlobais.js';
import { customAlert, customConfirm } from '../../modulos/modals.js';
import { fetchComAutoRefresh } from '../../modulos/fetchComAutoRefresh.js';

const telaCarregamento = document.getElementById("div-carregando-fundo");

const usuarioInfo = JSON.parse(localStorage.getItem("usuarioInfo"));

async function converterArquivoParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(arquivo);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}

async function comprimirImagemParaBase64(arquivo, maxLargura = 400, qualidade = 0.7) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = (evento) => {
      const img = new Image();
      img.onload = () => {
        let largura = img.width;
        let altura = img.height;

        if (largura > maxLargura) {
          altura *= maxLargura / largura;
          largura = maxLargura;
        }

        const canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, largura, altura);

        const base64 = canvas.toDataURL('image/jpeg', qualidade);
        resolve(base64);
      };

      img.onerror = (err) => reject(err);
      img.src = evento.target.result;
    };

    leitor.onerror = (err) => reject(err);
    leitor.readAsDataURL(arquivo);
  });
}

function tamanhoBase64EmMB(base64String) {
  const stringSemPrefixo = base64String.split(',')[1]; // remove "data:image/jpeg;base64,"
  const tamanhoEmBytes = Math.ceil((stringSemPrefixo.length * 3) / 4);
  return tamanhoEmBytes / (1024 * 1024);
}

async function editarUsuario() {
    const Username = document.getElementById("usuario").value.trim();
    const Nome = document.getElementById("nomeCompleto").value.trim();
    const Email = document.getElementById("email").value.trim();
    const FotoNova = document.getElementById("foto");
    const FotoArquivo = FotoNova.files[0];
    let fotoComprimida;

    if(FotoArquivo && FotoArquivo.size > 3 * 1024 * 1024) {

        telaCarregamento.style.display = "flex";
        fotoComprimida = await comprimirImagemParaBase64(FotoArquivo, 800, 0.7);
        telaCarregamento.style.display = "none";

        if(tamanhoBase64EmMB(fotoComprimida) > 3 * 1024 * 1024) {
            customAlert("A foto do perfil precisa ter no máximo 3MB!");
            return;
        }
    }

    if(!FotoArquivo) {
        if((Nome === usuarioInfo.Nome && 
            Email === usuarioInfo.Email && 
            Username === usuarioInfo.Username
        )) {
            customAlert("Altere pelo menos um dado!");
            return;
        }
    }

    if(!Email.includes("@")) {
        customAlert("O email informado não valido!");
        return;
    }

    const confirmacao = await customConfirm("Tem certeza que deseja atualizar os dados?");
    if(confirmacao) {
        document.getElementById("div-carregando-fundo").style.display = "flex";
        try {
            
            let FotoBase64 = null;

            if(!fotoComprimida) {
                if (FotoArquivo) {
                    FotoBase64 = await converterArquivoParaBase64(FotoArquivo);
                }
            } else {
                FotoBase64 = fotoComprimida;
            }         
            
            telaCarregamento.style.display = "flex";

            const response = await fetchComAutoRefresh(endpoint + '/api/auth/editarUsuario', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    Username: Username,
                    Nome: Nome,
                    Email: Email,
                    Foto: FotoBase64 
                 })
            });
            
            const data = await response.json();

            telaCarregamento.style.display = "none";

            if (response.ok) {
                
                customAlert("Usuário atualizado com sucesso!", () => {                    
                    localStorage.removeItem("usuarioInfo");
                    localStorage.setItem("usuarioInfo", JSON.stringify(data.payload));       
                    window.location.href = "../../area-restrita/perfil/perfil-page.html"
                });
            } else {
                customAlert("Erro ao atualizar o usuário.");
            }
        } catch (error) {
            telaCarregamento.style.display = "none";
            console.error("Erro ao atualizar o usuário:", error);
            customAlert("Erro ao atualizar o usuário.");
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {

    const userNameInputs = document.querySelectorAll(".user-name-input");

    userNameInputs.forEach(userName => {
        userName.value = usuarioInfo.Nome || "";
    });

    const usernameInputs = document.querySelectorAll(".user-username-input");

    usernameInputs.forEach(username => {
        username.value = usuarioInfo.Username || "";
    });

    const userEmails = document.querySelectorAll(".user-email-input");

    userEmails.forEach(userEmail => {
        userEmail.value = usuarioInfo.Email || "";
    });

    document.getElementById("editar-btn").addEventListener("click", () => {
        editarUsuario();
    });

    document.getElementById("cancelar-btn").addEventListener("click", () => {
        window.location.href = "../../area-restrita/perfil/perfil-page.html";
    });
});