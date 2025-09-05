const usuarioInfo = JSON.parse(localStorage.getItem("usuarioInfo"));

function formatarDataBr(dataIso) {
  const [ano, mes, dia] = dataIso.substring(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

document.addEventListener("DOMContentLoaded", function () {

  const textUserRules = document.querySelectorAll(".user-rule");

  textUserRules.forEach(textUserRule => {
    textUserRule.innerText = `${usuarioInfo.Cargo}` || "Cargo";
  });

  const textUserNames = document.querySelectorAll(".user-name");

  textUserNames.forEach(textUserName => {
    textUserName.innerText = usuarioInfo.Nome || "Anônimo";
  });

  const textUserEmails = document.querySelectorAll(".user-email");

  textUserEmails.forEach(textUserEmail => {
    textUserEmail.innerText = usuarioInfo.Email || "Indefinido";
  });
});



