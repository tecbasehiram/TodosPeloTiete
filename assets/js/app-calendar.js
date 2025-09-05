'use strict';

import { endpoint } from '../../modulos/variaveisGlobais.js';
import { customAlert, customConfirm } from  "../../modulos/modals.js";
import { fetchComAutoRefresh } from '../../modulos/fetchComAutoRefresh.js';

const params = new URLSearchParams(window.location.search);

const id_departamentoPagina = params.get("id_departamento");
const tipo_departamentoPagina = params.get("tipo_departamento");

const usuarioInfo = JSON.parse(localStorage.getItem("usuarioInfo"));
const id_departamentoUsuario = usuarioInfo.IdDepartamento;
const tipo_departamentoUsuario = usuarioInfo.tipoDepartamento;

let nomesDasComissoes = [];

if(usuarioInfo.comissoes) {
  nomesDasComissoes = usuarioInfo.comissoes.map(c => c.nome);
}

const nomeCalendarios = {
  "GERAL_0": "Calendário Geral",
  "COORDENADORIA_1": "Calendário Coordenação - Humanidades",
  "COORDENADORIA_2": "Calendário Coordenação - Integração",
  "COORDENADORIA_3": "Calendário Coordenação - Relações Institucionais",
  "COORDENADORIA_4": "Calendário Coordenação - Temáticas I",
  "COORDENADORIA_5": "Calendário Coordenação - Temáticas II",
  "COMISSAO_35": "Calendário Comissão - Advocacia Criminal",
  "COMISSAO_36": "Calendário Comissão - Assistência Judiciária",
  "COMISSAO_43": "Calendário Comissão - Direito Digital",
  "COMISSAO_50": "Calendário Comissão - Soluções Consensuais de Conflitos",
  "COMISSAO_54": "Calendário Comissão - Direito Urbanístico",
  "COMISSAO_48": "Calendário Comissão - Ética",
  "COMISSAO_41": "Calendário Comissão - Cursos e Palestras",
  "COMISSAO_56": "Calendário Comissão - Meio Ambiente",
  "COMISSAO_44": "Calendário Comissão - Direito Previdenciário",
  "COMISSAO_47": "Calendário Comissão - Esportes",
  "COMISSAO_46": "Calendário Comissão - Direitos Humanos",
  "COMISSAO_53": "Calendário Comissão - Direito Empresarial",
  "COMISSAO_45": "Calendário Comissão - Direitos e Prerrogativas",
  "COMISSAO_49": "Calendário Comissão - Eventos",
  "COMISSAO_55": "Calendário Comissão - Jovem Advocacia",
  "COMISSAO_39": "Calendário Comissão - Assuntos Institucionais",
  "COMISSAO_57": "Calendário Comissão - OAB Vai à Escola",
  "COMISSAO_40": "Calendário Comissão - Convênios e Parcerias",
  "COMISSAO_38": "Calendário Comissão - Mulher Advogada",
  "COMISSAO_51": "Calendário Comissão - Direito de Família e Sucessões",
  "COMISSAO_42": "Calendário Comissão - Defesa dos Direitos dos Animais",
  "COMISSAO_52": "Calendário Comissão - Direito do Trânsito",
  "COMISSAO_37": "Calendário Comissão - Igualdade Racial"
};

const todasComissoes = {
  "Advocacia Criminal": "COMISSÃO DA ADVOCACIA CRIMINAL",
  "Assistência Judiciária": "COMISSÃO DA ASSISTÊNCIA JUDICIÁRIA",
  "Direito Urbanístico": "COMISSÃO DO DIREITO URBANÍSTICO",
  "Direito Digital": "COMISSÃO DE DIREITO DIGITAL",
  "Soluções Consensuais de Conflitos": "COMISSÃO DE SOLUÇÕES CONSENSUAIS DE CONFLITOS",
  "Ética": "COMISSÃO DE ÉTICA",
  "Cursos e Palestras": "COMISSÃO DE CURSOS E PALESTRAS",
  "Meio Ambiente": "COMISSÃO DO MEIO AMBIENTE",
  "Direito Previdenciário": "COMISSÃO DE DIREITO PREVIDENCIÁRIO",
  "Esportes": "COMISSÃO DE ESPORTES",
  "Direitos Humanos": "COMISSÃO DE DIREITOS HUMANOS",
  "Direito Empresarial": "COMISSÃO DO DIREITO EMPRESARIAL",
  "Direitos e Prerrogativas": "COMISSÃO DE DIREITOS E PRERROGATIVAS",
  "Eventos": "COMISSÃO DE EVENTOS",
  "Jovem Advocacia": "COMISSÃO DA JOVEM ADVOCACIA",
  "Assuntos Institucionais": "COMISSÃO DE ASSUNTOS INSTITUCIONAIS",
  "OAB Vai à Escola": "COMISSÃO OAB VAI À ESCOLA",
  "Convênios e Parcerias": "COMISSÃO DE CONVÊNIOS E PARCERIAS",
  "Mulher Advogada": "COMISSÃO DA MULHER ADVOGADA",
  "Direito da Família e Sucessões": "COMISSÃO DIREITO DE FAMÍLIA E SUCESSÕES",
  "Direito e Defesa dos Animais": "COMISSÃO DE DEFESA DOS DIREITOS DOS ANIMAIS",
  "Direito do Trânsito": "COMISSÃO DO DIREITO DO TRÂNSITO",
  "Igualdade Racial": "COMISSÃO DA IGUALDADE RACIAL"
};

