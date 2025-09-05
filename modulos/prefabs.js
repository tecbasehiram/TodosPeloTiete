
import { endpoint } from '../modulos/variaveisGlobais.js';
import { customConfirm } from  "../modulos/modals.js";

export function createModals() {

    const modalsHTML = `
    <div class="modal fade" id="modal-alert" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="modal-alert-label" aria-hidden="true" style="z-index: 10000000;">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-sm">
            <div class="modal-content">
                <div class="modal-body">
                    <h1 class="modal-title fs-5" id="modal-alert-label">Este é um alerta!</h1>
                </div>
                <div class="modal-footer">
                    <button type="button" id="btn-alert-ok" class="btn" style="background-color:rgba(30, 58, 138, 0.95); box-shadow: 0 0 5px rgba(30, 58, 138, 0.95); color: white;">Ok</button>
                </div>
            </div>
        </div>
    </div>
    <div class="modal fade" id="modal-confirm" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="modal-confirm-label" aria-hidden="true" style="z-index: 10000000;">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-body">
                    <h1 class="modal-title fs-5" id="modal-confirm-label">Este é um confirm!</h1>
                </div>
                <div class="modal-footer">
                    <button type="button" id="btn-confirm-nao" class="btn" style="background-color:rgb(255, 0, 0); box-shadow: 0 0 5px rgb(255, 77, 77); color: white;">Não</button>
                    <button type="button" id="btn-confirm-sim" class="btn" style="background-color:rgba(30, 58, 138, 0.95); box-shadow: 0 0 5px rgba(30, 58, 138, 0.95); color: white;">Sim</button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", modalsHTML);
}

export function createNavBar(nivel) {
    const navBarHTML = `
        <!--begin::Header-->
        <nav class="app-header navbar navbar-expand bg-body" style="height: 100px !important;">
            <!--begin::Container-->
            <div class="container-fluid">
                <!--begin::Start Navbar Links-->
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" data-lte-toggle="sidebar" href="#" role="button">
                            <i class="fa-solid fa-bars" style="color: black !important;" id="minimizer"></i>
                        </a>
                    </li>
                </ul>
                <!--end::Start Navbar Links-->
                <!--begin::End Navbar Links-->
                <ul class="navbar-nav ms-auto">

                    <!--begin::Messages Dropdown Menu-->
                    <li class="nav-item dropdown mensagem">
                        <a class="nav-link" data-bs-toggle="dropdown" href="#">
                            <i class="bi bi-chat-text"></i>
                            <span class="navbar-badge badge text-bg-danger">1</span>
                        </a>

                        <div class="dropdown-menu mensagem dropdown-menu-lg dropdown-menu-end">
                            <a href="#" class="dropdown-item mensagem">

                                <!--begin::Message-->
                                <div class="d-flex">
                                    <div class="flex-shrink-0">
                                        <img
                                            src="${nivel}/assets/images/avatar-icon.png"
                                            alt="Bernardo Avatar"
                                            class="img-size-50 rounded-circle me-3"
                                        />
                                    </div>
                                    <div class="flex-grow-1">
                                        <h3 class="dropdown-item-title">
                                            Bernardo
                                            <span class="float-end fs-7 text-danger"
                                            ><i class="bi bi-star-fill"></i
                                            ></span>
                                        </h3>
                                        <p class="fs-7">Estou em todos lugares 😲</p>
                                        <p class="fs-7 text-secondary">
                                            <i class="bi bi-clock-fill me-1"></i> 1 Second Ago
                                        </p>
                                    </div>
                                </div>
                                <!--end::Message-->
                            </a>
                            <!-- mais mensagens -->
                            <a href="#" class="dropdown-item dropdown-footer mensagem">Ver todas as mensagens</a>
                        </div>
                    </li>
                    <!--end::Messages Dropdown Menu-->

                    <!--begin::Fullscreen Toggle-->
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-lte-toggle="fullscreen" style="align-items: center !important;">
                            <i data-lte-icon="maximize" class="fa-solid fa-maximize" style="color: black !important;"></i>
                            <i data-lte-icon="minimize" class="fa-solid fa-minimize" style="display: none; color: black !important;"></i>
                        </a>
                    </li>

                    <li class="nav-item">
                        <a class="nav-link" href="#" style="align-items: center !important;">
                            <i id="btn-logout" class="fa-solid fa-right-from-bracket" style="color: black;"></i>
                        </a>
                    </li>
                    <!--end::Fullscreen Toggle-->
                </ul>
                <!--end::End Navbar Links-->
            </div>
            <!--end::Container-->
        </nav>
        <!--end::Header-->
    `;

    const divAppWrapper = document.getElementById("app-wrapper");    
    divAppWrapper.insertAdjacentHTML("afterbegin", `${navBarHTML}`);

    document.getElementById("btn-logout").addEventListener("click", async () => {
        const pergunta = await customConfirm("Deseja realmente sair dessa conta?");

        if(pergunta) {
            await fetch(endpoint + '/api/auth/logout', {
                method: 'GET', 
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            window.location.href = `${nivel}/loginUsuario/login.html`;
        } 
    }); 
}

export async function createOffCanvas() {
    const usuarioInfo = JSON.parse(localStorage.getItem("usuarioInfo"));
    const cargo = usuarioInfo.Cargo;

    const sideBarHTML = `
        <ul class="nav nav-treeview ul-municipio-maps">
            
        </ul>
    `;

    const offCanvasBody = document.querySelector(".offcanvas-body");    
    offCanvasBody.innerHTML = sideBarHTML;
}

export function createDivFundo() {
    const divFundoHTML = `
        <div id="div-fundo" style="display: none;"></div>
    `;
    
    document.body.insertAdjacentHTML("beforeend", divFundoHTML);
}

export function createDivCarregandoFundo(spanText) {
    const divCarregandoFundoHTML = `
        <div id="div-carregando-fundo" style="display: none;">
            <div id="div-carregando">
                <div class="spinner-border text-light" role="status">
                </div>
                <span class="span" style="color: white;">${spanText || ""}</span>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML("beforeend", divCarregandoFundoHTML);
}

