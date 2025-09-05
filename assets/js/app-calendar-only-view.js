'use strict';

import { endpoint } from '../../modulos/variaveisGlobais.js';
import { customAlert } from  "../../modulos/modals.js";
import { fetchComAutoRefresh } from '../../modulos/fetchComAutoRefresh.js';

const id_departamentoPagina = window.id
const tipo_departamentoPagina = window.tipo;

const telaCarregamento = document.getElementById("div-carregando-fundo");

async function carregarEventos() {
  try {
    telaCarregamento.style.display = "flex";

    const response = await fetchComAutoRefresh(endpoint + `/api/oab/calendario/carregarEventos?id_departamento=${id_departamentoPagina}&tipo_departamento=${tipo_departamentoPagina}`, {
      method: 'GET', 
      credentials: 'include'
    }, "../..");

    const data = await response.json();

    if (!response.ok || data.status !== "SUCCESS") {
      window.events = [];
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

document.addEventListener('DOMContentLoaded', async function () {

  await carregarEventos()

  const isRtl = false;

  const direction = isRtl ? 'rtl' : 'ltr';
  (function () {
    const calendarEl = document.getElementById('calendar');
    const appCalendarSidebar = document.querySelector('.app-calendar-sidebar');
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
      editable: false,
      dragScroll: false,
      dayMaxEvents: 2,
      eventResizableFromStart: false,
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
      eventClick: function (info) {
        eventClick(info);
      },
      viewDidMount: function () {
        modifyToggler();
      }
    });

    // Render calendar
    calendar.render();
    // Modify sidebar toggler
    modifyToggler();

    document.querySelector('.fc-sidebarToggle-button')?.addEventListener('click', function () {
      appCalendarSidebar.classList.add('show');
    });

    document.querySelector('.fc-sidebarFechar-button')?.addEventListener('click', function () {
      appCalendarSidebar.classList.remove('show');
    });

    // Sidebar Toggle Btn
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', e => {
        btnCancel.classList.remove('d-none');
      });
    }

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