const id_departamento = id_departamentoPagina;
const tipo_departamento = tipo_departamentoPagina;

const chave = `${tipo_departamento.toUpperCase()}_${id_departamento}`;
const nomeDoCalendario = nomeCalendarios[chave] || "Calendário do Departamento";

const h4 = document.getElementById("h4-calendario");
h4.textContent = nomeDoCalendario;

const telaCarregamento = document.getElementById("div-carregando-fundo");

async function carregarEventos() {
  try {
    telaCarregamento.style.display = "flex";

    const response = await fetchComAutoRefresh(endpoint + `/api/oab/calendario/carregarEventos?id_departamento=${id_departamento}&tipo_departamento=${tipo_departamento}`, {
      method: 'GET', 
      credentials: 'include'
    }, "../..");

    const data = await response.json();

    if (!response.ok || data.status !== "SUCCESS") {
      window.events = [];

      customAlert(data.message || `Erro ao carregar os eventos do departamento.`);
      return;
    }   

    window.events = data.payload.map(evento => {
      const start = new Date(evento.data_inicio);
      const end = new Date(evento.data_fim);
      
      return {
        id: evento.id,
        url: evento.url,
        title: evento.titulo,
        start: start,
        end: (start.getTime() === end.getTime()) ? null : end, 
        allDay: Boolean(evento.all_day),
        extendedProps: {
          calendar: evento.categoria.toString(),
          localizacao: evento.localizacao,
          descricao: evento.descricao
        }
      };
    });
  } catch (err) {
      console.log('Erro ao carregar os eventos do departamento: ', err);
  } finally {        
      telaCarregamento.style.display = "none";
  }   
}

async function adicionarEvento(body) {
  try {
    telaCarregamento.style.display = "flex";

    const response = await fetchComAutoRefresh(endpoint + `/api/oab/calendario/adicionarEvento`, {
      method: 'POST', 
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }, "../..");

    const data = await response.json();

    if (!response.ok || data.status !== "SUCCESS") {
      customAlert(data.message || `Erro ao adicionar o evento.`);
      return data;
    } else {      
      customAlert(data.message || `Sucesso ao adicionar o evento.`);
      return data;
    }
  } catch (err) {
      console.log('Erro ao adicionar o evento: ', err);
  } finally {        
      telaCarregamento.style.display = "none";
  }   
}

async function atualizarEvento(body) {
  try {
    telaCarregamento.style.display = "flex";

    const response = await fetchComAutoRefresh(endpoint + `/api/oab/calendario/atualizarEvento`, {
      method: 'POST', 
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }, "../..");

    const data = await response.json();

    if (!response.ok || data.status !== "SUCCESS") {
      customAlert(data.message || `Erro ao atualizar o evento.`);
      return data;
    } else {      
      customAlert(data.message || `Sucesso ao atualizar o evento.`);
      return data;
    }
  } catch (err) {
      console.log('Erro ao atualizar o evento: ', err);
  } finally {        
      telaCarregamento.style.display = "none";
  }   
}

async function deletarEvento(id) {
  try {
    telaCarregamento.style.display = "flex";

    const response = await fetchComAutoRefresh(endpoint + `/api/oab/calendario/apagarEvento`, {
      method: 'DELETE', 
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: id })
    }, "../..");

    const data = await response.json();

    if (!response.ok || data.status !== "SUCCESS") {
      customAlert(data.message || `Erro ao apagar o evento.`);
      return data;
    } else {      
      customAlert(data.message || `Sucesso ao apagar o evento.`);
      return data;
    }
  } catch (err) {
      console.log('Erro ao apagar o evento: ', err);
  } finally {        
      telaCarregamento.style.display = "none";
  }   
}