export function createFooter() {
    const footerHTML = `
        <div class="container-xxl">
            <div class="footer-container d-flex align-items-center justify-content-between py-4 flex-md-row flex-column">
                <div class="mb-2 mb-md-0">
                    ©${new Date().getFullYear()}
                    <a class="text-gray">Hiram Inteligência e Negócios,</a>
                    <span class="footer-bottom-text"> Todos os direitos reservados.</span>
                </div>
                <div class="d-none d-lg-inline-block">
                    <a href="#" class="footer-link d-none d-sm-inline-block">
                        Suporte
                    </a>
                </div>
            </div>
        </div>
    `;    

    const layoutFooterElement = document.querySelector(".content-footer");
    if (layoutFooterElement) {
        layoutFooterElement.insertAdjacentHTML("afterbegin", footerHTML);
        /* layoutFooterElement.querySelector(".footer-link").addEventListener("click", () => {
            customAlert(`
                Caso precise de suporte IMEDIATO, envie um email para <a href="#" class="copiar-email">adm@oabsalto.org.br</a><i class="fa-regular fa-copy copiar-email" style="cursor:pointer">.
            `);
            
            document.querySelectorAll('.copiar-email').forEach(link => {
                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        await navigator.clipboard.writeText('adm@oabsalto.org.br');
                    } catch (err) {
                        link.textContent = 'Erro ao copiar';
                        console.error('Erro ao copiar e-mail:', err);
                    }
                });
            });
        }) */
    } else {
        console.error("Elemento #content-footer não encontrado ao tentar criar o footer.");
    }

    return new Promise(resolve => requestAnimationFrame(resolve));
}