document.addEventListener('DOMContentLoaded', async function () {

  const linkAtivo = document.querySelector(
    `.calendarios a[href*="id_departamento=${id_departamentoPagina}"][href*="tipo_departamento=${tipo_departamentoPagina}"]`
  );

  let nomeDaPagina;

  if (linkAtivo) {
    const itemMenu = linkAtivo.closest(".menu-item");
    itemMenu.classList.add("active");

    const submenuPai = itemMenu.closest("ul.menu-sub");
    const paiMenu = submenuPai.closest(".menu-item");
    paiMenu.classList.add("open");

    nomeDaPagina = linkAtivo?.querySelector("div")?.dataset.i18n;
  } 

  const ehDiretor = usuarioInfo.Cargo === "DIRETOR";
  const ehCoordenador = usuarioInfo.Cargo === "COORDENADOR";
  const ehPresidente = usuarioInfo.Cargo === "PRESIDENTE";

  const nomeComissaoOficial = todasComissoes[nomeDaPagina];

  let acessoPermitido = false;

  if (ehDiretor) {
    acessoPermitido = true; 
  } else if (ehCoordenador) {
    const mesmoDepartamento = parseInt(id_departamentoPagina) === parseInt(id_departamentoUsuario) &&
                              tipo_departamentoPagina.toLowerCase() === tipo_departamentoUsuario.toLowerCase();
    const comissaoPermitida = nomeComissaoOficial && nomesDasComissoes.includes(nomeComissaoOficial);
    
    acessoPermitido = mesmoDepartamento || comissaoPermitida;
  } else if (ehPresidente) {
    acessoPermitido = nomeComissaoOficial && usuarioInfo.nomeDepartamento === nomeComissaoOficial;
  } else {
    acessoPermitido = parseInt(id_departamentoPagina) === parseInt(id_departamentoUsuario) &&
                      tipo_departamentoPagina.toLowerCase() === tipo_departamentoUsuario.toLowerCase();
  }

  if (!acessoPermitido) {
    await customAlert("Você não pode acessar essa página!");
    window.location.href = "../../area-restrita/perfil/perfil-page.html";
  }

  const collapseTodosCalendarios = document.querySelector(".todos-calendarios");

  const calendarios = Array.from(
    document.querySelectorAll('.menu-sub.calendarios .menu-item:not(.active) .menu-link')
  ).map(link => {
    const nome = link.querySelector('div[data-i18n]')?.textContent.trim() || '';

    const url = new URL(link.href, window.location.origin);
    const id = url.searchParams.get('id_departamento');
    const tipo = url.searchParams.get('tipo_departamento');

    return { nome, id, tipo };
  });

  calendarios.forEach(calendario => {
    collapseTodosCalendarios.innerHTML += `
      <label class="switch col-12 d-flex align-items-center p-2">
        <input type="checkbox" class="switch-input add-outro-calendario" data-id="${calendario.id}" data-tipo="${calendario.tipo}" />
        <span class="switch-toggle-slider">
          <span class="switch-on">
            <i class="icon-base bx bx-check"></i>
          </span>
          <span class="switch-off">
            <i class="icon-base bx bx-x"></i>
          </span>
        </span>
        <span class="switch-label">${calendario.nome}</span>
      </label>
    `;
  });

  let date = new Date();
  let nextDay = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  let nextMonth = date.getMonth() === 11 ? new Date(date.getFullYear() + 1, 0, 1) : new Date(date.getFullYear(), date.getMonth() + 1, 1);
  let prevMonth = date.getMonth() === 11 ? new Date(date.getFullYear() - 1, 0, 1) : new Date(date.getFullYear(), date.getMonth() - 1, 1);

  await carregarEventos()

  const isRtl = false;

  const direction = isRtl ? 'rtl' : 'ltr';
  (function () {
    const calendarEl = document.getElementById('calendar');
    const appCalendarSidebar = document.querySelector('.app-calendar-sidebar');
    const addEventSidebar = document.getElementById('addEventSidebar');
    const appOverlay = document.querySelector('.app-overlay');
    const offcanvasTitle = document.querySelector('.offcanvas-title');
    const btnToggleSidebar = document.querySelector('.btn-toggle-sidebar');
    const btnSubmit = document.getElementById('addEventBtn');
    const btnDeleteEvent = document.querySelector('.btn-delete-event');
    const btnCancel = document.querySelector('.btn-cancel');
    const eventTitle = document.getElementById('eventTitle');
    const eventStartDate = document.getElementById('eventStartDate');
    const eventEndDate = document.getElementById('eventEndDate');
    const eventUrl = document.getElementById('eventURL');
    const eventLocation = document.getElementById('eventLocation');
    const eventDescription = document.getElementById('eventDescription');
    const allDaySwitch = document.querySelector('.allDay-switch');
    const selectAll = document.querySelector('.select-all');
    const filterInputs = Array.from(document.querySelectorAll('.input-filter'));
    const inlineCalendar = document.querySelector('.inline-calendar');

    const calendarColors = {
      "1": "primary",     // Comissão
      "2": "danger",      // Coordenadoria
      "3": "warning",     // Diretoria
      "4": "success"      // Eventos Gerais
    };

    // External jQuery Elements
    const eventLabel = $('#eventLabel'); // ! Using jQuery vars due to select2 jQuery dependency
    const eventGuests = $('#eventGuests'); // ! Using jQuery vars due to select2 jQuery dependency

    // Event Data
    let currentEvents = window.events; // Assuming events are imported from app-calendar-events.js
    let isFormValid = false;
    let eventToUpdate = null;
    let inlineCalInstance = null;

    // Offcanvas Instance
    const bsAddEventSidebar = new bootstrap.Offcanvas(addEventSidebar);

    //! TODO: Update Event label and guest code to JS once select removes jQuery dependency
    // Initialize Select2 with custom templates
    if (eventLabel.length) {
      function renderBadges(option) {
        if (!option.id) {
          return option.text;
        }
        var $badge =
          "<span class='badge badge-dot bg-" + $(option.element).data('label') + " me-2'> " + '</span>' + option.text;

        return $badge;
      }
      eventLabel.wrap('<div class="position-relative"></div>').select2({
        placeholder: 'Select value',
        dropdownParent: eventLabel.parent(),
        templateResult: renderBadges,
        templateSelection: renderBadges,
        minimumResultsForSearch: -1,
        escapeMarkup: function (es) {
          return es;
        }
      });
    }

    // Render guest avatars
    if (eventGuests.length) {
      function renderGuestAvatar(option) {
        if (!option.id) return option.text;
        return `
    <div class='d-flex flex-wrap align-items-center'>
      <div class='avatar avatar-xs me-2'>
        <img src='${assetsPath}img/avatars/${$(option.element).data('avatar')}'
          alt='avatar' class='rounded-circle' />
      </div>
      ${option.text}
    </div>`;
      }
      eventGuests.wrap('<div class="position-relative"></div>').select2({
        placeholder: 'Select value',
        dropdownParent: eventGuests.parent(),
        closeOnSelect: false,
        templateResult: renderGuestAvatar,
        templateSelection: renderGuestAvatar,
        escapeMarkup: function (es) {
          return es;
        }
      });
    }

    // Event start (flatpicker)
    if (eventStartDate) {
      var start = eventStartDate.flatpickr({
        locale: 'pt', // define o idioma
        dateFormat: 'd/m/Y H:i', // formato brasileiro: 08/07/2025 10:30
        enableTime: true,
        time_24hr: true,
        altInput: true,
        altFormat: 'd/m/Y H:i',
        monthSelectorType: 'static',
        static: true,
        onReady: function (selectedDates, dateStr, instance) {
          if (instance.isMobile) {
            instance.mobileInput.setAttribute('step', null);
          }
        }
      });
    }

    // Event end (flatpicker)
    if (eventEndDate) {
      var end = eventEndDate.flatpickr({
        locale: 'pt', // define o idioma
        dateFormat: 'd/m/Y H:i',
        enableTime: true,
        time_24hr: true,
        altInput: true,
        altFormat: 'd/m/Y H:i',
        monthSelectorType: 'static',
        static: true,
        onReady: function (selectedDates, dateStr, instance) {
          if (instance.isMobile) {
            instance.mobileInput.setAttribute('step', null);
          }
        }
      });
    }

    // Inline sidebar calendar (flatpicker)
    if (inlineCalendar) {
      inlineCalInstance = inlineCalendar.flatpickr({
        locale: 'pt',              
        dateFormat: 'd/m/Y',      
        altFormat: 'd/m/Y',         
        inline: true,              
        static: true,
        monthSelectorType: 'static'
      });
    }

    // Event click function
    function eventClick(info) {
      eventToUpdate = info.event;
      
      if (eventToUpdate.url) {
        info.jsEvent.preventDefault();
      }

      const categorias = {
        1: "Comissão",
        2: "Coordenadoria",
        3: "Diretoria",
        4: "Eventos Gerais",
      }

      const dataInicio = new Date(eventToUpdate.start);
      const dataFormatadaInicio = dataInicio.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const dataFim = new Date(eventToUpdate.end);
      const dataFormatadaFim = dataFim.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      document.getElementById("evento-titulo").innerText = eventToUpdate.title || "Nenhum";
      document.getElementById("evento-link").href = (eventToUpdate.url && eventToUpdate.url !== "null") ? eventToUpdate.url : "Nenhum";
      document.getElementById("evento-link").innerText = (eventToUpdate.url && eventToUpdate.url !== "null") ? eventToUpdate.url : "Nenhum";
      document.getElementById("evento-inicio").innerText = dataFormatadaInicio || "Nenhuma";
      document.getElementById("evento-fim").innerText = dataFormatadaFim || "Nenhuma";
      document.getElementById("evento-categoria").innerText = categorias[eventToUpdate.extendedProps.calendar] || "Nenhuma"
      document.getElementById("evento-localizacao").innerText = eventToUpdate.extendedProps.localizacao || eventToUpdate.extendedProps.location || "Nenhuma";
      document.getElementById("evento-descricao").innerText = eventToUpdate.extendedProps.descricao || eventToUpdate.extendedProps.description || "Nenhuma";
      document.getElementById("evento-allday").innerText = (eventToUpdate.allDay === true) ? "Sim" : "Não";
      
      const modal = new bootstrap.Modal(document.getElementById('viewEventInfo'));
      modal.show();

      document.getElementById("editar-evento").onclick = function (event) {
        bsAddEventSidebar.show();

        if (offcanvasTitle) {
          offcanvasTitle.innerHTML = 'Atualizar Evento';
        }

        btnSubmit.innerHTML = 'Atualizar';

        btnSubmit.classList.add('btn-update-event');
        btnSubmit.classList.remove('btn-add-event');
        btnDeleteEvent.classList.remove('d-none');
        document.querySelector(".add-outros-calendarios").style.display = "none";

        eventTitle.value = eventToUpdate.title || "";
        eventUrl.value = (eventToUpdate.url && eventToUpdate.url !== "null") ? eventToUpdate.url : "";

        start.setDate(eventToUpdate.start);
        end.setDate(eventToUpdate.end);

        allDaySwitch.checked = Boolean(eventToUpdate.allDay);

        eventLocation.value = eventToUpdate.extendedProps.localizacao || "";
        eventDescription.value = eventToUpdate.extendedProps.descricao || "";
        eventLabel.val(eventToUpdate.extendedProps.calendar || "").trigger('change');
      };
    }

    // Modify sidebar toggler
    function modifyToggler() {
      const fcSidebarToggleButton = document.querySelector('.fc-sidebarToggle-button');
      fcSidebarToggleButton.classList.remove('fc-button-primary');
      fcSidebarToggleButton.classList.add('d-lg-none', 'd-inline-block', 'ps-0');
      while (fcSidebarToggleButton.firstChild) {
        fcSidebarToggleButton.firstChild.remove();
      }
      fcSidebarToggleButton.setAttribute('data-bs-toggle', 'sidebar');
      fcSidebarToggleButton.setAttribute('data-overlay', '');
      fcSidebarToggleButton.setAttribute('data-target', '#app-calendar-sidebar');
      fcSidebarToggleButton.insertAdjacentHTML(
        'beforeend',
        '<i class="icon-base bx bx-menu icon-lg text-heading"></i>'
      );
    }

    // Filter events by calender
    function selectedCalendars() {
      let selected = [],
        filterInputChecked = [].slice.call(document.querySelectorAll('.input-filter:checked'));

      filterInputChecked.forEach(item => {
        selected.push(item.getAttribute('data-value'));
      });

      return selected;
    }

    // --------------------------------------------------------------------------------------------------
    // AXIOS: fetchEvents
    // * This will be called by fullCalendar to fetch events. Also this can be used to refetch events.
    // --------------------------------------------------------------------------------------------------
    function fetchEvents(info, successCallback) {
      let calendars = selectedCalendars();
      let selectedEvents = currentEvents.filter(event => calendars.includes(event.extendedProps.calendar.toString()));
      successCallback(selectedEvents);
    }

    // Init FullCalendar
    // ------------------------------------------------
    let calendar = new Calendar(calendarEl, {
      locale: 'pt-br',
      initialView: 'dayGridMonth',
      datesSet: function () {
        modifyToggler();

        const fcHeader = document.querySelector(".fc-header-toolbar");

        if (fcHeader && !fcHeader.querySelector(".dropdown")) {
          const dropdown = document.createElement("div");
          dropdown.className = "dropdown dropdown-dates-set";
          dropdown.innerHTML = `
            <button class="btn-dropdown btn btn-icon p-0" type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <i class="icon-base bx bx-dots-vertical-rounded icon-md"></i>
            </button>
            <div class="dropdown-menu dropdown-menu-end" style="z-index: 999999999999">
                <a class="dropdown-item fc-dayGridMonth-button" href="#">Mês</a>
                <a class="dropdown-item fc-timeGridWeek-button" href="#">Semana</a>
                <a class="dropdown-item fc-timeGridDay-button" href="#">Dia</a>
                <a class="dropdown-item fc-listMonth-button" href="#">Lista</a>
            </div>
          `;

          fcHeader.appendChild(dropdown);

          dropdown.querySelector('.fc-dayGridMonth-button')
            .addEventListener('click', () => calendar.changeView('dayGridMonth'));

          dropdown.querySelector('.fc-timeGridWeek-button')
            .addEventListener('click', () => calendar.changeView('timeGridWeek'));

          dropdown.querySelector('.fc-timeGridDay-button')
            .addEventListener('click', () => calendar.changeView('timeGridDay'));

          dropdown.querySelector('.fc-listMonth-button')
            .addEventListener('click', () => calendar.changeView('listMonth'));
        }
      },
      events: fetchEvents,
      plugins: [dayGridPlugin, interactionPlugin, listPlugin, timegridPlugin],
      editable: true,
      dragScroll: true,
      dayMaxEvents: 2,
      eventResizableFromStart: true,
      customButtons: {
        sidebarToggle: {
          text: 'Menu'
        }
      },
      headerToolbar: {
        start: 'sidebarToggle, prev,next, title',
        end: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
      },
      buttonText: {
        today:    'Hoje',
        month:    'Mês',
        week:     'Semana',
        day:      'Dia',
        list:     'Lista'
      },
      direction: direction,
      initialDate: new Date(),
      navLinks: true, // can click day/week names to navigate views
      eventClassNames: function ({ event: calendarEvent }) {
        const colorName = calendarColors[calendarEvent._def.extendedProps.calendar.toString()];
        return ['bg-label-' + colorName];
      },
      dateClick: function (info) {
        let date = moment(info.date).format('DD-MM-YYYY');
        resetValues();
        bsAddEventSidebar.show();

        // For new event set offcanvas title text: Add Event
        if (offcanvasTitle) {
          offcanvasTitle.innerHTML = 'Adicionar Evento';
        }
        btnSubmit.innerHTML = 'Adicionar';
        btnSubmit.classList.remove('btn-update-event');
        btnSubmit.classList.add('btn-add-event');
        btnDeleteEvent.classList.add('d-none');
        eventStartDate.value = date;
        eventEndDate.value = date;
      },
      eventClick: function (info) {
        eventClick(info);
      },
      viewDidMount: function () {
        modifyToggler();
      },
      eventDrop: async function (info) {
        const updatedEvent = info.event;

        const eventData = {
          id: updatedEvent.id,
          title: updatedEvent.title,
          start: updatedEvent.start,
          end: updatedEvent.end,
          url: updatedEvent.url,
          allDay: updatedEvent.allDay,
          extendedProps: {
            calendar: updatedEvent.extendedProps.calendar,
            location: updatedEvent.extendedProps.localizacao,
            description: updatedEvent.extendedProps.descricao
          }
        };

        let propsToUpdate = ['title', 'url'];
        let extendedPropsToUpdate = ['calendar', 'location', 'description'];

        updateEventInCalendar(eventData, propsToUpdate, extendedPropsToUpdate);

        await carregarEventos();
        currentEvents = window.events;
        calendar.refetchEvents();
      }
    });

    // Render calendar
    calendar.render();
    // Modify sidebar toggler
    modifyToggler();

    const eventForm = document.getElementById('eventForm');
    const fv = FormValidation.formValidation(eventForm, {
      fields: {
        eventTitle: {
          validators: {
            notEmpty: {
              message: 'Por favor insira o título do evento '
            }
          }
        },
        eventStartDate: {
          validators: {
            notEmpty: {
              message: 'Por favor insira a data de inicio '
            }
          }
        },
        eventEndDate: {
          validators: {
            notEmpty: {
              message: 'Por favor insira a data de fim '
            }
          }
        }
      },
      plugins: {
        trigger: new FormValidation.plugins.Trigger(),
        bootstrap5: new FormValidation.plugins.Bootstrap5({
          // Use this for enabling/changing valid/invalid class
          eleValidClass: '',
          rowSelector: function (field, ele) {
            // field is the field name & ele is the field element
            return '.form-control-validation';
          }
        }),
        submitButton: new FormValidation.plugins.SubmitButton(),
        // Submit the form when all fields are valid
        // defaultSubmit: new FormValidation.plugins.DefaultSubmit(),
        autoFocus: new FormValidation.plugins.AutoFocus()
      }
    })
      .on('core.form.valid', function () {
        // Jump to the next step when all fields in the current step are valid
        isFormValid = true;
      })
      .on('core.form.invalid', function () {
        // if fields are invalid
        isFormValid = false;
      });

    // Sidebar Toggle Btn
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', e => {
        btnCancel.classList.remove('d-none');
      });
    }

    function parseBrDateTimeToDate(str) {
      const [datePart, timePart] = str.split(' ');
      const [day, month, year] = datePart.split('/');
      return new Date(`${year}-${month}-${day}T${timePart}:00`);
    }

    // Add Event
    // ------------------------------------------------
    async function addEvent(eventData) {
      const selecionados = Array.from(
        collapseTodosCalendarios.querySelectorAll('input[type="checkbox"].add-outro-calendario:checked')
      ).map(checkbox => ({
        id: parseInt(checkbox.dataset.id, 10),
        tipo: checkbox.dataset.tipo
      }));

      const body = {
        tipo_departamento: tipo_departamento,
        id_departamento: id_departamento,
        titulo: eventData.title,
        categoria: eventData.extendedProps.calendar,
        data_inicio: parseBrDateTimeToDate(eventData.start),
        data_fim: parseBrDateTimeToDate(eventData.end),
        all_day: eventData.allDay,
        url: eventData.url,
        localizacao: eventData.extendedProps.location,
        descricao: eventData.extendedProps.description,
        addEmOutrosCalendarios: selecionados
      }   

      const response = await adicionarEvento(body);

      if (response?.status === "SUCCESS") {
        const novoEvento = {
          id: response.payload.id,
          title: eventData.title,
          start: parseBrDateTimeToDate(eventData.start),
          end: parseBrDateTimeToDate(eventData.end),
          allDay: eventData.allDay,
          url: eventData.url,
          extendedProps: {
            calendar: eventData.extendedProps.calendar,
            location: eventData.extendedProps.location,
            description: eventData.extendedProps.description
          }
        };

        currentEvents.push(novoEvento);
        calendar.refetchEvents(); 
      }
    }

    // Update Event
    // ------------------------------------------------
    async function updateEvent(eventData) {
      const body = {
        id: parseInt(eventData.id),
        tipo_departamento: tipo_departamento,
        id_departamento: id_departamento,
        titulo: eventData.title,
        categoria: eventData.extendedProps.calendar,
        data_inicio: parseBrDateTimeToDate(eventData.start),
        data_fim: parseBrDateTimeToDate(eventData.end),
        all_day: eventData.allDay,
        url: eventData.url,
        localizacao: eventData.extendedProps.location,
        descricao: eventData.extendedProps.description 
      }     

      const response = await atualizarEvento(body);

      if (response?.status === "SUCCESS") {
        
        const index = currentEvents.findIndex(ev => ev.id == eventData.id);
        if (index !== -1) {
          currentEvents[index] = {
            ...currentEvents[index],
            title: eventData.title,
            start: parseBrDateTimeToDate(eventData.start),
            end: parseBrDateTimeToDate(eventData.end),
            allDay: eventData.allDay,
            url: eventData.url,
            extendedProps: {
              calendar: eventData.extendedProps.calendar,
              location: eventData.extendedProps.location,
              description: eventData.extendedProps.description
            }
          };
        }

        calendar.refetchEvents();
      }
    }

    // Remove Event
    // ------------------------------------------------
    async function removeEvent(eventId) {
      const response = await deletarEvento(eventId);

      if (response?.status === "SUCCESS") {
        currentEvents = currentEvents.filter(ev => ev.id != eventId);
        calendar.refetchEvents();
      }
    }

    // (Update Event In Calendar (UI Only)
    // ------------------------------------------------
    const updateEventInCalendar = async (updatedEventData, propsToUpdate, extendedPropsToUpdate) => {
      const body = {
        id: parseInt(updatedEventData.id),
        tipo_departamento: tipo_departamento,
        id_departamento: id_departamento,
        titulo: updatedEventData.title,
        categoria: updatedEventData.extendedProps.calendar,
        data_inicio: updatedEventData.start,
        data_fim: updatedEventData.end,
        all_day: updatedEventData.allDay,
        url: updatedEventData.url,
        localizacao: updatedEventData.extendedProps.location,
        descricao: updatedEventData.extendedProps.description
      };

      // Atualiza no banco de dados
      const response = await atualizarEvento(body);
      if (response?.status !== "SUCCESS") return;

      // Atualiza localmente na lista de eventos (se estiver usando um array como cache)
      const index = currentEvents.findIndex(ev => ev.id == updatedEventData.id);
      if (index !== -1) {
        currentEvents[index] = {
          ...currentEvents[index],
          ...updatedEventData
        };
      }

      // Atualiza visualmente no calendário
      const existingEvent = calendar.getEventById(updatedEventData.id);
      if (!existingEvent) return;

      // Propriedades principais (title, url, etc.)
      for (let i = 0; i < propsToUpdate.length; i++) {
        existingEvent.setProp(propsToUpdate[i], updatedEventData[propsToUpdate[i]]);
      }

      // Datas (start e end)
      existingEvent.setDates(updatedEventData.start, updatedEventData.end, {
        allDay: updatedEventData.allDay
      });

      // Extended props (como descricao e localizacao)
      for (let i = 0; i < extendedPropsToUpdate.length; i++) {
        const key = extendedPropsToUpdate[i];
        const value = updatedEventData.extendedProps[key];

        // Atualiza visual no calendário
        existingEvent.setExtendedProp(key, value);

        // Força sincronização no objeto interno do FullCalendar
        existingEvent.extendedProps[key] = value;
      }
    };

    // Remove Event In Calendar (UI Only)
    // ------------------------------------------------
    function removeEventInCalendar(eventId) {
      calendar.getEventById(eventId).remove();
    }

    // Add new event
    // ------------------------------------------------
    btnSubmit.addEventListener('click', e => {
      if (btnSubmit.classList.contains('btn-add-event')) {        
        if (isFormValid) {
          let newEvent = {
            id: calendar.getEvents().length + 1,
            title: eventTitle.value,
            start: eventStartDate.value,
            end: eventEndDate.value,
            startStr: eventStartDate.value,
            endStr: eventEndDate.value,
            display: 'block',
            extendedProps: {
              location: eventLocation.value,
              guests: eventGuests.val(),
              calendar: eventLabel.val(),
              description: eventDescription.value
            }
          };
          if (eventUrl.value) {
            newEvent.url = eventUrl.value;
          }
          if (allDaySwitch.checked) {
            newEvent.allDay = true;
          }
          addEvent(newEvent);
          bsAddEventSidebar.hide();
        }
      } else {
        if (isFormValid) {
          let eventData = {
            id: eventToUpdate.id,
            title: eventTitle.value,
            start: eventStartDate.value,
            end: eventEndDate.value,
            url: eventUrl.value,
            extendedProps: {
              location: eventLocation.value,
              guests: eventGuests.val(),
              calendar: eventLabel.val(),
              description: eventDescription.value
            },
            display: 'block',
            allDay: allDaySwitch.checked ? true : false
          };

          updateEvent(eventData);
          bsAddEventSidebar.hide();
        }
      }
    });

    // Call removeEvent function
    btnDeleteEvent.addEventListener('click', async e => {
      removeEvent(parseInt(eventToUpdate.id));
      bsAddEventSidebar.hide();
    });

    // Reset event form inputs values
    // ------------------------------------------------
    function resetValues() {
      document.querySelector(".add-outros-calendarios").style.display = "block";
      collapseTodosCalendarios.querySelectorAll('input[type="checkbox"].add-outro-calendario').forEach(checkbox => {
        checkbox.checked = false;
      });
      document.getElementById("collapseListaCalendarios").classList.remove("show")
      if (start) start.setDate(null);
      if (end) end.setDate(null);

      eventEndDate.value = ""
      eventStartDate.value = ""
      eventUrl.value = '';
      eventTitle.value = '';
      eventLocation.value = '';
      allDaySwitch.checked = false;
      eventDescription.value = '';
      eventLabel.val(eventLabel.find('option[selected]').val()).trigger('change');
    }

    // When modal hides reset input values
    addEventSidebar.addEventListener('hidden.bs.offcanvas', function () {
      resetValues();
    });

    // Hide left sidebar if the right sidebar is open
    btnToggleSidebar.addEventListener('click', e => {
      if (offcanvasTitle) {
        offcanvasTitle.innerHTML = 'Adicionar Evento';
      }
      btnSubmit.innerHTML = 'Adicionar';
      btnSubmit.classList.remove('btn-update-event');
      btnSubmit.classList.add('btn-add-event');
      btnDeleteEvent.classList.add('d-none');
      appCalendarSidebar.classList.remove('show');
      appOverlay.classList.remove('show');
    });

    document.querySelector('.fc-sidebarToggle-button')?.addEventListener('click', function () {
      appCalendarSidebar.classList.add('show');
    });

    document.querySelector('.fc-sidebarFechar-button')?.addEventListener('click', function () {
      appCalendarSidebar.classList.remove('show');
    });

    // Calender filter functionality
    // ------------------------------------------------
    if (selectAll) {
      selectAll.addEventListener('click', e => {
        if (e.currentTarget.checked) {
          document.querySelectorAll('.input-filter').forEach(c => (c.checked = 1));
        } else {
          document.querySelectorAll('.input-filter').forEach(c => (c.checked = 0));
        }
        calendar.refetchEvents();
      });
    }

    if (filterInputs) {
      filterInputs.forEach(item => {
        item.addEventListener('click', () => {
          document.querySelectorAll('.input-filter:checked').length < document.querySelectorAll('.input-filter').length
            ? (selectAll.checked = false)
            : (selectAll.checked = true);
          calendar.refetchEvents();
        });
      });
    }

    // Jump to date on sidebar(inline) calendar change
    inlineCalInstance.config.onChange.push(function (date) {
      calendar.changeView(calendar.view.type, moment(date[0]).format('YYYY-MM-DD'));
      modifyToggler();
      appCalendarSidebar.classList.remove('show');
      appOverlay.classList.remove('show');
    });
  })();
});