export function createSidebar(nivel, paginaAtual) {
    const usuarioInfo = JSON.parse(localStorage.getItem("usuarioInfo"));
    const cargoDoUsuario = usuarioInfo.Cargo;

    const textUserRules = document.querySelectorAll(".user-rule");

    textUserRules.forEach(textUserRule => {
        textUserRule.innerText = usuarioInfo.Cargo || "Cargo";
    });

    const textUserNames = document.querySelectorAll(".user-name");

    textUserNames.forEach(textUserName => {
        textUserName.innerText = usuarioInfo.Nome || "Anônimo";
    });

    const textUserUsernames = document.querySelectorAll(".user-username");

    textUserUsernames.forEach(textUserUsername => {
        textUserUsername.innerText = usuarioInfo.Username || "Anônimo";
    });

    const appBrandElements = `
        <a class="app-brand-link" style="width: 100%; display: flex;" href="${nivel}/area-restrita/bem-vindo/bem-vindo-page.html">
            <span class="app-brand-logo demo w-100 h-auto" style="display: flex; justify-content: center;">
                <span class="text-primary alvo" style="width: 100% !important; display: flex; justify-content: center;"">
                    <img
                    src="${nivel}/images/todos-pelo-tiete.png"
                    alt="logo"
                    class="app-brand-logo demo logo-sidebar mt-12 mb-5"
                    style="width: 40%; heigth: auto;" />
                </span>
            </span>
            <span class="app-brand-text demo menu-text fw-bold"></span>
        </a>
    `;

    const liElements = `
        <li class="menu-header small mt-8 mb-0">
            <span class="menu-header-text" data-i18n=""></span>
        </li>

        <li class="menu-item ${paginaAtual === "perfil" ? "active open" : paginaAtual === "editar-perfil" ? "active open" : paginaAtual === "editar-senha" ? "active open" : ""}">
            <a href="javascript:void(0);" class="menu-link menu-toggle">
                <i class="menu-icon icon-base bx bx-user"></i>
                <div data-i18n="Perfil do Usuário">Perfil do Usuário</div>
            </a>
            <ul class="menu-sub">
                <li class="menu-item ${paginaAtual === "perfil" ? "active" : ""}">
                    <a href="${nivel}/area-restrita/perfil/perfil-page.html" class="menu-link">
                        <i class="menu-icon icon-base bx bx-user"></i>
                        <div data-i18n="Perfil">Perfil</div>
                    </a>
                </li>
                <li class="menu-item ${paginaAtual === "editar-perfil" ? "active" : ""}">
                    <a href="${nivel}/area-restrita/editar-perfil/editar-perfil-page.html" class="menu-link">
                        <i class="menu-icon icon-base bx bx-cog"></i>
                        <div data-i18n="Editar Perfil">Editar Perfil</div>
                    </a>
                </li>
                <li class="menu-item ${paginaAtual === "editar-senha" ? "active" : ""}">
                    <a href="${nivel}/area-restrita/editar-perfil-seguranca/editar-perfil-seguranca-page.html" class="menu-link">
                        <i class="menu-icon icon-base bx bx-lock"></i>
                        <div data-i18n="Senha">Senha</div>
                    </a>
                </li>
            </ul>
        </li>   

        <li class="menu-item ${paginaAtual === "city-maps" ? "active" : ""}">
            <a href="${nivel}/area-restrita/city-maps/city-maps-page.html" class="menu-link">
                <i class="menu-icon icon-base bx bx-map"></i>
                <div data-i18n="Consultar Mapas">Consultar Mapa</div>
            </a>
        </li>   
    `;
    const layoutMenuInnerElement = document.querySelector(".menu-inner");
    if (layoutMenuInnerElement) {
        layoutMenuInnerElement.innerHTML = liElements;
    } else {
        console.error("Elemento #menu-inner não encontrado ao tentar criar a sidebar.");
    }

    const layoutMenuAppBrandElement = document.querySelector(".app-brand");
    if (layoutMenuAppBrandElement) {
        layoutMenuAppBrandElement.insertAdjacentHTML("afterbegin", appBrandElements);
    } else {
        console.error("Elemento #menu-inner não encontrado ao tentar criar a sidebar.");
    }

    function updateLogoBasedOnTheme() {
        const theme = document.documentElement.getAttribute('data-bs-theme');
        const imgUserProfiles = document.querySelectorAll(".user-img");
        const logo = document.querySelector(".logo-sidebar");
        const icons = document.querySelectorAll('.icon-landing-page');
        const isDark = theme === 'dark';

        imgUserProfiles.forEach(imgUserProfile => {
            imgUserProfile.src = usuarioInfo.Foto || `${isDark ? `${nivel}/assets/images/foto-perfil-dark.png` : `${nivel}/assets/images/foto-perfil-light.png`}`;
        });

        if (logo) {
            logo.src = isDark
            ? `${nivel}/images/todos-pelo-tiete.png`
            : `${nivel}/images/todos-pelo-tiete.png`;
        }

        if(icons) {
            icons.forEach(icon => {
                icon.style.color = isDark
                    ? 'white'
                    : 'black';
            })
        }
    }

    document.addEventListener("DOMContentLoaded", async function () {

        updateLogoBasedOnTheme();

        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'data-bs-theme'
                ) {
                    updateLogoBasedOnTheme(); 
                }
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-bs-theme']
        });
    });

    if(document.getElementById("btn-logout")) {
        document.getElementById("btn-logout").addEventListener("click", async () => {
            const pergunta = await customConfirm("Deseja realmente sair dessa conta?");

            if(pergunta) {
                await fetch(endpoint + '/api/oab/auth/logout', {
                    method: 'GET', 
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                localStorage.removeItem("usuarioInfo");
                sessionStorage.removeItem('authStatus');
                sessionStorage.removeItem('authTimestamp');

                window.location.href = `${nivel}/index.html`;
            } 
        }); 
    }    

    return new Promise(resolve => requestAnimationFrame(resolve));
}

export function createToast() {
    const toastHTML = `
        <div class="toast-container position-fixed end-0 p-3" style="z-index: 999999999; top: 6px">
            <div
                class="bs-toast toast fade bg-primary"
                role="alert"
                aria-live="assertive"
                aria-atomic="true">
                <div class="toast-body labels-dropdown" style="color: inherit;">
                
                </div>
            </div>
        </div>
    `;

    document.querySelector(".layout-wrapper").insertAdjacentHTML("beforeBegin", toastHTML);
}


export function formatarDataStringBr(dataString) {
    const data = new Date(dataString);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0'); // Janeiro = 0
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }