// Importa varivaies e objetos globais
import ProjetoMunicipioCollection from './ProjetoMunicipioCollection.js';

import { setItemWithExpiry, getItemWithExpiry } from './municipio-maps-utils.js';

import { endpoint } from '../../modulos/variaveisGlobais.js';
import { customAlert } from '../../modulos/modals.js';
import { fetchComAutoRefresh } from '../../modulos/fetchComAutoRefresh.js';

import MapsManager from '../../componentes/Maps.js';

let map;
let mapsManager;

window.limitesMunicipioPlotado = null;

const subscriptionKey = JSON.parse(localStorage.getItem("usuarioInfo")).MapsAPIKey;

const telaCarregamento = document.getElementById('div-carregando-fundo');

async function inicializarMenuProjetos() {

    projetosCollection = new ProjetoMunicipioCollection({
        endpoint,
        fetchComAutoRefresh,
        map,
        mapsManager,
        telaCarregamento,
        customAlert,
        schema:"tpt"
    });    


    // Busca os projetos do backend e instancia ProjetoMunicipioMap para cada um
    await projetosCollection.fetchProjetos();
  
    // Seleciona o UL principal onde os projetos serão inseridos
    const ulMenu = document.querySelector('.ul-municipio-maps');
    if (!ulMenu) {
      customAlert('Elemento .ul-municipio-maps não encontrado na página!');
      return;
    }
  
    // Renderiza todos os projetos no menu
    await projetosCollection.handleProjetos(ulMenu);
}

let projetosCollection;

// Define variaveis globais dos dados puxados do back-end
let dadosUnidades = {};
let dadosMunicipiosDasUnidades = {};
let dadosSetorCensitario = {};
let dadosTerrenosOportunidade = {};
let dadosConcorrentes = {};
let dadosMunicipios = {};
let dadosClientesPotenciais= {};
let dadosAreasEstudosImplantacao = {};
let dadosFacesDosLogradouros = {};
let dadosProjetosMunicipiosMaps = {};
let dadosEstruturaProjeto = {};
let dadosDasCamadas = {};
let estruturasDeMunicipiosJaMontadas = {};

// Deine variaveis globais que armazena os markers e poligonos do planejamento
let markersUnidadesMap = [];
let planejamentoMunicipiosMap = [];
let planejamentoMunicipiosShape = {};

// Deine variaveis globais que armazena os markers e poligonos das cidades estudadas
let cidadesEstudadasMap = [];
let cidadesEstudadasShape = {};
let cidadesEstudadasMapMapaCalorPopulacao = [];
let cidadesEstudadasShapeMapaCalorPopulacao = {};
let cidadesEstudadasMapMapaCalorDomicilios = [];
let cidadesEstudadasShapeMapaCalorDomicilios = {};
let cidadesEstudadasMapMapaCalorRenda = [];
let cidadesEstudadasShapeMapaCalorRenda = {};
//let cidadesEstudadasMapMapaCalorPIB = [];
//let cidadesEstudadasShapeMapaCalorPIB = {};
let markersConcorrentesMap = [];
//let cidadesEstudadasMapConcorrentes = [];
//let cidadesEstudadasShapeConcorrentes = {};
let cidadesEstudadasMapOportunidadesDeTerrenos = [];
let cidadesEstudadasShapeOportunidadesDeTerrenos = {};
let dicionarioDeShapes = {}

// Define variaveis globais que armazenam os markers de clientes potenciais
let markersClientesPotenciaisMap = [];
let cidadesClientesPotencialMap = [];
let cidadesClientesPotencialShape = {};

// Datasources adicionais
let datasourcePlanejamento, datasourcePesquisaMacroEconomica, datasourceMunicipio, datasourceOportunidadesDeTerreno, datasourcePotenciaisClientes, datasourceConcorrentes, datasourceAreasEstudosImplantacao, datasourceFacesDosLogradouros;

// Define variaveis para os graficos
let clientesSelecionados = [];
let graficoClientesPorMunicipio = null;
let graficoClientesPorRamo = null;
let graficoClientesPorCapital = null;
let graficoClientesPorPorte = null;

let exibindoId = null;

let zoomPendente;
let isSmartphone;

let estiloDoUsuario = localStorage.getItem("estiloDoMapa");

if(!estiloDoUsuario){
    localStorage.setItem("estiloDoMapa", "satellite");
    estiloDoUsuario = "satellite";
}

// === UTILITÁRIOS DE MODULARIZAÇÃO ===

// Utilitário: garante que um DataSource exista e o retorna
function ensureDataSource(sourceId) {
    let ds = map && map.sources ? map.sources.getById(sourceId) : null;
    if (!ds && typeof atlas !== 'undefined' && map) {
        ds = new atlas.source.DataSource(sourceId);
        map.sources.add(ds);
    }
    return ds;
}

// Atualiza as pílulas de camadas ativas (igual aos projetos município maps)
function updateActiveProjectLayersPills() {
    const accordionBody = document.querySelector('.accordion-body-layers-ativas');
    if (!accordionBody) return;

    accordionBody.innerHTML = '';

    const activeCheckboxes = Array.from(document.querySelectorAll('.form-check-input[type="checkbox"]:checked'))
        .filter(cb => cb.name !== 'radioEstiloMapa');

    const iconEl = document.querySelector('.fa-layer-group.hidden-mobile-icon');
    const titleEl = document.querySelector('.layers-header-title');

    if (activeCheckboxes.length === 0) {
        if (iconEl) iconEl.style.color = 'inherit';
        if (titleEl) titleEl.style.color = 'inherit';
        accordionBody.innerHTML = '<p style="margin-top: 10px; margin-bottom: 10px; margin-left: 12px;">Nenhuma camada ativa</p>';
        return;
    }

    if (iconEl) iconEl.style.color = 'var(--bs-primary)';
    if (titleEl) titleEl.style.color = 'var(--bs-primary)';

    activeCheckboxes.forEach(checkbox => {
        const label = document.querySelector(`label[for="${checkbox.id}"]`);
        if (!label) return;

        const pill = document.createElement('span');
        pill.className = 'badge bg-primary me-1 mb-1';
        pill.style.fontSize = '10px';
        pill.textContent = label.textContent.trim();
        accordionBody.appendChild(pill);
    });
}

// Remove todas as camadas ativas
function removerTodasAsCamadas() {
    // Desmarcar todos os checkboxes ativos
    const activeCheckboxes = document.querySelectorAll('.form-check-input[type="checkbox"]:checked');
    activeCheckboxes.forEach(checkbox => {
        if (checkbox.name !== 'radioEstiloMapa') {
            checkbox.click(); // Simula clique para ativar os listeners de remoção
        }
    });

    // Limpar markers globais
    if (map && map.markers) {
        map.markers.clear();
    }

    // Resetar variáveis globais
    markersUnidadesMap = [];
    planejamentoMunicipiosMap = [];
    planejamentoMunicipiosShape = {};
    cidadesEstudadasMap = [];
    cidadesEstudadasShape = {};
    cidadesEstudadasMapMapaCalorPopulacao = [];
    cidadesEstudadasShapeMapaCalorPopulacao = {};
    cidadesEstudadasMapMapaCalorDomicilios = [];
    cidadesEstudadasShapeMapaCalorDomicilios = {};
    cidadesEstudadasMapMapaCalorRenda = [];
    cidadesEstudadasShapeMapaCalorRenda = {};
    markersConcorrentesMap = [];
    cidadesEstudadasMapOportunidadesDeTerrenos = [];
    cidadesEstudadasShapeOportunidadesDeTerrenos = {};
    markersClientesPotenciaisMap = [];
    cidadesClientesPotencialMap = [];
    cidadesClientesPotencialShape = {};
    clientesSelecionados = [];
    dicionarioDeShapes = {};

    // Limpar DataSources
    const dataSourcesToClear = [
        'planejamento-datasource',
        'pesquisa-macro-economica-datasource', 
        'municipio-datasource',
        'terrenos-oportunidade-datasource',
        'clientes-potenciais-datasource',
        'concorrentes-datasource',
        'areas-estudos-implantacao-datasource',
        'faces-dos-logradouros-datasource'
    ];

    dataSourcesToClear.forEach(sourceId => {
        const source = map.sources.getById(sourceId);
        if (source && typeof source.clear === 'function') {
            source.clear();
        }
    });

    updateActiveProjectLayersPills();

    // Voltar para visão do Brasil
    if (!isSmartphone) {
        map.setCamera({
            bounds: atlas.data.BoundingBox.fromEdges(-73.99, -33.75, -34.8, 5.27),
            padding: 50,
            type: 'fly',
            duration: 1000
        });
    }
}

// Classe base para gerenciar seções do menu
class MenuSectionManager {
    constructor(sectionId, sectionName, datasourceId) {
        this.sectionId = sectionId;
        this.sectionName = sectionName;
        this.datasourceId = datasourceId;
        this.items = [];
        this.isActive = false;
    }

    // Cria elementos DOM padronizados
    createElement(tag, className = '', attributes = {}) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }

    // Cria checkbox padronizado
    createCheckbox(id, labelText, onClick) {
        const div = this.createElement('div', 'form-check', { style: 'margin-left: 10px;' });
        
        const input = this.createElement('input', 'form-check-input', {
            type: 'checkbox',
            id: id
        });
        
        const label = this.createElement('label', 'form-check-label', {
            for: id,
            style: 'font-size: 15px; color: inherit;'
        });
        label.textContent = labelText;
        
        div.appendChild(input);
        div.appendChild(label);
        
        if (onClick) {
            input.addEventListener('click', (event) => {
                onClick(event);
                // Atualizar camadas ativas após cada clique
                setTimeout(() => updateActiveProjectLayersPills(), 100);
            });
        }
        
        return { div, input, label };
    }

    // Garante DataSource para esta seção
    ensureDataSource() {
        return ensureDataSource(this.datasourceId);
    }

    // Adiciona item à seção
    addItem(item) {
        this.items.push(item);
    }

    // Remove todos os itens
    clearItems() {
        this.items = [];
    }

    // Marca seção como ativa/inativa
    setActive(active) {
        this.isActive = active;
    }
}


// Função para validar se os dados estão no formato correto
function validateData(data, expectedType = 'array') {
    if (!data) return false;
    
    if (expectedType === 'array') {
        return Array.isArray(data);
    } else if (expectedType === 'object') {
        return typeof data === 'object' && data !== null && !Array.isArray(data);
    }
    
    return true;
}

// Função que puxa os dados das unidades e define um dicionario com o estabelecimento_id como a key
async function fetchUnidades() {
    const localKey = "dadosUnidades";
    const cache = getItemWithExpiry(localKey);

    if (cache && cache !== undefined) {
        const dados = JSON.parse(cache);
        Object.values(dados).forEach(unidade => {
            dadosUnidades[unidade.estabelecimento_id] = unidade;
        });
        return;
    }

    try {
        const response = await fetchComAutoRefresh(endpoint + "/api/hiram-maps/getUnidades", {
            method: 'GET', 
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 500) {
            customAlert("Erro interno no servidor");
            return;
        }

        const dados = await response.json();
        
        if (!dados.payload) {
            console.error("Payload não encontrado na resposta");
            return;
        }
        
        setItemWithExpiry(localKey, JSON.stringify(dados.payload));

        if (validateData(dados.payload, 'array')) {
            dados.payload.forEach(unidade => {
                if (unidade && unidade.estabelecimento_id) {
                    dadosUnidades[unidade.estabelecimento_id] = unidade;
                }
            });
        } else if (validateData(dados.payload, 'object')) {
            Object.values(dados.payload).forEach(unidade => {
                if (unidade && unidade.estabelecimento_id) {
                    dadosUnidades[unidade.estabelecimento_id] = unidade;
                }
            });
        } else {
            console.warn("Formato de dados inesperado para unidades:", dados.payload);
        }
    } catch (err) {
        console.error("Erro ao realizar consulta: ", err);
    }
}

// Função que puxa os municipios que as unidades do cliente se encontra e define um dicionario com o CD_MUN como a key
async function fetchMunicipiosDasUnidades() {
    const localKey = "dadosMunicipiosDasUnidades";
    const cache = getItemWithExpiry(localKey);

    if (cache && cache !== undefined) {
        const dados = JSON.parse(cache);
        Object.values(dados).forEach(municipio => {
            dadosMunicipiosDasUnidades[municipio.CD_MUN] = municipio;
        });
        return;
    }

    try {
        const response = await fetchComAutoRefresh(endpoint + "/api/hiram-maps/getMunicipiosDasUnidades", {
            method: 'GET', 
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 500) {
            customAlert("Erro interno no servidor");
            return;
        }

        const dados = await response.json();
        setItemWithExpiry(localKey, JSON.stringify(dados.payload));

        if (Array.isArray(dados.payload)) {
            dados.payload.forEach(municipio => {
                dadosMunicipiosDasUnidades[municipio.CD_MUN] = municipio;
            });
        } else if (dados.payload && typeof dados.payload === 'object') {
            Object.values(dados.payload).forEach(municipio => {
                dadosMunicipiosDasUnidades[municipio.CD_MUN] = municipio;
            });
        }
    } catch (err) {
        console.error("Erro ao realizar consulta: ", err);
    }
}

// Função que puxa os setores censitarios e define um dicionario com o NM_MUNICIP como a key
async function fetchSetoresCensitario() {
    const localKey = "dadosSetorCensitario";
    const cache = sessionStorage.getItem(localKey);

    if (cache && cache !== undefined) {
        const dados = JSON.parse(cache);
        Object.values(dados).forEach(setor => {
            if (!dadosSetorCensitario[setor.NM_MUNICIP]) {
                dadosSetorCensitario[setor.NM_MUNICIP] = [];
            }
            dadosSetorCensitario[setor.NM_MUNICIP].push(setor);
        });
        return;
    }

    try {
        const response = await fetchComAutoRefresh(endpoint + "/api/hiram-maps/getSetorCensitario", {
            method: 'GET', 
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 500) {
            customAlert("Erro interno no servidor");
            return;
        }

        const dados = await response.json();
        sessionStorage.setItem(localKey, JSON.stringify(dados.payload));

        if (Array.isArray(dados.payload)) {
            dados.payload.forEach(setorCensitario => {
                if (!dadosSetorCensitario[setorCensitario.NM_MUNICIP]) {
                    dadosSetorCensitario[setorCensitario.NM_MUNICIP] = [];
                }
                dadosSetorCensitario[setorCensitario.NM_MUNICIP].push(setorCensitario);
            });
        } else if (dados.payload && typeof dados.payload === 'object') {
            Object.values(dados.payload).forEach(setorCensitario => {
                if (!dadosSetorCensitario[setorCensitario.NM_MUNICIP]) {
                    dadosSetorCensitario[setorCensitario.NM_MUNICIP] = [];
                }
                dadosSetorCensitario[setorCensitario.NM_MUNICIP].push(setorCensitario);
            });
        }
    } catch (err) {
        console.error("Erro ao realizar consulta: ", err);
    }
}

// Função que puxa os concorrentes e define um dicionario com o ID do concorrente como a key
async function fetchConcorrentes() {
    const localKey = "dadosConcorrentes";
    const cache = getItemWithExpiry(localKey);

    if (cache && cache !== undefined) {
        const dados = JSON.parse(cache);
        Object.values(dados).forEach(concorrente => {
            if (!dadosConcorrentes[concorrente.CD_MUN]) {
                dadosConcorrentes[concorrente.CD_MUN] = [];
            }
            dadosConcorrentes[concorrente.CD_MUN].push(concorrente);
        });
        return;
    }

    try {
        const response = await fetchComAutoRefresh(endpoint + "/api/hiram-maps/getConcorrentes", {
            method: 'GET', 
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 500) {
            customAlert("Erro interno no servidor");
            return;
        }

        const dados = await response.json();
        setItemWithExpiry(localKey, JSON.stringify(dados.payload));

        if (Array.isArray(dados.payload)) {
            dados.payload.forEach(concorrente => {
                if (!dadosConcorrentes[concorrente.CD_MUN]) {
                    dadosConcorrentes[concorrente.CD_MUN] = [];
                }
                dadosConcorrentes[concorrente.CD_MUN].push(concorrente);
            });
        } else if (dados.payload && typeof dados.payload === 'object') {
            Object.values(dados.payload).forEach(concorrente => {
                if (!dadosConcorrentes[concorrente.CD_MUN]) {
                    dadosConcorrentes[concorrente.CD_MUN] = [];
                }
                dadosConcorrentes[concorrente.CD_MUN].push(concorrente);
            });
        }
    } catch (err) {
        console.error("Erro ao realizar consulta: ", err);
    }
}

// Função que puxa os terrenos oportunidades e define um dicionario com o COD_MUN como a key
async function fetchTerrenosOportunidade() {
    const localKey = "dadosTerrenosOportunidade";
    const cache = getItemWithExpiry(localKey);

    if (cache && cache !== undefined) {
        const dados = JSON.parse(cache);
        Object.values(dados).forEach(terreno => {
            if (!dadosTerrenosOportunidade[terreno.COD_MUN]) {
                dadosTerrenosOportunidade[terreno.COD_MUN] = [];
            }
            dadosTerrenosOportunidade[terreno.COD_MUN].push(terreno);
        });
        return;
    }

    try {
        const response = await fetchComAutoRefresh(endpoint + "/api/hiram-maps/getTerrenosOportunidade", {
            method: 'GET', 
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 500) {
            customAlert("Erro interno no servidor");
            return;
        }

        const dados = await response.json();
        setItemWithExpiry(localKey, JSON.stringify(dados.payload));

        if (Array.isArray(dados.payload)) {
            dados.payload.forEach(terrenoOportunidade => {
                if (!dadosTerrenosOportunidade[terrenoOportunidade.COD_MUN]) {
                    dadosTerrenosOportunidade[terrenoOportunidade.COD_MUN] = [];
                }
                dadosTerrenosOportunidade[terrenoOportunidade.COD_MUN].push(terrenoOportunidade);
            });
        } else if (dados.payload && typeof dados.payload === 'object') {
            Object.values(dados.payload).forEach(terrenoOportunidade => {
                if (!dadosTerrenosOportunidade[terrenoOportunidade.COD_MUN]) {
                    dadosTerrenosOportunidade[terrenoOportunidade.COD_MUN] = [];
                }
                dadosTerrenosOportunidade[terrenoOportunidade.COD_MUN].push(terrenoOportunidade);
            });
        }
    } catch (err) {
        console.error("Erro ao realizar consulta: ", err);
    }
}

// Função que puxa os municipios e define um dicionario com o CD_MUN como a key
async function fetchMunicipios() {
    const localKey = "dadosMunicipios";
    const cache = getItemWithExpiry(localKey);

    if (cache && cache !== undefined) {
        const dados = JSON.parse(cache);
        Object.values(dados).forEach(municipio => {
            dadosMunicipios[municipio.CD_MUN] = municipio;
        });
        return;
    }

    try {
        const response = await fetchComAutoRefresh(endpoint + "/api/hiram-maps/getMunicipios", {
            method: 'GET', 
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 500) {
            customAlert("Erro interno no servidor");
            return;
        }

        const dados = await response.json();
        setItemWithExpiry(localKey, JSON.stringify(dados.payload));

        if (Array.isArray(dados.payload)) {
            dados.payload.forEach(municipio => {
                dadosMunicipios[municipio.CD_MUN] = municipio;
            });
        } else if (dados.payload && typeof dados.payload === 'object') {
            Object.values(dados.payload).forEach(municipio => {
                dadosMunicipios[municipio.CD_MUN] = municipio;
            });
        }
    } catch (err) {
        console.error("Erro ao realizar consulta: ", err);
    }
}

// Função que puxa os clientes potenciais e define um dicionario com o ID como a key
async function fetchClientesPotenciais() {
    const localKey = "dadosClientesPotenciais";
    const cache = getItemWithExpiry(localKey);

    if (cache && cache !== undefined) {
        const dados = JSON.parse(cache);
        Object.values(dados).forEach(cliente => {
            dadosClientesPotenciais[cliente.Id] = cliente;
        });
        return;
    }

    try {
        const response = await fetchComAutoRefresh(endpoint + "/api/hiram-maps/getClientesPotenciais", {
            method: 'GET', 
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 500) {
            customAlert("Erro interno no servidor");
            return;
        }

        const dados = await response.json();
        setItemWithExpiry(localKey, JSON.stringify(dados.payload));

        if (Array.isArray(dados.payload)) {
            dados.payload.forEach(cliente => {
                dadosClientesPotenciais[cliente.Id] = cliente;
            });
        } else if (dados.payload && typeof dados.payload === 'object') {
            Object.values(dados.payload).forEach(cliente => {
                dadosClientesPotenciais[cliente.Id] = cliente;
            });
        }
    } catch (err) {
        console.error("Erro ao realizar consulta: ", err);
    }
}

// Função que puxa os estudos de implantação e define um dicionario com o projeto como a key o numero do estudo como sub key
async function fetchAreasEstudosImplantacao() {
    try {
        const response = await fetchComAutoRefresh(endpoint + "/api/hiram-maps/getAreasEstudosImplantacao", {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 500) {
            customAlert("Erro interno no servidor ao buscar estudos de implantação.");
            return;
        }
        if (!response.ok) {
            customAlert(`Erro ao buscar estudos de implantação: ${response.statusText}`);
            return;
        }

        const dados = await response.json();
        if (!dados.payload || !Array.isArray(dados.payload)) { 
            customAlert("Payload não encontrado ou em formato inválido na resposta dos estudos de implantação.");
            return;
        }

        const arquivosUnicosPorProjeto = {};

        dados.payload.forEach(estudo => {
            if (!estudo || typeof estudo.arquivo !== 'string' || typeof estudo.projeto !== 'string') {
                console.warn("Estudo inválido ou com dados faltando, pulando:", estudo);
                return; 
            }

            const nomeProjetoDB = estudo.projeto;
            let nomeProjetoNormalizado;

            const nomeProjetoDBLower = nomeProjetoDB.toLowerCase();
            if (nomeProjetoDBLower.includes("street mall (itu)") || nomeProjetoDBLower.includes("street mall (rua japao)") || nomeProjetoDBLower === "mall" || nomeProjetoDBLower.includes("mall")) {
                nomeProjetoNormalizado = "Mall";
            } else if (nomeProjetoDBLower.includes("loteamento")) {
                nomeProjetoNormalizado = "Loteamento";
            } else if (nomeProjetoDBLower.includes("padaria")) {
                nomeProjetoNormalizado = "Padaria";
            } else {
                nomeProjetoNormalizado = nomeProjetoDB.charAt(0).toUpperCase() + nomeProjetoDB.slice(1).toLowerCase();
            }

            if (!arquivosUnicosPorProjeto[nomeProjetoNormalizado]) {
                arquivosUnicosPorProjeto[nomeProjetoNormalizado] = {};
            }

            const nomeArquivoOriginal = estudo.arquivo; 

            if (!arquivosUnicosPorProjeto[nomeProjetoNormalizado][nomeArquivoOriginal]) {
                arquivosUnicosPorProjeto[nomeProjetoNormalizado][nomeArquivoOriginal] = [];
            }
            
            arquivosUnicosPorProjeto[nomeProjetoNormalizado][nomeArquivoOriginal].push(estudo);
        });

        
        for (const nomeProjetoNormalizado in arquivosUnicosPorProjeto) {
            if (arquivosUnicosPorProjeto.hasOwnProperty(nomeProjetoNormalizado)) {
                
                const arquivosDoProjetoAgrupadosPorNome = arquivosUnicosPorProjeto[nomeProjetoNormalizado];
                
                if (!dadosAreasEstudosImplantacao[nomeProjetoNormalizado]) {
                    dadosAreasEstudosImplantacao[nomeProjetoNormalizado] = {};
                }

                const nomesArquivosUnicos = Object.keys(arquivosDoProjetoAgrupadosPorNome);

                nomesArquivosUnicos.forEach((nomeArquivoOriginal, index) => {
                    const numeroEstudo = index + 1; 
                    const chaveEstudo = `Estudo ${numeroEstudo}`; 

                    const estudosOriginaisParaEsteArquivo = arquivosDoProjetoAgrupadosPorNome[nomeArquivoOriginal];

                    if (!dadosAreasEstudosImplantacao[nomeProjetoNormalizado][chaveEstudo]) {
                        dadosAreasEstudosImplantacao[nomeProjetoNormalizado][chaveEstudo] = [];
                    }

                    estudosOriginaisParaEsteArquivo.forEach(estudoOriginal => {
                        estudoOriginal.chavePrincipal = nomeProjetoNormalizado;
                        estudoOriginal.chaveRestante = chaveEstudo;
                        dadosAreasEstudosImplantacao[nomeProjetoNormalizado][chaveEstudo].push(estudoOriginal);
                    });
                });
            }
        }

    } catch (err) {
        console.error("Erro ao processar dados de Estudos de Implantação: ", err);
        customAlert("Erro ao processar dados dos estudos de implantação.");
    }
}

async function fetchFacesDeLogradouros(municipio) {
    try {
        telaCarregamento.style.display = "flex";
        const response = await fetchComAutoRefresh(endpoint + `/api/hiram-maps/getFacesDosLogradouros?municipio=${municipio}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });        
        telaCarregamento.style.display = "none";

        if (response.status === 500) {
            customAlert("Erro interno no servidor ao buscar as faces dos logradouros.");
            return;
        }
        if (!response.ok) {
            customAlert(`Erro ao buscar as faces dos logradouros: ${response.statusText}`);
            return;
        }

        const dados = await response.json();
        if (!dados.payload || !Array.isArray(dados.payload)) { 
            customAlert("Payload não encontrado ou em formato inválido na resposta das faces dos logradouros.");
            return;
        }

        dados.payload.forEach(faceDoLogradouro => {
            if(!dadosFacesDosLogradouros[municipio]) {
                dadosFacesDosLogradouros[municipio] = [];
            }

            
            faceDoLogradouro.chavePrincipal = municipio;
            faceDoLogradouro.chaveRestante = faceDoLogradouro.id;
            dadosFacesDosLogradouros[municipio].push(faceDoLogradouro);
        });
        
    } catch (err) {
        console.error("Erro ao processar dados das faces dos logradouros: ", err);
        customAlert("Erro ao processar dados das faces dos logradouros.");
    }
}

// Função que devolve uma cor de intensidade x com base no valor passado e a paleta de cor desejada.
function getColorByIntensity(intensity, palette = 'vermelho') {
    intensity = Math.max(0, Math.min(1, intensity)); 

    let r = 0, g = 0, b = 0;

    switch (palette.toLowerCase()) {
        case 'vermelho':
            r = 255;
            g = Math.floor(255 - (255 * intensity));
            b = 0;
            break;

        case 'azul': 
            r = Math.floor(255 - (255 * intensity));
            g = Math.floor(255 - (255 * intensity));
            b = 255;
            break;

        case 'verde': 
            r = Math.floor(255 - (255 * intensity));
            g = 255;
            b = Math.floor(255 - (255 * intensity));
            break;

        case 'rosa':
            r = 255;
            g = Math.floor(255 - (128 * intensity));
            b = Math.floor(255 - (255 * intensity));
            break;

        default:
            r = 255;
            g = Math.floor(255 - (255 * intensity));
            b = 0;
            break;
    }

    return `rgb(${r},${g},${b})`;
}

// Função que recebe um vetor de cordendadas desformatado e retorna formatado em WGS84
function mercatorToWgs84([x, y]) {
    const lon = x * 180 / 20037508.34;
    const lat = (Math.atan(Math.exp(y * Math.PI / 20037508.34)) * 360 / Math.PI) - 90;
    return [lon, lat];
}

// === FUNÇÕES ANTIGAS REMOVIDAS - SUBSTITUÍDAS PELA CLASSE MODULAR ===
// As funções antigas de planejamento foram refatoradas para usar PlanejamentoManager

// === GERENCIADORES DE SEÇÕES MODULARES ===

// Gerenciador de Planejamento
class PlanejamentoManager extends MenuSectionManager {
    constructor() {
        super('planejamentoItens', 'Planejamento', 'planejamento-datasource');
        this.markersUnidades = [];
        this.municipiosShapes = {};
    }

    init() {
        const container = document.getElementById(this.sectionId);
        if (!container) return;
        
        container.innerHTML = "";
        this.ensureDataSource();
        
        // Criar opção "Todas as unidades"
        this.createTodasUnidadesOption(container);
        
        // Adicionar cada unidade
        Object.values(dadosUnidades).forEach(unidade => {
            this.createUnidadeOption(container, unidade);
        });
    }

    createTodasUnidadesOption(container) {
        const { div, input } = this.createCheckbox(
            'todas-unidades-planejamento',
            'Todas as unidades',
            (event) => this.handleTodasUnidades(event)
        );
        container.appendChild(div);
    }

    createUnidadeOption(container, dadosUnidade) {
        const { div, input } = this.createCheckbox(
            `planejamento-unidade-${dadosUnidade.estabelecimento_id}`,
            `${dadosUnidade.Unidade} - ${dadosUnidade.Cidade}`,
            (event) => this.handleUnidadeIndividual(event, dadosUnidade)
        );
        container.appendChild(div);
    }

    handleTodasUnidades(event) {
        // Implementação similar à função original initEventListenerItemTodasUnidadesPlanejamentoDropDownView
        this.markersUnidades.forEach(marker => map.markers.remove(marker));
        this.markersUnidades = [];

        Object.values(dadosMunicipiosDasUnidades).forEach(municipio => {
            if (this.municipiosShapes[municipio.CD_MUN]) {
                this.ensureDataSource().remove(this.municipiosShapes[municipio.CD_MUN]);
            }
        });
        this.municipiosShapes = {};

        const checkboxes = document.querySelectorAll('#planejamentoItens .form-check-input');

        if (!event.target.checked) {
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                if (checkbox.id !== "todas-unidades-planejamento") checkbox.disabled = false;
            });
            return;
        }

        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            if (checkbox.id !== "todas-unidades-planejamento") checkbox.disabled = true;
        });

        this.plotarTodasUnidades();
    }

    handleUnidadeIndividual(event, dadosUnidade) {
        // Implementação similar à função original initEventListenerItemPlanejamentoDropDownView
        const latitude = dadosUnidade.y;
        const longitude = dadosUnidade.x;
        const posicao = [longitude, latitude];
        const dadosMunicipio = dadosMunicipiosDasUnidades[dadosUnidade.CD_MUN];

        if (event.target.checked) {
            this.plotarUnidade(dadosUnidade, dadosMunicipio, posicao);
        } else {
            this.removerUnidade(dadosUnidade, dadosMunicipio, longitude, latitude);
        }
    }

    plotarUnidade(dadosUnidade, dadosMunicipio, posicao) {
        // Construir polígono do município se necessário
        if (!this.municipiosShapes[dadosMunicipio.CD_MUN]) {
            const coords = typeof dadosMunicipio.coord === 'string'
                ? JSON.parse(dadosMunicipio.coord)
                : dadosMunicipio.coord;

            const shape = new atlas.Shape(new atlas.data.Feature(
                new atlas.data.Polygon(coords),
                {
                    id: dadosMunicipio.CD_MUN,
                    nome: dadosMunicipio.CD_MUN,
                    cor: "#fff"
                }
            ));

            this.municipiosShapes[dadosMunicipio.CD_MUN] = shape;
            this.ensureDataSource().add(shape);

            const poligonoLayer = new atlas.layer.PolygonLayer(this.ensureDataSource(), null, {
                fillColor: ['get', 'cor'],
                fillOpacity: 0.2
            });

            const lineLayer = new atlas.layer.LineLayer(this.ensureDataSource(), null, {
                strokeColor: 'black',
                strokeWidth: 1,
                strokeDashArray: [4, 2]
            });

            map.layers.add([poligonoLayer, lineLayer]);
        }

        // Criar marker da unidade
        const marker = new atlas.HtmlMarker({
            htmlContent: "<div><div class='pin-unidade'></div></div>",
            position: posicao,
            pixelOffset: [5, -18]
        });

        marker.metadata = {
            id: dadosUnidade.estabelecimento_id,
            endereco: dadosUnidade.Endereço,
            nome: dadosUnidade.Unidade,
            nomeMun: dadosUnidade.Cidade,
            classe: dadosUnidade.Classifica,
            tamanho: dadosUnidade.Tamanho,
            fatMax: dadosUnidade.FAT_MAX,
            fatMin: dadosUnidade.FAT_MIN,
        };

        this.addMarkerEvents(marker);
        map.markers.add(marker);
        this.markersUnidades.push(marker);

        if (!isSmartphone) {
            map.setCamera({
                center: posicao,
                zoom: 12,
                type: 'fly',
                duration: 1000
            });
        }
    }

    plotarTodasUnidades() {
        let minLat = Object.values(dadosUnidades)[0].y;
        let maxLat = Object.values(dadosUnidades)[0].y;
        let minLon = Object.values(dadosUnidades)[0].x;
        let maxLon = Object.values(dadosUnidades)[0].x;

        Object.values(dadosUnidades).forEach(dadosUnidade => {
            const latitude = dadosUnidade.y;
            const longitude = dadosUnidade.x;
            const posicao = [longitude, latitude];
            const dadosMunicipio = dadosMunicipiosDasUnidades[dadosUnidade.CD_MUN];

            this.plotarUnidade(dadosUnidade, dadosMunicipio, posicao);

            minLat = Math.min(minLat, dadosUnidade.y);
            maxLat = Math.max(maxLat, dadosUnidade.y);
            minLon = Math.min(minLon, dadosUnidade.x);
            maxLon = Math.max(maxLon, dadosUnidade.x);
        });

        if (!isSmartphone) {
            map.setCamera({
                bounds: [minLon, minLat, maxLon, maxLat],
                padding: 50,
                type: 'fly',
                duration: 1000
            });
        }
    }

    removerUnidade(dadosUnidade, dadosMunicipio, longitude, latitude) {
        this.markersUnidades = this.markersUnidades.filter(marker => {
            const isThis = marker.getOptions().position[0] === longitude &&
                          marker.getOptions().position[1] === latitude;
            if (isThis) map.markers.remove(marker);
            return !isThis;
        });

        const aindaTemUnidade = Object.values(dadosUnidades).some(outraUnidade => {
            return outraUnidade.CD_MUN === dadosUnidade.CD_MUN &&
                this.markersUnidades.some(marker =>
                    marker.getOptions().position[0] === outraUnidade.x &&
                    marker.getOptions().position[1] === outraUnidade.y
                );
        });

        if (!aindaTemUnidade && this.municipiosShapes[dadosMunicipio.CD_MUN]) {
            this.ensureDataSource().remove(this.municipiosShapes[dadosMunicipio.CD_MUN]);
            delete this.municipiosShapes[dadosMunicipio.CD_MUN];
        }
    }

    addMarkerEvents(marker) {
        const markerElement = marker.getElement();

        markerElement.addEventListener('mouseenter', () => {
            map.getCanvasContainer().style.cursor = 'pointer';
            const props = marker.metadata;
            const idAtual = `dados-live-tools-infos-unidade-layer-${props.id}`;

            if (exibindoId !== idAtual) {
                document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                document.getElementById("dados-live-infos").innerHTML = "";

                const infos = document.createElement("div");
                infos.id = idAtual;
                infos.style = "margin: 10px; color: inherit";
                infos.innerHTML = `
                    Nome da unidade: ${!props.nome ? "Não informado" : props.nome} - ${!props.nomeMun ? "Não informado" : props.nomeMun}<br><br>
                    Endereço: ${!props.endereco ? "Não informado" : props.endereco} <br>
                    Classe: ${!props.classe ? "Não informado" : props.classe} <br>
                    Tamanho: ${!props.tamanho ? "Não informado" : props.tamanho} <br>
                    Faturamento mínimo em R$: ${!props.fatMin.toFixed(2) ? "Não informado" : props.fatMin.toFixed(2)} <br>
                    Faturamento máximo em R$: ${!props.fatMax.toFixed(2) ? "Não informado" : props.fatMax.toFixed(2)} <br>
                `;

                document.getElementById("dados-live-infos").appendChild(infos);
                exibindoId = idAtual;
            }
        });

        markerElement.addEventListener('mouseleave', () => {
            if (exibindoId) {
                const el = document.getElementById(exibindoId);
                if (el) el.remove();
                exibindoId = null;
                document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                map.getCanvasContainer().style.cursor = '';
            }
        });
    }
}

// Instância global do gerenciador de planejamento
let planejamentoManager;

// Função que faz o handle da parte de planejamento (refatorada)
function handlePlanejamento() {
    planejamentoManager = new PlanejamentoManager();
    planejamentoManager.init();
}

// Função que limpa o municipio
function limparMapaPorCodigoMunicipio(CD_MUN, datasourceSelecionado) {
    if (cidadesEstudadasMapMapaCalorPopulacao[CD_MUN]) {
        cidadesEstudadasMapMapaCalorPopulacao[CD_MUN].forEach(layer => map.layers.remove(layer));
        cidadesEstudadasMapMapaCalorPopulacao[CD_MUN] = [];
    }

    Object.values(cidadesEstudadasShapeMapaCalorPopulacao[CD_MUN] || {}).forEach(shape => datasourceSelecionado.remove(shape));
    cidadesEstudadasShapeMapaCalorPopulacao[CD_MUN] = {};

    if (cidadesEstudadasMapMapaCalorDomicilios[CD_MUN]) {
        cidadesEstudadasMapMapaCalorDomicilios[CD_MUN].forEach(layer => map.layers.remove(layer));
        cidadesEstudadasMapMapaCalorDomicilios[CD_MUN] = [];
    }

    Object.values(cidadesEstudadasShapeMapaCalorDomicilios[CD_MUN] || {}).forEach(shape => datasourceSelecionado.remove(shape));
    cidadesEstudadasShapeMapaCalorDomicilios[CD_MUN] = {};

    if (cidadesEstudadasMapMapaCalorRenda[CD_MUN]) {
        cidadesEstudadasMapMapaCalorRenda[CD_MUN].forEach(layer => map.layers.remove(layer));
        cidadesEstudadasMapMapaCalorRenda[CD_MUN] = [];
    }

    Object.values(cidadesEstudadasShapeMapaCalorRenda[CD_MUN] || {}).forEach(shape => datasourceSelecionado.remove(shape));
    cidadesEstudadasShapeMapaCalorRenda[CD_MUN] = {};
}

function addOptionMunicipioEstudadosDropDownView(dropDownView, dadosMunicipio) {
    const municipioItem = document.createElement("div");
    municipioItem.classList.add(`funcoes-${dadosMunicipio.NM_MUN}`);

    municipioItem.innerHTML = `
        <div style="width: 100%; padding-inline: 10px;" id="div-${dadosMunicipio.CD_MUN}">
            <label class="form-check-label d-flex align-items-center" style="color: inherit; cursor: pointer;" data-bs-toggle="collapse" href="#cidades-estudadas-${dadosMunicipio.CD_MUN}" role="button" aria-expanded="false" aria-controls="cidades-estudadas-${dadosMunicipio.NM_MUN}">
                <i class="fa-solid fa-caret-right indicator" style="margin-right: 10px;"></i>${dadosMunicipio.NM_MUN}
            </label>

            <div class="collapse ms-4 mt-2" id="cidades-estudadas-${dadosMunicipio.CD_MUN}">

                <div class="form-check" style="margin-left: 10px;">
                    <input class="form-check-input" type="checkbox" id="exibir-poligono-${dadosMunicipio.CD_MUN}">
                    <label class="form-check-label" for="exibir-poligono-${dadosMunicipio.CD_MUN}" style="font-size: 15px; color: inherit;">Exibir área da cidade</label>
                </div> 

                <div style="width: 100%; padding-inline: 10px;" id="div-pesquisa-macroeconomica-${dadosMunicipio.CD_MUN}">
                    <label class="form-check-label d-flex align-items-center" style="color: inherit; cursor: pointer;" data-bs-toggle="collapse" href="#pesquisa-macroeconomica-${dadosMunicipio.CD_MUN}" role="button" aria-expanded="false" aria-controls="pesquisa-macroeconomica-${dadosMunicipio.CD_MUN}">
                        <i class="fa-solid fa-caret-right indicator" style="margin-right: 10px;"></i>1. Pesquisa - Macroecônomica
                    </label>

                    <div class="collapse ms-4 mt-2" id="pesquisa-macroeconomica-${dadosMunicipio.CD_MUN}">
                        
                        <div class="form-check" style="margin-left: 10px;">
                            <input class="form-check-input" type="checkbox" id="populacao-heat-map-${dadosMunicipio.CD_MUN}">
                            <label class="form-check-label" for="populacao-heat-map-${dadosMunicipio.CD_MUN}" style="font-size: 15px; color: inherit;">1.1 População</label>
                        </div> 

                        <div class="form-check" style="margin-left: 10px;">
                            <input class="form-check-input" type="checkbox" id="domicilios-heat-map-${dadosMunicipio.CD_MUN}">
                            <label class="form-check-label" for="domicilios-heat-map-${dadosMunicipio.CD_MUN}" style="font-size: 15px; color: inherit;">1.2 Domicílios</label>
                        </div> 

                        <div class="form-check" style="margin-left: 10px;">
                            <input class="form-check-input" type="checkbox" id="renda-heat-map-${dadosMunicipio.CD_MUN}">
                            <label class="form-check-label" for="renda-heat-map-${dadosMunicipio.CD_MUN}" style="font-size: 15px; color: inherit;">1.3 Renda</label>
                        </div> 

                        <div class="form-check" style="margin-left: 10px; margin-botton: 10px;">
                            <input class="form-check-input" type="checkbox" id="pib-heat-map-${dadosMunicipio.CD_MUN}" disabled>
                            <label class="form-check-label" for="pib-heat-map-${dadosMunicipio.CD_MUN}" style="font-size: 15px; color: inherit;">1.4 PIB</label>
                        </div> 
                    </div>
                </div> 

                <div style="width: 100%; padding-inline: 10px;" id="div-pesquisa-potencial-mercado-${dadosMunicipio.CD_MUN}">
                    <label class="form-check-label d-flex align-items-center" style="color: inherit; cursor: pointer;" data-bs-toggle="collapse" href="#pesquisa-potencial-mercado-${dadosMunicipio.CD_MUN}" role="button" aria-expanded="false" aria-controls="pesquisa-potencial-mercado-${dadosMunicipio.CD_MUN}">
                        <i class="fa-solid fa-caret-right indicator" style="margin-right: 10px;"></i>2. Pesquisa - Potencial de Mercado
                    </label>

                    <div class="collapse ms-4 mt-2" id="pesquisa-potencial-mercado-${dadosMunicipio.CD_MUN}">
                        
                    </div>
                </div> 

                <div style="width: 100%; padding-inline: 10px;" id="div-pesquisa-market-share-${dadosMunicipio.CD_MUN}">
                    <label class="form-check-label d-flex align-items-center" style="color: inherit; cursor: pointer;" data-bs-toggle="collapse" href="#pesquisa-market-share-${dadosMunicipio.CD_MUN}" role="button" aria-expanded="false" aria-controls="pesquisa-market-share-${dadosMunicipio.CD_MUN}">
                        <i class="fa-solid fa-caret-right indicator" style="margin-right: 10px;"></i>3. Pesquisa - Market Share
                    </label>

                    <div class="collapse ms-4 mt-2" id="pesquisa-market-share-${dadosMunicipio.CD_MUN}">

                    </div>
                </div> 

                <div style="width: 100%; padding-inline: 10px;" id="div-pesquisa-indicadores-de-cluster-${dadosMunicipio.CD_MUN}">
                    <label class="form-check-label d-flex align-items-center" style="color: inherit; cursor: pointer;" data-bs-toggle="collapse" href="#pesquisa-indicadores-de-cluster-${dadosMunicipio.CD_MUN}" role="button" aria-expanded="false" aria-controls="pesquisa-indicadores-de-cluster-${dadosMunicipio.CD_MUN}">
                        <i class="fa-solid fa-caret-right indicator" style="margin-right: 10px;"></i>4. Pesquisa - Indicadores de Cluster
                    </label>

                    <div class="collapse ms-4 mt-2" id="pesquisa-indicadores-de-cluster-${dadosMunicipio.CD_MUN}">

                        <div class="form-check" style="margin-left: 10px;">
                            <input class="form-check-input" type="checkbox" id="exibir-potencial-de-consumo-${dadosMunicipio.CD_MUN}" disabled>
                            <label class="form-check-label" for="exibir-potencial-de-consumo-${dadosMunicipio.CD_MUN}" style="font-size: 15px; color: inherit;">4.1 Potencial de Consumo</label>
                        </div> 

                        <div style="width: 100%; padding-inline: 10px;" id="div-concorrentes-${dadosMunicipio.CD_MUN}">
                    
                            <label class="form-check-label d-flex align-items-center" style="color: inherit; cursor: pointer;" data-bs-toggle="collapse" href="#concorrentes-${dadosMunicipio.CD_MUN}" role="button" aria-expanded="false" aria-controls="concorrentes-${dadosMunicipio.CD_MUN}">
                                <i class="fa-solid fa-caret-right indicator" style="margin-right: 10px;"></i>4.2 Concorrentes
                            </label>

                            <div class="collapse ms-4 mt-2" id="concorrentes-${dadosMunicipio.CD_MUN}">

                                <div class="form-check" style="margin-left: 10px;">
                                    <input class="form-check-input" type="checkbox" id="exibir-todos-os-concorrentes-${dadosMunicipio.CD_MUN}">
                                    <label class="form-check-label" for="exibir-todos-os-concorrentes-${dadosMunicipio.CD_MUN}" style="font-size: 15px; color: inherit;">Todos os concorrentes</label>
                                </div> 

                            </div>
                        </div> 

                    </div>
                </div> 

                <div style="width: 100%; padding-inline: 10px;" id="div-oportunidades-de-negocio-${dadosMunicipio.CD_MUN}">
                    <label class="form-check-label d-flex align-items-center" style="color: inherit; cursor: pointer;" data-bs-toggle="collapse" href="#oportunidades-de-negocio-${dadosMunicipio.CD_MUN}" role="button" aria-expanded="false" aria-controls="oportunidades-de-negocio-${dadosMunicipio.CD_MUN}">
                        <i class="fa-solid fa-caret-right indicator" style="margin-right: 10px;"></i>5. Oportunidades de Negócio
                    </label>

                    <div class="collapse ms-4 mt-2" id="oportunidades-de-negocio-${dadosMunicipio.CD_MUN}">

                        <div style="width: 100%; padding-inline: 10px;" id="div-oportunidades-de-terreno-${dadosMunicipio.CD_MUN}">
                    
                            <label class="form-check-label d-flex align-items-center" style="color: inherit; cursor: pointer;" data-bs-toggle="collapse" href="#oportunidades-de-terreno-${dadosMunicipio.CD_MUN}" role="button" aria-expanded="false" aria-controls="oportunidades-de-terreno-${dadosMunicipio.CD_MUN}">
                                <i class="fa-solid fa-caret-right indicator" style="margin-right: 10px;"></i>5.1 Oportunidades de Terreno
                            </label>

                            <div class="collapse ms-4 mt-2" id="oportunidades-de-terreno-${dadosMunicipio.CD_MUN}">

                                <div class="form-check" style="margin-left: 10px;">
                                    <input class="form-check-input" type="checkbox" id="exibir-todos-os-terrenos-${dadosMunicipio.CD_MUN}">
                                    <label class="form-check-label" for="exibir-todos-os-terrenos-${dadosMunicipio.CD_MUN}" style="font-size: 15px; color: inherit;">Todos os terrenos</label>
                                </div> 

                            </div>
                        </div> 

                    </div>
                </div> 

            </div>
        </div> 
    `;

    dropDownView.appendChild(municipioItem);

    municipioItem.querySelector(`#exibir-poligono-${dadosMunicipio.CD_MUN}`).addEventListener("click", (event) => {        
        if (event.target.checked) {
            if (!cidadesEstudadasShape[dadosMunicipio.CD_MUN]) {
                const dicionarioDadosMunicipio = { 
                    id: dadosMunicipio.CD_MUN, 
                    nome: dadosMunicipio.NM_MUN,
                    coord: dadosMunicipio.coord
                }   

                const coords = typeof dicionarioDadosMunicipio.coord === 'string'
                    ? JSON.parse(dicionarioDadosMunicipio.coord)
                    : dicionarioDadosMunicipio.coord;

                const shape = new atlas.Shape(new atlas.data.Feature(
                    new atlas.data.Polygon(coords),
                    {
                        id: dicionarioDadosMunicipio.id,
                        nome: dicionarioDadosMunicipio.nome,
                        cor: "#fff",                        
                        area_km2: dadosMunicipio.AREA_KM2
                    }
                ), dicionarioDadosMunicipio.id)

                cidadesEstudadasShape[dicionarioDadosMunicipio.id] = shape;
                datasourceMunicipio.add(shape);

                const layerId = 'layer-poligono-' + dadosMunicipio.CD_MUN;

                const poligonoLayer = new atlas.layer.PolygonLayer(datasourceMunicipio, layerId, {
                    fillColor: ['get', 'cor'], 
                    fillOpacity: 0.2
                });

                const lineLayer = new atlas.layer.LineLayer(datasourceMunicipio, null, {
                    strokeColor: 'black',
                    strokeWidth: 1,
                    strokeDashArray: [4, 2]
                });
                
                map.layers.add([poligonoLayer, lineLayer]);

                // Evento de mousemove para exibir os dados
                map.events.add('mousemove', poligonoLayer, function (e) {
                    if (e.shapes && e.shapes.length > 0) {
                        map.getCanvasContainer().style.cursor = 'pointer';
                
                        const shape = e.shapes[0];
                        const props = shape.getProperties();
                        
                        const idAtual = `dados-live-tools-infos-municipio-layer-${props.id}`;

                        if (exibindoId !== idAtual) {
                            document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                            document.getElementById("dados-live-infos").innerHTML = "";

                            const infos = document.createElement("div");
                            infos.id = idAtual;
                            infos.style = "margin: 10px; color: inherit";
                            infos.innerHTML = `
                                ${!props.nome ? "Não informado" : props.nome} <br><br>
                                Área em KM²: ${!props.area_km2 ? "Não informado" : props.area_km2}
                            `;

                            document.getElementById("dados-live-infos").appendChild(infos);
                            exibindoId = idAtual;
                        }
                    }
                });

                // Evento de mouseout para remover os dados
                map.events.add('mouseout', poligonoLayer, function (e) {
                    // Limpa apenas se houver shape sendo exibido
                    if (exibindoId) {
                        const elemento = document.getElementById(exibindoId);
                        if (elemento) {
                            elemento.remove();
                        }

                        exibindoId = null;
                        document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                        map.getCanvasContainer().style.cursor = '';
                    }
                });        
                
                cidadesEstudadasMap.push(poligonoLayer, lineLayer);

                if(!isSmartphone) {
                    map.setCamera({
                        bounds: shape.getBounds(),
                        padding: 50,
                        type: 'fly',
                        duration: 1000 
                    });
                }
            }
        } else {
            if (cidadesEstudadasShape[dadosMunicipio.CD_MUN]) {
                datasourceMunicipio.remove(cidadesEstudadasShape[dadosMunicipio.CD_MUN]);
                delete cidadesEstudadasShape[dadosMunicipio.CD_MUN];
            }            
        }
        updateActiveProjectLayersPills();
    }); 

    municipioItem.querySelector(`#populacao-heat-map-${dadosMunicipio.CD_MUN}`).addEventListener("click", (event) => {   
        //document.getElementById(`populacao-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;
        document.getElementById(`domicilios-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;
        document.getElementById(`renda-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;
        document.getElementById(`pib-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;

        limparMapaPorCodigoMunicipio(dadosMunicipio.CD_MUN, datasourcePesquisaMacroEconomica);

        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;

        if (event.target.checked) {
            const setores = dadosSetorCensitario[dadosMunicipio.NM_MUN.toUpperCase()];
            
            const maxPop = Math.max(...setores.map(s => s.F_POP_EST_));
            const minPop = Math.min(...setores.map(s => s.F_POP_EST_));

            setores.forEach(setor => {
                const coords = typeof setor.coord === 'string' ? JSON.parse(setor.coord) : setor.coord;
                const coordsWGS84 = coords.map(ring => ring.map(mercatorToWgs84));

                coordsWGS84[0].forEach(([lon, lat]) => {
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                    minLon = Math.min(minLon, lon);
                    maxLon = Math.max(maxLon, lon);
                });

                const intensidade = (setor.F_POP_EST_ - minPop) / (maxPop - minPop);
                const cor = getColorByIntensity(intensidade, 'vermelho');

                const shape = new atlas.Shape(new atlas.data.Feature(
                    new atlas.data.Polygon(coordsWGS84),
                    {
                        id: setor.FID,
                        nomeMun: setor.NM_MUNICIP,
                        cor: cor,
                        area: setor.Shape__Are,
                        comprimento: setor.Shape__Len,
                        tipo: setor.TIPO,
                        populacao: setor.F_POP_EST_,
                        rendMean: setor.F_REND_EST,
                        domicilios: setor.F_DOM_EST_,
                        gastoMensal: setor.F_GASTO_ME,
                    }
                ));

                if (!cidadesEstudadasShapeMapaCalorPopulacao[dadosMunicipio.CD_MUN])
                    cidadesEstudadasShapeMapaCalorPopulacao[dadosMunicipio.CD_MUN] = {};

                cidadesEstudadasShapeMapaCalorPopulacao[dadosMunicipio.CD_MUN][setor.FID] = shape;
                datasourcePesquisaMacroEconomica.add(shape);
            });

            const poligonoLayer = new atlas.layer.PolygonLayer(datasourcePesquisaMacroEconomica, null, {
                fillColor: ['get', 'cor'],
                fillOpacity: 0.2
            });

            const lineLayer = new atlas.layer.LineLayer(datasourcePesquisaMacroEconomica, null, {
                strokeColor: 'black',
                strokeWidth: 1,
                strokeDashArray: [4, 2]
            });

            map.layers.add([poligonoLayer, lineLayer]);

            map.events.add('mousemove', poligonoLayer, function (e) {
                if (e.shapes && e.shapes.length > 0) {
                    map.getCanvasContainer().style.cursor = 'pointer';

                    const shape = e.shapes[0];
                    const props = shape.getProperties();
                    const idAtual = `dados-live-tools-infos-populacao-layer-${props.id}`;

                    if (exibindoId !== idAtual) {
                        document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                        document.getElementById("dados-live-infos").innerHTML = "";

                        const infos = document.createElement("div");
                        infos.id = idAtual;
                        infos.style = "margin: 10px; color: inherit";
                        infos.innerHTML = `
                            Município: ${!props.nomeMun ? "Não informado" : props.nomeMun} <br><br>
                            Setor censitário ID: ${!props.id ? "Não informado" : props.id} <br>
                            Área em M²: ${!props.area ? "Não informado" : props.area.toFixed(2)} <br>
                            Comprimento em M²: ${!props.comprimento ? "Não informado" : props.comprimento.toFixed(2)} <br>
                            QTD Habitantes: ${!props.populacao ? "Não informado" : props.populacao} <br>
                        `;

                        document.getElementById("dados-live-infos").appendChild(infos);
                        exibindoId = idAtual;
                    }
                }
            });

            map.events.add('mouseout', poligonoLayer, function (e) {
                if (exibindoId) {
                    const el = document.getElementById(exibindoId);
                    if (el) el.remove();

                    exibindoId = null;
                    document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                    map.getCanvasContainer().style.cursor = '';
                }
            });

            cidadesEstudadasMapMapaCalorPopulacao[dadosMunicipio.CD_MUN] = [poligonoLayer, lineLayer];

            if(!isSmartphone) {
                map.setCamera({
                    bounds: [minLon, minLat, maxLon, maxLat],
                    padding: 50,
                    type: 'fly',
                    duration: 1000 
                });
            }
        }
        updateActiveProjectLayersPills();
    });

    municipioItem.querySelector(`#domicilios-heat-map-${dadosMunicipio.CD_MUN}`).addEventListener("click", (event) => {
        document.getElementById(`populacao-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;
        //document.getElementById(`domicilios-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;
        document.getElementById(`renda-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;
        document.getElementById(`pib-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;

        limparMapaPorCodigoMunicipio(dadosMunicipio.CD_MUN, datasourcePesquisaMacroEconomica);

        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;

        if (event.target.checked) {
            const setores = dadosSetorCensitario[dadosMunicipio.NM_MUN.toUpperCase()];

            const maxDom = Math.max(...setores.map(s => s.F_DOM_EST_));
            const minDom = Math.min(...setores.map(s => s.F_DOM_EST_));

            setores.forEach((setor) => {
                const coords = typeof setor.coord === 'string' ? JSON.parse(setor.coord) : setor.coord;
                const coordsWGS84 = coords.map(ring => ring.map(mercatorToWgs84));

                coordsWGS84[0].forEach(([lon, lat]) => {
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                    minLon = Math.min(minLon, lon);
                    maxLon = Math.max(maxLon, lon);
                });

                const intensidade = (setor.F_DOM_EST_ - minDom) / (maxDom - minDom);
                const cor = getColorByIntensity(intensidade, 'azul');

                const shape = new atlas.Shape(new atlas.data.Feature(
                    new atlas.data.Polygon(coordsWGS84),
                    {
                        id: setor.FID,
                        nomeMun: setor.NM_MUNICIP,
                        cor: cor,
                        area: setor.Shape__Are,
                        comprimento: setor.Shape__Len,
                        tipo: setor.TIPO,
                        populacao: setor.F_POP_EST_,
                        rendMean: setor.F_REND_EST,
                        domicilios: setor.F_DOM_EST_,
                        gastoMensal: setor.F_GASTO_ME,
                    }
                ));

                if (!cidadesEstudadasShapeMapaCalorDomicilios[dadosMunicipio.CD_MUN])
                    cidadesEstudadasShapeMapaCalorDomicilios[dadosMunicipio.CD_MUN] = {};

                cidadesEstudadasShapeMapaCalorDomicilios[dadosMunicipio.CD_MUN][setor.FID] = shape;
                datasourcePesquisaMacroEconomica.add(shape);
            });

            const poligonoLayer = new atlas.layer.PolygonLayer(datasourcePesquisaMacroEconomica, null, {
                fillColor: ['get', 'cor'],
                fillOpacity: 0.2
            });

            const lineLayer = new atlas.layer.LineLayer(datasourcePesquisaMacroEconomica, null, {
                strokeColor: 'black',
                strokeWidth: 1,
                strokeDashArray: [4, 2]
            });

            map.layers.add([poligonoLayer, lineLayer]);

            map.events.add('mousemove', poligonoLayer, function (e) {
                if (e.shapes && e.shapes.length > 0) {
                    map.getCanvasContainer().style.cursor = 'pointer';

                    const shape = e.shapes[0];
                    const props = shape.getProperties();
                    const idAtual = `dados-live-tools-infos-domicilios-layer-${props.id}`;

                    if (exibindoId !== idAtual) {
                        document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                        document.getElementById("dados-live-infos").innerHTML = "";

                        const infos = document.createElement("div");
                        infos.id = idAtual;
                        infos.style = "margin: 10px; color: inherit";
                        infos.innerHTML = `
                            Município: ${!props.nomeMun ? "Não informado" : props.nomeMun} <br><br>
                            Setor censitário ID: ${!props.id && props.id !== 0 ? "Não informado" : props.id} <br>
                            Área em M²: ${!props.area && props.area !== 0 ? "Não informado" : Number(props.area).toFixed(2)} <br>
                            Comprimento em M²: ${!props.comprimento && props.comprimento !== 0 ? "Não informado" : Number(props.comprimento).toFixed(2)} <br>
                            QTD Domicílios: ${!props.domicilios && props.domicilios !== 0 ? "Não informado" : props.domicilios} <br>

                        `;

                        document.getElementById("dados-live-infos").appendChild(infos);
                        exibindoId = idAtual;
                    }
                }
            });

            map.events.add('mouseout', poligonoLayer, function (e) {
                if (exibindoId) {
                    const el = document.getElementById(exibindoId);
                    if (el) el.remove();

                    exibindoId = null;
                    document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                    map.getCanvasContainer().style.cursor = '';
                }
            });

            cidadesEstudadasMapMapaCalorDomicilios[dadosMunicipio.CD_MUN] = [poligonoLayer, lineLayer];

            if(!isSmartphone) {
                map.setCamera({
                    bounds: [minLon, minLat, maxLon, maxLat],
                    padding: 50,
                    type: 'fly',
                    duration: 1000 
                });
            }
        }
        updateActiveProjectLayersPills();      
    }); 

    municipioItem.querySelector(`#renda-heat-map-${dadosMunicipio.CD_MUN}`).addEventListener("click", (event) => {
        document.getElementById(`populacao-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;
        document.getElementById(`domicilios-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;
        //document.getElementById(`renda-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;
        document.getElementById(`pib-heat-map-${dadosMunicipio.CD_MUN}`).checked = false;

        limparMapaPorCodigoMunicipio(dadosMunicipio.CD_MUN, datasourcePesquisaMacroEconomica);

        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;

        if (event.target.checked) {
            const setores = dadosSetorCensitario[dadosMunicipio.NM_MUN.toUpperCase()];

            const maxRenda = Math.max(...setores.map(s => s.F_REND_EST));
            const minRenda = Math.min(...setores.map(s => s.F_REND_EST));

            setores.forEach(setor => {
                const coords = typeof setor.coord === 'string' ? JSON.parse(setor.coord) : setor.coord;
                const coordsWGS84 = coords.map(ring => ring.map(mercatorToWgs84));

                coordsWGS84[0].forEach(([lon, lat]) => {
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                    minLon = Math.min(minLon, lon);
                    maxLon = Math.max(maxLon, lon);
                });

                const intensidade = (setor.F_REND_EST - minRenda) / (maxRenda - minRenda);
                const cor = getColorByIntensity(intensidade, 'verde');

                const shape = new atlas.Shape(new atlas.data.Feature(
                    new atlas.data.Polygon(coordsWGS84),
                    {
                        id: setor.FID,
                        nomeMun: setor.NM_MUNICIP,
                        cor: cor,
                        area: setor.Shape__Are,
                        comprimento: setor.Shape__Len,
                        tipo: setor.TIPO,
                        populacao: setor.F_POP_EST_,
                        rendMean: setor.F_REND_EST,
                        domicilios: setor.F_DOM_EST_,
                        gastoMensal: setor.F_GASTO_ME,
                    }
                ));

                if (!cidadesEstudadasShapeMapaCalorRenda[dadosMunicipio.CD_MUN])
                    cidadesEstudadasShapeMapaCalorRenda[dadosMunicipio.CD_MUN] = {};

                cidadesEstudadasShapeMapaCalorRenda[dadosMunicipio.CD_MUN][setor.FID] = shape;
                datasourcePesquisaMacroEconomica.add(shape);
            });

            const poligonoLayer = new atlas.layer.PolygonLayer(datasourcePesquisaMacroEconomica, null, {
                fillColor: ['get', 'cor'],
                fillOpacity: 0.2
            });

            const lineLayer = new atlas.layer.LineLayer(datasourcePesquisaMacroEconomica, null, {
                strokeColor: 'black',
                strokeWidth: 1,
                strokeDashArray: [4, 2]
            });

            map.layers.add([poligonoLayer, lineLayer]);

            map.events.add('mousemove', poligonoLayer, function (e) {
                if (e.shapes && e.shapes.length > 0) {
                    map.getCanvasContainer().style.cursor = 'pointer';

                    const shape = e.shapes[0];
                    const props = shape.getProperties();
                    const idAtual = `dados-live-tools-infos-renda-layer-${props.id}`;

                    if (exibindoId !== idAtual) {
                        document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                        document.getElementById("dados-live-infos").innerHTML = "";

                        const infos = document.createElement("div");
                        infos.id = idAtual;
                        infos.style = "margin: 10px; color: inherit";
                        infos.innerHTML = `
                            Municipio: ${!props.nomeMun ? "Não informado" : props.nomeMun} <br><br>
                            Setor censitário ID: ${!props.id && props.id !== 0 ? "Não informado" : props.id} <br>
                            Área em M²: ${!props.area ? "Não informado" : Number(props.area).toFixed(2)} <br>
                            Comprimento em M²: ${!props.comprimento ? "Não informado" : Number(props.comprimento).toFixed(2)} <br>
                            Renda média mensal em R$: ${!props.rendMean ? "Não informado" : Number(props.rendMean).toFixed(2)} <br>
                        `;

                        document.getElementById("dados-live-infos").appendChild(infos);
                        exibindoId = idAtual;
                    }
                }
            });

            map.events.add('mouseout', poligonoLayer, function (e) {
                if (exibindoId) {
                    const el = document.getElementById(exibindoId);
                    if (el) el.remove();

                    exibindoId = null;
                    document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                    map.getCanvasContainer().style.cursor = '';
                }
            });

            cidadesEstudadasMapMapaCalorRenda[dadosMunicipio.CD_MUN] = [poligonoLayer, lineLayer];

            if(!isSmartphone) {
                map.setCamera({
                    bounds: [minLon, minLat, maxLon, maxLat],
                    padding: 50,
                    type: 'fly',
                    duration: 1000 
                });
            }
        }
        updateActiveProjectLayersPills();      
    }); 

    municipioItem.querySelector(`#exibir-todos-os-terrenos-${dadosMunicipio.CD_MUN}`).addEventListener("click", (event) => { 
        
        const terrenos = dadosTerrenosOportunidade[dadosMunicipio.CD_MUN];

        terrenos.forEach(terreno => {
            if (cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN]) {
                if(cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][[`circle-${terreno.ID}`]]){
                    datasourceOportunidadesDeTerreno.remove(cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][`circle-${terreno.ID}`]);
                    delete cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][`circle-${terreno.ID}`];
                }
            }
        });

        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;
        
        const checkboxes = document.querySelectorAll(`#oportunidades-de-terreno-${dadosMunicipio.CD_MUN} .form-check-input`);

        if (event.target.checked) {

            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
                if(checkbox.id !== `exibir-todos-os-terrenos-${dadosMunicipio.CD_MUN}`) checkbox.disabled = true;
            });

            terrenos.forEach(terreno => {
                const coords = typeof terreno.coord === 'string' ? JSON.parse(terreno.coord) : terreno.coord;

                coords[0].forEach(([lon, lat]) => {
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                    minLon = Math.min(minLon, lon);
                    maxLon = Math.max(maxLon, lon);
                });

                const shape = new atlas.Shape(new atlas.data.Feature(
                    new atlas.data.Polygon(coords),
                    {
                        id: terreno.ID,
                        nome: terreno.Name,
                        cor: "#ff0000",
                        tipo: terreno.TIPO,
                        area: terreno.METRAGEM,
                        endereco: terreno.ENDERECO,
                        valorVenda: terreno.VALOR_VEND,
                        valorAluguel: terreno.VALOR_ALUG,
                        contato: terreno.CONTATO,
                        imobiliaria: terreno.IMOBILIAR,
                        status: terreno.STATUS,
                        pupulacao: terreno.POPULACA,
                        domicilios: terreno.DOMICILIOS,
                        rendaMean: terreno.RENDA_MED,
                        potencial: terreno.POTENCIAL_,
                        absolvido: terreno.ABSOLVIDO_,
                        livre: terreno.LIVRE
                    }
                ));

                if (!cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN])
                    cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN] = {};

                if(!cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][terreno.ID]) {
                    cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][terreno.ID] = {}
                }  
                
                cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][terreno.ID] = shape;
                datasourceOportunidadesDeTerreno.add(shape);
            });

            const poligonoLayer = new atlas.layer.PolygonLayer(datasourceOportunidadesDeTerreno, null, {
                fillColor: ['get', 'cor'],
                fillOpacity: 1
            });

            const lineLayer = new atlas.layer.LineLayer(datasourceOportunidadesDeTerreno, null, {
                strokeColor: 'black',
                strokeWidth: 1,
                strokeDashArray: [4, 2]
            });

            map.layers.add([poligonoLayer, lineLayer]);

            map.events.add('mousemove', poligonoLayer, function (e) {
                if (e.shapes && e.shapes.length > 0) {
                    map.getCanvasContainer().style.cursor = 'pointer';

                    const shape = e.shapes[0];
                    const props = shape.getProperties();
                    const idAtual = `dados-live-tools-infos-terreno-layer-${props.id}`;

                    if (exibindoId !== idAtual) {
                        document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                        document.getElementById("dados-live-infos").innerHTML = "";

                        const infos = document.createElement("div");
                        infos.id = idAtual;
                        infos.style = "margin: 10px; color: inherit";
                        infos.innerHTML = `
                            Nome do terreno: ${!props.nome ? "Não informado" : props.nome} <br><br>
                            Endereço: ${!props.endereco ? "Não informado" : props.endereco} <br>
                            Tipo: ${!props.tipo ? "Não informado" : props.tipo} <br>
                            Metragem em M²: ${!props.area ? "Não informado" : props.area} <br>
                            Valor de venda em R$: ${!props.valorVenda ? "Não informado" : props.valorVenda} <br>
                            Valor de aluguel em R$: ${!props.valorAluguel ? "Não informado" : props.valorAluguel} <br>
                            Potencial livre em R$: ${!props.livre ? "Não informado" : props.livre} <br>
                        `;

                        document.getElementById("dados-live-infos").appendChild(infos);
                        exibindoId = idAtual;
                    }
                }
            });

            map.events.add('mouseout', poligonoLayer, function (e) {
                if (exibindoId) {
                    const el = document.getElementById(exibindoId);
                    if (el) el.remove();

                    exibindoId = null;
                    document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                    map.getCanvasContainer().style.cursor = '';
                }
            });

            cidadesEstudadasMapOportunidadesDeTerrenos[dadosMunicipio.CD_MUN] = [poligonoLayer, lineLayer];

            if(!isSmartphone) {
                map.setCamera({
                    bounds: [minLon, minLat, maxLon, maxLat],
                    padding: 50,
                    type: 'fly',
                    duration: 1000 
                });
            }
        } else {
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                if(checkbox.id !== `exibir-todos-os-terrenos-${dadosMunicipio.CD_MUN}`) checkbox.disabled = false;
            });

            if (cidadesEstudadasMapOportunidadesDeTerrenos[dadosMunicipio.CD_MUN]) {
                cidadesEstudadasMapOportunidadesDeTerrenos[dadosMunicipio.CD_MUN].forEach(layer => map.layers.remove(layer));
                cidadesEstudadasMapOportunidadesDeTerrenos = [];
            }

            Object.values(cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN] || {}).forEach(shape => datasourceOportunidadesDeTerreno.remove(shape));
            cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN] = {};
        }
        updateActiveProjectLayersPills();
    });

    municipioItem.querySelector(`#exibir-todos-os-concorrentes-${dadosMunicipio.CD_MUN}`).addEventListener("click", (event) => { 

        markersConcorrentesMap.forEach(marker => map.markers.remove(marker));
        markersConcorrentesMap = [];
        
        const checkboxes = document.querySelectorAll(`#concorrentes-${dadosMunicipio.CD_MUN} .form-check-input`);

        if (!event.target.checked) {
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                if(checkbox.id !== `exibir-todos-os-concorrentes-${dadosMunicipio.CD_MUN}`) checkbox.disabled = false;
            });
            
            return;
        } else {
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
                if(checkbox.id !== `exibir-todos-os-concorrentes-${dadosMunicipio.CD_MUN}`) checkbox.disabled = true;
            });

            let minLat = Object.values(dadosConcorrentes[dadosMunicipio.CD_MUN])[0].y;
            let maxLat = Object.values(dadosConcorrentes[dadosMunicipio.CD_MUN])[0].y;
            let minLon = Object.values(dadosConcorrentes[dadosMunicipio.CD_MUN])[0].x;
            let maxLon = Object.values(dadosConcorrentes[dadosMunicipio.CD_MUN])[0].x;

            Object.values(dadosConcorrentes[dadosMunicipio.CD_MUN]).forEach(dadosConcorrente => {                   
                const latitude = dadosConcorrente.y;
                const longitude = dadosConcorrente.x;
                const posicao = [longitude, latitude];

                const marker = new atlas.HtmlMarker({
                    htmlContent: "<div><div class='pin-unidade-concorrente'></div></div>",
                    position: posicao,
                    pixelOffset: [5, -18]
                });

                marker.metadata = {
                    id: dadosConcorrente.ID,
                    endereco: dadosConcorrente.Endereço,
                    nome: dadosConcorrente.Nome,
                    nomeMun: dadosConcorrente.Cidade,
                    classe: dadosConcorrente.Classifica,
                    tamanho: dadosConcorrente.Tamanho,
                    fatMax: dadosConcorrente.FAT_MAX,
                    fatMin: dadosConcorrente.FAT_MIN,
                };

                map.markers.add(marker);

                const markerElement = marker.getElement();

                markerElement.addEventListener('mouseenter', () => {
                    map.getCanvasContainer().style.cursor = 'pointer';

                    const props = marker.metadata;
                    const idAtual = `dados-live-tools-infos-concorrentes-layer-${props.id}`;

                    if (exibindoId !== idAtual) {
                        document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                        document.getElementById("dados-live-infos").innerHTML = "";

                        const infos = document.createElement("div");
                        infos.id = idAtual;
                        infos.style = "margin: 10px; color: inherit";
                        infos.innerHTML = `
                            Nome do concorrente: ${!props.nome ? "Não informado" : props.nome} - ${!props.nomeMun ? "Não informado" : props.nomeMun}<br><br>
                            Endereço: ${!props.endereco ? "Não informado" : props.endereco} <br>
                            Classe: ${!props.classe ? "Não informado" : props.classe} <br>
                            Tamanho: ${!props.tamanho ? "Não informado" : props.tamanho} <br>
                            Faturamento mínimo em R$: ${!props.fatMin ? "Não informado" : props.fatMin.toFixed(2)} <br>
                            Faturamento máximo em R$: ${!props.fatMax ? "Não informado" : props.fatMax.toFixed(2)} <br>
                        `;

                        document.getElementById("dados-live-infos").appendChild(infos);
                        exibindoId = idAtual;
                    }
                });

                markerElement.addEventListener('mouseleave', () => {
                    if (exibindoId) {
                        const el = document.getElementById(exibindoId);
                        if (el) el.remove();

                        exibindoId = null;
                        document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                        map.getCanvasContainer().style.cursor = '';
                    }
                });

                markersConcorrentesMap.push(marker);
                
                minLat = Math.min(minLat, dadosConcorrente.y);
                maxLat = Math.max(maxLat, dadosConcorrente.y);
                minLon = Math.min(minLon, dadosConcorrente.x);
                maxLon = Math.max(maxLon, dadosConcorrente.x);

            });

            if(!isSmartphone) {
                map.setCamera({
                    bounds: [minLon, minLat, maxLon, maxLat],
                    padding: 50,
                    type: 'fly',
                    duration: 1000 
                });
            }
        }
        updateActiveProjectLayersPills();
            
    });
}

function gerarCirculoManual(center, radiusInMeters, numPoints = 50) {
    const circle = [];
    const R = 6378137; 

    const lat = center[1] * Math.PI / 180;
    const lon = center[0] * Math.PI / 180;

    for (let i = 0; i <= numPoints; i++) {
        const angle = (i * 360 / numPoints) * Math.PI / 180;

        const dx = radiusInMeters * Math.cos(angle);
        const dy = radiusInMeters * Math.sin(angle);

        const latOffset = dy / R;
        const lonOffset = dx / (R * Math.cos(lat));

        const latPoint = lat + latOffset;
        const lonPoint = lon + lonOffset;

        circle.push([
            lonPoint * 180 / Math.PI,
            latPoint * 180 / Math.PI
        ]);
    }

    return [circle]; 
}

function addCadaOptionTerrenosOportunidadeParaCadaMunicipio(dropDownView, dadosMunicipio) {
    Object.values(dadosTerrenosOportunidade[dadosMunicipio.CD_MUN]).forEach(terreno => {
        const div = document.createElement("div");
        div.className = "form-check";
        div.style.marginLeft = "10px";

        const input = document.createElement("input");
        input.className = "form-check-input";
        input.type = "checkbox";
        input.id = `exibir-terreno-${terreno.ID}`;

        const label = document.createElement("label");
        label.className = "form-check-label";
        label.htmlFor = input.id;
        label.style.fontSize = "15px";
        label.style.color = "inherit";
        label.innerText = terreno.Name.substring(0, 20) + "...";

        div.appendChild(input);
        div.appendChild(label);
        dropDownView.appendChild(div);

        input.addEventListener("click", (event) => {
            // Garantir que o DataSource de Terrenos exista usando utilitário modular
            datasourceOportunidadesDeTerreno = ensureDataSource('terrenos-oportunidade-datasource');
            let minLat = Infinity, maxLat = -Infinity;
            let minLon = Infinity, maxLon = -Infinity;

            if (event.target.checked) {
                const coords = typeof terreno.coord === 'string' ? JSON.parse(terreno.coord) : terreno.coord;

                coords[0].forEach(([lon, lat]) => {
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                    minLon = Math.min(minLon, lon);
                    maxLon = Math.max(maxLon, lon);
                });

                const center = coords[0].reduce(([sumLon, sumLat], [lon, lat]) => [sumLon + lon, sumLat + lat], [0, 0]);
                const centerLon = center[0] / coords[0].length;
                const centerLat = center[1] / coords[0].length;

                const circlePolygon = gerarCirculoManual([centerLon, centerLat], 1000);

                const shape = new atlas.Shape(new atlas.data.Feature(
                    new atlas.data.Polygon(coords),
                    {
                        id: terreno.ID,
                        nome: terreno.Name,
                        cor: "#ff0000",
                        tipo: terreno.TIPO,
                        area: terreno.METRAGEM,
                        endereco: terreno.ENDERECO,
                        valorVenda: terreno.VALOR_VEND,
                        valorAluguel: terreno.VALOR_ALUG,
                        contato: terreno.CONTATO,
                        imobiliaria: terreno.IMOBILIAR,
                        status: terreno.STATUS,
                        populacao: terreno.POPULACA,
                        domicilios: terreno.DOMICILIOS,
                        rendaMean: terreno.RENDA_MED,
                        potencial: terreno.POTENCIAL_,
                        absolvido: terreno.ABSOLVIDO_,
                        livre: terreno.LIVRE,
                        tipoShape: 'terreno',
                    }
                ));

                const circleShape = new atlas.Shape(new atlas.data.Feature(new atlas.data.Polygon(circlePolygon), {
                    id: terreno.ID,
                    nome: terreno.Name,
                    cor: "#ff0000",
                    tipo: terreno.TIPO,
                    area: terreno.METRAGEM,
                    endereco: terreno.ENDERECO,
                    valorVenda: terreno.VALOR_VEND,
                    valorAluguel: terreno.VALOR_ALUG,
                    contato: terreno.CONTATO,
                    imobiliaria: terreno.IMOBILIAR,
                    status: terreno.STATUS,
                    populacao: terreno.POPULACA,
                    domicilios: terreno.DOMICILIOS,
                    rendaMean: terreno.RENDA_MED,
                    potencial: terreno.POTENCIAL_,
                    absolvido: terreno.ABSOLVIDO_,
                    livre: terreno.LIVRE,
                    tipoShape: 'raio_1km'
                }));

                if (!cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN])
                    cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN] = {};

                if (!cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][terreno.ID]) {
                    datasourceOportunidadesDeTerreno.add([shape, circleShape]);

                    cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][terreno.ID] = shape;
                    cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][`circle-${terreno.ID}`] = circleShape;

                    const poligonoTerrenoLayer = new atlas.layer.PolygonLayer('terrenos-oportunidade-datasource', `terreno-layer-${terreno.ID}`, {
                        filter: ['==', ['get', 'tipoShape'], 'terreno'],
                        fillColor: ['get', 'cor'],
                        fillOpacity: 0.3
                    });

                    const poligonoCirculoLayer = new atlas.layer.PolygonLayer('terrenos-oportunidade-datasource', `circulo-layer-${terreno.ID}`, {
                        filter: ['==', ['get', 'tipoShape'], 'raio_1km'],
                        fillColor: 'inherit',
                        fillOpacity: 0.3
                    });

                    const lineLayer = new atlas.layer.LineLayer('terrenos-oportunidade-datasource', `line-layer-${terreno.ID}`, {
                        strokeColor: 'black',
                        strokeWidth: 0.3,
                        strokeDashArray: [4, 2]
                    });

                    map.layers.add([poligonoCirculoLayer]);

                    // Eventos de hover - Círculo
                    map.events.add('mousemove', poligonoCirculoLayer, function (e) {
                        if (e.shapes && e.shapes.length > 0) {
                            map.getCanvasContainer().style.cursor = 'pointer';

                            const shape = e.shapes[0];
                            const props = shape.getProperties();
                            const idAtual = `dados-live-tools-infos-circulo-layer-${props.id}`;

                            if (exibindoId !== idAtual) {
                                document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                                document.getElementById("dados-live-infos").innerHTML = "";

                                const infos = document.createElement("div");
                                infos.id = idAtual;
                                infos.style = "margin: 10px; color: inherit";
                                infos.innerHTML = `
                                    Raio de 1 KM do terreno: ${!props.nome ? "Não informado" : props.nome} <br><br>
                                    População: ${!props.populacao ? "Não informado" : props.populacao} <br>
                                    Domicílios: ${!props.domicilios ? "Não informado" : props.domicilios} <br>
                                    Renda média em R$: ${!props.rendaMean ? "Não informado" : props.rendaMean} <br>
                                    Potencial em R$: ${!props.potencial ? "Não informado" : props.potencial} <br>
                                    Absorvido em R$: ${!props.absolvido ? "Não informado" : props.absolvido} <br>
                                    Potencial livre em R$: ${!props.livre ? "Não informado" : props.livre} <br>
                                `;

                                document.getElementById("dados-live-infos").appendChild(infos);
                                exibindoId = idAtual;
                            }
                        }
                    });

                    map.events.add('mouseout', poligonoCirculoLayer, () => {
                        if (exibindoId) {
                            const el = document.getElementById(exibindoId);
                            if (el) el.remove();
                            exibindoId = null;
                            document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                            map.getCanvasContainer().style.cursor = '';
                        }
                    });

                    map.layers.add([poligonoTerrenoLayer, lineLayer]);

                    if (!cidadesEstudadasMapOportunidadesDeTerrenos[dadosMunicipio.CD_MUN])
                        cidadesEstudadasMapOportunidadesDeTerrenos[dadosMunicipio.CD_MUN] = [];

                    cidadesEstudadasMapOportunidadesDeTerrenos[dadosMunicipio.CD_MUN].push(poligonoTerrenoLayer, poligonoCirculoLayer, lineLayer);

                    // Eventos de hover - Terreno
                    map.events.add('mousemove', poligonoTerrenoLayer, function (e) {
                        if (e.shapes && e.shapes.length > 0) {
                            map.getCanvasContainer().style.cursor = 'pointer';

                            const shape = e.shapes[0];
                            const props = shape.getProperties();
                            const idAtual = `dados-live-tools-infos-terreno-layer-${props.id}`;

                            if (exibindoId !== idAtual) {
                                document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                                document.getElementById("dados-live-infos").innerHTML = "";

                                const infos = document.createElement("div");
                                infos.id = idAtual;
                                infos.style = "margin: 10px; color: inherit";
                                infos.innerHTML = `
                                    Nome do terreno: ${!props.nome ? "Não informado" : props.nome} <br><br>
                                    Endereço: ${!props.endereco ? "Não informado" : props.endereco} <br>
                                    Tipo: ${!props.tipo ? "Não informado" : props.tipo} <br>
                                    Metragem em M²: ${!props.area ? "Não informado" : props.area} <br>
                                    Valor de venda em R$: ${!props.valorVenda ? "Não informado" : props.valorVenda} <br>
                                    Valor de aluguel em R$: ${!props.valorAluguel ? "Não informado" : props.valorAluguel} <br>
                                `;

                                document.getElementById("dados-live-infos").appendChild(infos);
                                exibindoId = idAtual;
                            }
                        }
                    });

                    map.events.add('mouseout', poligonoTerrenoLayer, () => {
                        if (exibindoId) {
                            const el = document.getElementById(exibindoId);
                            if (el) el.remove();
                            exibindoId = null;
                            document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                            map.getCanvasContainer().style.cursor = '';
                        }
                    });

                    const radiusInKm = 1;
                    const latAdjustment = radiusInKm / 111.32;
                    const lonAdjustment = radiusInKm / (111.32 * Math.cos(centerLat * Math.PI / 180));

                    const minLatView = centerLat - latAdjustment;
                    const maxLatView = centerLat + latAdjustment;
                    const minLonView = centerLon - lonAdjustment;
                    const maxLonView = centerLon + lonAdjustment;

                    if(!isSmartphone) {
                        map.setCamera({
                            bounds: [minLonView, minLatView, maxLonView, maxLatView],
                            padding: 50,
                            type: 'fly',
                            duration: 1000 
                        });
                    }
                }

            } else {

                if (cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][terreno.ID]) {
                    datasourceOportunidadesDeTerreno.remove(cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][terreno.ID]);
                    delete cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][terreno.ID];
                }

                if (cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][`circle-${terreno.ID}`]) {
                    datasourceOportunidadesDeTerreno.remove(cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][`circle-${terreno.ID}`]);
                    delete cidadesEstudadasShapeOportunidadesDeTerrenos[dadosMunicipio.CD_MUN][`circle-${terreno.ID}`];
                }
            }
        });
    });
}

function addCadaOptionConcorrentesParaCadaMunicipio(dropDownView, dadosMunicipio) {
    Object.values(dadosConcorrentes[dadosMunicipio.CD_MUN]).forEach(concorrente => {
        const div = document.createElement("div");
        div.className = "form-check";
        div.style.marginLeft = "10px";

        const input = document.createElement("input");
        input.className = "form-check-input";
        input.type = "checkbox";
        input.id = `exibir-concorrente-${concorrente.ID}`;

        const label = document.createElement("label");
        label.className = "form-check-label";
        label.htmlFor = input.id;
        label.style.fontSize = "15px";
        label.style.color = "inherit";
        label.innerText = concorrente.Nome.substring(0, 20) + "...";

        div.appendChild(input);
        div.appendChild(label);
        dropDownView.appendChild(div);

        input.addEventListener("click", (event) => {
            const latitude = concorrente.y;
            const longitude = concorrente.x;
            const posicao = [longitude, latitude];

            if (event.target.checked) {
                const marker = new atlas.HtmlMarker({
                    htmlContent: "<div><div class='pin-unidade-concorrente'></div></div>",
                    position: posicao,
                    pixelOffset: [5, -18]
                });

                marker.metadata = {
                    id: concorrente.ID,
                    endereco: concorrente.Endereço,
                    nome: concorrente.Nome,
                    nomeMun: concorrente.Cidade,
                    classe: concorrente.Classifica,
                    tamanho: concorrente.Tamanho,
                    fatMax: concorrente.FAT_MAX,
                    fatMin: concorrente.FAT_MIN,
                };

                map.markers.add(marker);

                const markerElement = marker.getElement();

                markerElement.addEventListener('mouseenter', () => {
                    map.getCanvasContainer().style.cursor = 'pointer';

                    const props = marker.metadata;
                    const idAtual = `dados-live-tools-infos-concorrentes-layer-${props.id}`;

                    if (exibindoId !== idAtual) {
                        document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                        document.getElementById("dados-live-infos").innerHTML = "";

                        const infos = document.createElement("div");
                        infos.id = idAtual;
                        infos.style = "margin: 10px; color: inherit";
                        infos.innerHTML = `
                            Nome do concorrente: ${!props.nome ? "Não informado" : props.nome} - ${!props.nomeMun ? "Não informado" : props.nomeMun}<br><br>
                            Endereço: ${!props.endereco ? "Não informado" : props.endereco} <br>
                            Classe: ${!props.classe ? "Não informado" : props.classe} <br>
                            Tamanho: ${!props.tamanho ? "Não informado" : props.tamanho} <br>
                            Faturamento minimo em R$: ${!props.fatMin.toFixed(2) ? "Não informado" : props.fatMin.toFixed(2)} <br>
                            Faturamento maximo em R$: ${!props.fatMax.toFixed(2) ? "Não informado" : props.fatMax.toFixed(2)} <br>
                        `;

                        document.getElementById("dados-live-infos").appendChild(infos);
                        exibindoId = idAtual;
                    }
                });

                markerElement.addEventListener('mouseleave', () => {
                    if (exibindoId) {
                        const el = document.getElementById(exibindoId);
                        if (el) el.remove();

                        exibindoId = null;
                        document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                        map.getCanvasContainer().style.cursor = '';
                    }
                });

                markersConcorrentesMap.push(marker);

                if(!isSmartphone) {
                    map.setCamera({
                        center: posicao,
                        zoom: 12,
                        type: 'fly',
                        duration: 1000 
                    });
                }
            } else {
                markersConcorrentesMap = markersConcorrentesMap.filter(marker => {
                    const isThis = marker.getOptions().position[0] === longitude &&
                                    marker.getOptions().position[1] === latitude;
                    if (isThis) map.markers.remove(marker);
                    return !isThis;
                });  
            }
        });
    });

}

function handleMunicipioEstudados() {    
    const cidadesEstudadasDropDownView = document.querySelectorAll(".cidadesEstudadasItens");
    cidadesEstudadasDropDownView.forEach((elemento) => {
        elemento.innerHTML = "";

        Object.values(dadosMunicipiosDasUnidades).forEach(dadosMunicipio => {
        
            addOptionMunicipioEstudadosDropDownView(elemento, dadosMunicipio);
            
            const terrenosOportunidadeTargetDropDownView = document.getElementById(`oportunidades-de-terreno-${dadosMunicipio.CD_MUN}`);
            addCadaOptionTerrenosOportunidadeParaCadaMunicipio(terrenosOportunidadeTargetDropDownView, dadosMunicipio)

            const concorrentesTargetDropDownView = document.getElementById(`concorrentes-${dadosMunicipio.CD_MUN}`);
            addCadaOptionConcorrentesParaCadaMunicipio(concorrentesTargetDropDownView, dadosMunicipio)

        });   
    });
}

function parseWKTPolygon(wkt) {
    const coordsText = wkt
        .replace('POLYGON ((', '')
        .replace('))', '')
        .split(',');

    const coords = coordsText.map(pair => {
        const [lon, lat] = pair.trim().split(' ').map(Number);
        return [lon, lat];
    });

    return [coords]; // GeoJSON requires an extra array for linear ring
}

async function addOptionPotenciaisClientesDropDownView(dropDownView, dadosMunicipio) {
    const municipioItem = document.createElement("div");
    municipioItem.classList.add(`funcoes-clientes-potenciais-${dadosMunicipio.CD_MUN}`);

    municipioItem.innerHTML = `
        <div style="width: 100%; padding-inline: 10px;" id="div-${dadosMunicipio.CD_MUN}">
            <label class="form-check-label d-flex align-items-center" style="color: inherit; cursor: pointer;" data-bs-toggle="collapse" href="#${dadosMunicipio.CD_MUN}" role="button" aria-expanded="false" aria-controls="${dadosMunicipio.NM_MUN}">
                <i class="fa-solid fa-caret-right indicator" style="margin-right: 10px;"></i>${dadosMunicipio.NM_MUN}
            </label>

            <div class="collapse ms-4 mt-2" id="${dadosMunicipio.CD_MUN}">

                <div class="form-check" style="margin-left: 10px;">
                    <input class="form-check-input" type="checkbox" id="exibir-poligono-potencial-cliente-municipio-${dadosMunicipio.CD_MUN}">
                    <label class="form-check-label" for="exibir-poligono-potencial-cliente-municipio-${dadosMunicipio.CD_MUN}" style="font-size: 15px; color: inherit;">Exibir área da cidade</label>
                </div> 

                <div style="width: 100%; padding-inline: 10px;" id="div-clientes-${dadosMunicipio.CD_MUN}">
                    <label class="form-check-label d-flex align-items-center" style="color: inherit; cursor: pointer;" data-bs-toggle="collapse" href="#clientes-${dadosMunicipio.CD_MUN}" role="button" aria-expanded="false" aria-controls="clientes-${dadosMunicipio.CD_MUN}">
                        <i class="fa-solid fa-caret-right indicator" style="margin-right: 10px;"></i>Clientes
                    </label>

                    <div class="collapse ms-4 mt-2" id="clientes-${dadosMunicipio.CD_MUN}">

                        <div class="form-check" style="margin-left: 10px;">
                            <input class="form-check-input" type="checkbox" id="todos-clientes-${dadosMunicipio.CD_MUN}">
                            <label class="form-check-label" for="todos-clientes-${dadosMunicipio.CD_MUN}" style="font-size: 15px; color: inherit;">Todas os clientes</label>
                        </div>

                    </div>
                </div> 

            </div>
        </div> 
    `;

    dropDownView.appendChild(municipioItem);

    municipioItem.querySelector(`#exibir-poligono-potencial-cliente-municipio-${dadosMunicipio.CD_MUN}`).addEventListener("click", (event) => {        
        if (event.target.checked) {
            if (!cidadesClientesPotencialShape[dadosMunicipio.NM_MUN]) {
                const dicionarioDadosMunicipio = { 
                    id: dadosMunicipio.NM_MUN, 
                    nome: dadosMunicipio.NM_MUN,
                    coord: parseWKTPolygon(dadosMunicipio.coord)
                }

                const shape = new atlas.Shape(new atlas.data.Feature(
                    new atlas.data.Polygon(dicionarioDadosMunicipio.coord),
                    {
                        id: dicionarioDadosMunicipio.id,
                        nome: dicionarioDadosMunicipio.nome,
                        cor: "#fff"
                    }
                ))

                cidadesClientesPotencialShape[dicionarioDadosMunicipio.id] = shape;
                datasourcePotenciaisClientes.add(shape);

                const poligonoLayer = new atlas.layer.PolygonLayer(datasourcePotenciaisClientes, null, {
                    fillColor: ['get', 'cor'], 
                    fillOpacity: 0.2
                });

                const lineLayer = new atlas.layer.LineLayer(datasourcePotenciaisClientes, null, {
                    strokeColor: 'black',
                    strokeWidth: 1,
                    strokeDashArray: [4, 2]
                });
                
                map.layers.add([poligonoLayer, lineLayer]);
                cidadesClientesPotencialMap.push(poligonoLayer, lineLayer);

                if(!isSmartphone) {
                    map.setCamera({
                        bounds: shape.getBounds(),
                        padding: 50,
                        type: 'fly',
                        duration: 1000 
                    });
                }
            }
        } else {
            if (cidadesClientesPotencialShape[dadosMunicipio.NM_MUN]) {
                datasourcePotenciaisClientes.remove(cidadesClientesPotencialShape[dadosMunicipio.NM_MUN]);
                delete cidadesClientesPotencialShape[dadosMunicipio.NM_MUN];
            }            
        }
    }); 
}

function handlePotenciaisClientes() {    
    const potenciaisClientesDropDownView = document.getElementById("potenciaisClientesItens");
    potenciaisClientesDropDownView.innerHTML = "";

    Object.values(dadosMunicipios).forEach(async dadosMunicipio => {

        await addOptionPotenciaisClientesDropDownView(potenciaisClientesDropDownView, dadosMunicipio);

        Object.values(dadosClientesPotenciais).forEach(cliente => {
            if (dadosMunicipio.CD_MUN === cliente.CD_MUN) {
                const [x, y] = JSON.parse(cliente.coord);
                const posicao = [x, y];

                const clientesDropDownView = document.getElementById(`clientes-${cliente.CD_MUN}`);
                if (!clientesDropDownView) return;

                // Criação manual dos elementos
                const div = document.createElement("div");
                div.className = "form-check";
                div.style.marginLeft = "10px";

                const input = document.createElement("input");
                input.className = "form-check-input";
                input.type = "checkbox";
                input.id = `cliente-${cliente.Id}`;

                const label = document.createElement("label");
                label.className = "form-check-label";
                label.htmlFor = input.id;
                label.style.fontSize = "15px";
                label.style.color = "inherit";
                label.innerText = cliente.RazaoSocial.substring(0, 20) + "...";

                // Anexa os elementos
                div.appendChild(input);
                div.appendChild(label);
                clientesDropDownView.appendChild(div);

                // Agora o elemento existe e você pode adicionar o listener com segurança
                input.addEventListener("click", (event) => {
                    if (event.target.checked) {
                        const marker = new atlas.HtmlMarker({
                            htmlContent: "<div><div class='pin-unidade-cliente'></div></div>",
                            position: posicao,
                            pixelOffset: [5, -18]
                        });

                        marker.metadata = {
                            id: cliente.Id,
                            ramo: cliente.Ramo,
                            porte: cliente.Porte,
                            nome: cliente.RazaoSocial,
                            municipio: cliente.Municipio,
                            capital: cliente.CapitalSocial
                        };

                        map.markers.add(marker);

                        const markerElement = marker.getElement();

                        markerElement.addEventListener('mouseenter', () => {
                            map.getCanvasContainer().style.cursor = 'pointer';

                            const props = marker.metadata;
                            const idAtual = `dados-live-tools-infos-clientes-layer-${props.id}`;

                            if (exibindoId !== idAtual) {
                                document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                                document.getElementById("dados-live-infos").innerHTML = "";

                                const infos = document.createElement("div");
                                infos.id = idAtual;
                                infos.style = "margin: 10px; color: inherit";
                                infos.innerHTML = `
                                    Nome do cliente: ${!props.nome ? "Não informado" : props.nome} - ${!props.municipio ? "Não informado" : props.municipio}<br><br>
                                    Ramo: ${!props.ramo ? "Não informado" : props.ramo} <br>
                                    Porte: ${!props.porte ? "Não informado" : props.porte} <br>
                                    Capital social em R$: ${!props.capital ? "Não informado" : props.capital} <br>
                                `;

                                document.getElementById("dados-live-infos").appendChild(infos);
                                exibindoId = idAtual;
                            }
                        });

                        markerElement.addEventListener('mouseleave', () => {
                            if (exibindoId) {
                                const el = document.getElementById(exibindoId);
                                if (el) el.remove();

                                exibindoId = null;
                                document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                                map.getCanvasContainer().style.cursor = '';
                            }
                        });

                        markersClientesPotenciaisMap.push(marker);

                        if(!isSmartphone) {
                            map.setCamera({ 
                                center: posicao, 
                                zoom: 12,
                                type: 'fly',
                                duration: 1000 
                            });
                        }
                        clientesSelecionados.push(cliente);
                    } else {
                        markersClientesPotenciaisMap = markersClientesPotenciaisMap.filter(marker => {
                            const isThis = marker.getOptions().position[0] === x && marker.getOptions().position[1] === y;
                            if (isThis) map.markers.remove(marker);
                            return !isThis;
                        });

                        const index = clientesSelecionados.indexOf(cliente);
                        if (index !== -1) clientesSelecionados.splice(index, 1);
                    }
                    updateActiveProjectLayersPills();
                });
            }
        });

        document.querySelector(`#todos-clientes-${dadosMunicipio.CD_MUN}`).addEventListener("click", (event) => {

            const checkboxes = document.querySelectorAll(`#clientes-${dadosMunicipio.CD_MUN} .form-check-input`);

            if (!event.target.checked) {
                clientesSelecionados = [];
                 
                // Remove todos os markers
                markersClientesPotenciaisMap.forEach(marker => map.markers.remove(marker));
                markersClientesPotenciaisMap = [];     

                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                    if(checkbox.id !== `todos-clientes-${dadosMunicipio.CD_MUN}`) checkbox.disabled = false;
                });
                
                return;
            } else {            
                checkboxes.forEach(checkbox => {
                    checkbox.checked = true;
                    if(checkbox.id !== `todos-clientes-${dadosMunicipio.CD_MUN}`) checkbox.disabled = true;
                });

                const clientesDesseMunicipio = Object.values(dadosClientesPotenciais).filter(cliente => cliente.CD_MUN === dadosMunicipio.CD_MUN);

                const [x, y] = JSON.parse(Object.values(clientesDesseMunicipio)[0].coord);

                let minLat = y;
                let maxLat = y;
                let minLon = x;
                let maxLon = x;

                Object.values(clientesDesseMunicipio).forEach(dadosCliente => {                       
                    clientesSelecionados.push(dadosCliente);

                    const [x, y] = JSON.parse(dadosCliente.coord);
                    const posicao = [x, y];

                    const marker = new atlas.HtmlMarker({
                        htmlContent: "<div><div class='pin-unidade-cliente'></div></div>",
                        position: posicao,
                        pixelOffset: [5, -18]
                    });

                    marker.metadata = {
                        id: dadosCliente.Id,
                        ramo: dadosCliente.Ramo,
                        porte: dadosCliente.Porte,
                        nome: dadosCliente.RazaoSocial,
                        municipio: dadosCliente.Municipio,
                        capital: dadosCliente.CapitalSocial
                    };

                    map.markers.add(marker);

                    const markerElement = marker.getElement();

                    markerElement.addEventListener('mouseenter', () => {
                        map.getCanvasContainer().style.cursor = 'pointer';

                        const props = marker.metadata;
                        const idAtual = `dados-live-tools-infos-clientes-layer-${props.id}`;

                        if (exibindoId !== idAtual) {
                            document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                            document.getElementById("dados-live-infos").innerHTML = "";

                            const infos = document.createElement("div");
                            infos.id = idAtual;
                            infos.style = "margin: 10px; color: inherit";
                            infos.innerHTML = `
                                Nome da unidade: ${!props.nome ? "Não informado" : props.nome} - ${!props.municipio ? "Não informado" : props.municipio}<br><br>
                                Ramo: ${!props.ramo ? "Não informado" : props.ramo} <br>
                                Porte: ${!props.porte ? "Não informado" : props.porte} <br>
                                Capital social em R$: ${!props.capital ? "Não informado" : props.capital} <br>
                            `;

                            document.getElementById("dados-live-infos").appendChild(infos);
                            exibindoId = idAtual;
                        }
                    });

                    markerElement.addEventListener('mouseleave', () => {
                        if (exibindoId) {
                            const el = document.getElementById(exibindoId);
                            if (el) el.remove();

                            exibindoId = null;
                            document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                            map.getCanvasContainer().style.cursor = '';
                        }
                    });

                    markersClientesPotenciaisMap.push(marker);
                    
                    minLat = Math.min(minLat, y);
                    maxLat = Math.max(maxLat, y);
                    minLon = Math.min(minLon, x);
                    maxLon = Math.max(maxLon, x);
                });

                if(!isSmartphone) {
                    map.setCamera({
                        bounds: [minLon, minLat, maxLon, maxLat],
                        padding: 50,
                        type: 'fly',
                        duration: 1000
                    });
                }
            }
        });

    });   
}

function setupMenuIconRotation() {
    // Selecionar todos os labels que controlam os collapses
    const menuLabels = document.querySelectorAll('[data-bs-toggle="collapse"]');
    
    // Função para configurar um label individual
    function setupLabel(label) {
        const targetId = label.getAttribute('href');
        let targetElement = null;
        if (targetId && targetId.startsWith('#')) {
            // Se for um id, use getElementById para evitar problemas de selector com ids iniciando por número
            targetElement = document.getElementById(targetId.substring(1));
        } else if (targetId) {
            try {
                targetElement = document.querySelector(targetId);
            } catch (e) {
                targetElement = null;
            }
        }
        const arrowIcon = label.querySelector('.nav-arrow');
        const folderIcon = label.querySelector('.nav-icon');
        
        if (!targetElement) return;
        
        // Verificar se existe algum ícone de seta (pode ser nav-arrow ou fa-caret-right)
        const hasArrowIcon = arrowIcon || label.querySelector('.fa-caret-right');
        if (!hasArrowIcon) return;
        
        // Função para atualizar os ícones baseado no estado do collapse
        function updateIcons() {
            const isExpanded = targetElement.classList.contains('show');
            
            if (isExpanded) {
                // Menu aberto - rotacionar seta para baixo e mudar ícone da pasta
                if (arrowIcon) {
                    arrowIcon.style.transform = 'rotate(90deg)';
                }
                
                // Tratar ícone fa-caret-right se existir
                const caretIcon = label.querySelector('.fa-caret-right');
                if (caretIcon) {
                    caretIcon.style.transform = 'rotate(90deg)';
                }
                // Pasta aberta e texto amarelos (consistência com projetos)
                if (folderIcon) {
                    folderIcon.classList.remove('fa-folder');
                    folderIcon.classList.add('fa-folder-open');
                }
                const text = label.querySelector('.main-text');
                if (text) text.style.color = '#F7A600';
                label.style.color = '#F7A600';
            } else {
                // Menu fechado - voltar seta para direita e mudar ícone da pasta
                if (arrowIcon) {
                    arrowIcon.style.transform = 'rotate(0deg)';
                }
                
                // Tratar ícone fa-caret-right se existir
                const caretIcon = label.querySelector('.fa-caret-right');
                if (caretIcon) {
                    caretIcon.style.transform = 'rotate(0deg)';
                }
                if (folderIcon) {
                    folderIcon.classList.remove('fa-folder-open');
                    folderIcon.classList.add('fa-folder');
                }
                const text = label.querySelector('.main-text');
                if (text) text.style.color = 'inherit';
                label.style.color = 'inherit';
            }
        }
        
        // Observer para monitorar mudanças no estado do collapse
        const collapseObserver = new MutationObserver(() => {
            updateIcons();
        });
        
        // Observar mudanças nas classes do elemento alvo
        collapseObserver.observe(targetElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Atualizar ícones inicialmente
        updateIcons();
        
        // Adicionar listener para clique (backup)
        label.addEventListener('click', () => {
            // Pequeno delay para garantir que o Bootstrap processou o toggle
            setTimeout(updateIcons, 50);
        });
    }
    
    // Aplicar a configuração para todos os labels encontrados
    menuLabels.forEach(setupLabel);
}

async function insertSideMenuTools() {
    const menuToolsSidebar = document.getElementById("menu-tools-sidebar"); // Este é o UL do submenu Hiram P&D

    const tools = `
        
            <label class="nav-link form-check-label d-flex" style="margin-bottom: 20px; align-items: center; justify-content: start" data-bs-toggle="collapse" href="#planejamentoItens" role="button" aria-expanded="false" aria-controls="planejamentoItens">
                <i class="nav-icon fa-solid fa-folder-open" style="color: inherit !important; margin-left: 10px;"></i>
                <p style="color: inherit; margin-bottom: 0px; margin-left: 10px;" class="main-text">Planejamento</p>
                <i class="nav-arrow bi bi-chevron-right" style="color:inherit; margin-left: 10px;"></i>
            </label>

            <div class="collapse ms-4 mb-3" id="planejamentoItens" style="margin-left: 40px !important; margin-top: 10px;">

            </div>

            <label class="nav-link form-check-label d-flex" style="align-items: center; margin-bottom: 20px;" data-bs-toggle="collapse" href="#cidadesEstudadasItens" role="button" aria-expanded="false" aria-controls="cidadesEstudadasItens">
                <i class="nav-icon fa-solid fa-folder-open" style="color: inherit !important; margin-left: 10px;"></i>
                <p style="color: inherit; margin-bottom: 0px; margin-left: 10px;" class="main-text">Pesquisas</p>
                <i class="nav-arrow bi bi-chevron-right" style="color:inherit; margin-left: 10px;"></i>
            </label>
            
            <div class="collapse ms-4 mb-3 cidadesEstudadasItens" id="cidadesEstudadasItens" style="margin-left: 30px !important; margin-top: 10px;">

            </div>

            <label class="nav-link form-check-label d-flex" style="align-items: center; margin-bottom: 20px;" data-bs-toggle="collapse" href="#areasEstudosImplantacaoPadaria" role="button" aria-expanded="false" aria-controls="areasEstudosImplantacaoPadaria">
                <i class="nav-icon fa-solid fa-folder-open" style="color: inherit !important; margin-left: 10px;"></i>
                <p style="color: inherit; margin-bottom: 0px; margin-left: 10px;" class="main-text">Áreas de estudos de implantação Padaria</p>
                <i class="nav-arrow bi bi-chevron-right" style="color:inherit; margin-left: 10px;"></i>
            </label>
            
            <div class="collapse ms-4 mb-3 areasEstudosImplantacaoPadaria" id="areasEstudosImplantacaoPadaria" style="margin-left: 30px !important; margin-top: 10px;">

            </div>

            <label class="nav-link form-check-label d-flex" style="align-items: center; margin-bottom: 20px;" data-bs-toggle="collapse" href="#areasEstudosImplantacaoLoteamento" role="button" aria-expanded="false" aria-controls="areasEstudosImplantacaoLoteamento">
                <i class="nav-icon fa-solid fa-folder-open" style="color: inherit !important; margin-left: 10px;"></i>
                <p style="color: inherit; margin-bottom: 0px; margin-left: 10px;" class="main-text">Áreas de estudos de implantação Loteamento</p>
                <i class="nav-arrow bi bi-chevron-right" style="color:inherit; margin-left: 10px;"></i>
            </label>
            
            <div class="collapse ms-4 mb-3 areasEstudosImplantacaoLoteamento" id="areasEstudosImplantacaoLoteamento" style="margin-left: 30px !important; margin-top: 10px;">

            </div>

            <label class="nav-link form-check-label d-flex" style="align-items: center; margin-bottom: 20px;" data-bs-toggle="collapse" href="#areasEstudosImplantacaoMall" role="button" aria-expanded="false" aria-controls="areasEstudosImplantacaoMall">
                <i class="nav-icon fa-solid fa-folder-open" style="color: inherit !important; margin-left: 10px;"></i>
                <p style="color: inherit; margin-bottom: 0px; margin-left: 10px;" class="main-text">Áreas de estudos de implantação Mall</p>
                <i class="nav-arrow bi bi-chevron-right" style="color:inherit; margin-left: 10px;"></i>
            </label>
            
            <div class="collapse ms-4 mb-3 areasEstudosImplantacaoMall" id="areasEstudosImplantacaoMall" style="margin-left: 30px !important; margin-top: 10px;">

            </div>

            <label class="nav-link form-check-label d-flex" style="align-items: center; margin-bottom: 20px;" data-bs-toggle="collapse" href="#potenciaisClientesItens" role="button" aria-expanded="false" aria-controls="potenciaisClientesItens">
                <i class="nav-icon fa-solid fa-folder-open" style="color: inherit !important; margin-left: 10px;"></i>
                <p style="color: inherit; margin-bottom: 0px; margin-left: 10px;" class="main-text">Potenciais clientes</p>
                <i class="nav-arrow bi bi-chevron-right" style="color:inherit; margin-left: 10px;"></i>
            </label>
            
            <div class="collapse ms-4 mb-3 potenciaisClientesItens" id="potenciaisClientesItens" style="margin-left: 30px !important; margin-top: 10px;">

            </div>

            
            
            <ul class="nav nav-treeview ul-municipio-maps mt-4"></ul>
        `;

    // Somente prossegue se menuToolsSidebar (o UL) realmente existir
    if (menuToolsSidebar) {
        menuToolsSidebar.innerHTML = tools;
        
        // Adicionar event listeners para rotação dos ícones
    }

    const bodyElement = document.body;
    let hiramPdLiElement = document.getElementById("sidebar-maps-tools-gf"); // O <li> pai
    const sidebarElement = document.getElementById("layout-menu"); // O <aside> da sidebar principal

    // Se o elemento sidebar-maps-tools-gf não existir, vamos criá-lo
    if (!hiramPdLiElement) {
        console.log("Elemento 'sidebar-maps-tools-gf' não encontrado. Criando dinamicamente...");
        return;
    }
    
    if (!sidebarElement) {
        console.error("Error: Elemento principal da sidebar ('layout-menu') não encontrado.");
        return;
    }

    // Variável para rastrear se o mouse está sobre a sidebar minimizada (hover-expand)
    let isSidebarHoverExpandedManual = false;

    // Abrir o menu Hiram P&D por padrão
    if (bodyElement && !bodyElement.classList.contains('sidebar-collapse')) {
        hiramPdLiElement.classList.add('menu-open');
    }

    function syncHiramSubmenuDisplay() {
        const toolsContainer = document.getElementById("menu-tools-sidebar-submenu");
        if (!toolsContainer || !hiramPdLiElement || !bodyElement || !sidebarElement) {
            return;
        }

        const isBodyCollapsed = bodyElement.classList.contains('sidebar-collapse');
        
        // Verifica se o AdminLTE adicionou alguma classe para o hover-expand (você precisa verificar isso no seu browser)
        const isSidebarAdminLTEHoverClassActive = sidebarElement.classList.contains('sidebar-focused') || 
                                                 sidebarElement.classList.contains('sidebar-hover') || 
                                                 sidebarElement.classList.contains('sidebar-mini-hover'); // Adicione outras classes se encontrar

        // Considera tanto o hover manual (via mouseenter/leave) quanto uma possível classe do AdminLTE
        const isEffectivelyHoverExpanded = isSidebarAdminLTEHoverClassActive || isSidebarHoverExpandedManual;

        if (isBodyCollapsed && !isEffectivelyHoverExpanded) {
            // Sidebar está minimizada E NÃO está em modo de expansão por hover (nem por classe AdminLTE, nem por mouseenter manual)
            toolsContainer.style.display = 'none';
        } else {
            // Sidebar está totalmente expandida OU está minimizada MAS em modo de expansão por hover
            if (hiramPdLiElement.classList.contains('menu-open')) {
                toolsContainer.style.display = 'block';
            } else {
                toolsContainer.style.display = 'none';
            }
        }
    }

    // --- Configuração dos Listeners e Observers (FEITA APENAS UMA VEZ) ---

    // 1. Listeners para MOUSEENTER e MOUSELEAVE na sidebar principal (para o hover manual)
    sidebarElement.addEventListener('mouseenter', () => {
        if (bodyElement.classList.contains('sidebar-collapse')) {
            isSidebarHoverExpandedManual = true;
            syncHiramSubmenuDisplay();
        }
    });

    sidebarElement.addEventListener('mouseleave', () => {
        if (bodyElement.classList.contains('sidebar-collapse')) {
            isSidebarHoverExpandedManual = false;
            syncHiramSubmenuDisplay();
        }
    });

    // 2. Observer para mudanças na classe do <body>
    const bodyObserver = new MutationObserver(() => {
        // Se a sidebar não está mais colapsada, o hover manual é irrelevante
        if (!bodyElement.classList.contains('sidebar-collapse')) {
            isSidebarHoverExpandedManual = false;
        }
        syncHiramSubmenuDisplay();
    });
    bodyObserver.observe(bodyElement, { attributes: true, attributeFilter: ['class'] });

    // 3. Observer para mudanças na classe da <li> do Hiram P&D
    const hiramLiObserver = new MutationObserver(() => {
        syncHiramSubmenuDisplay();
    });
    hiramLiObserver.observe(hiramPdLiElement, { attributes: true, attributeFilter: ['class'] });
    
    // 4. Observer para mudanças na classe do <aside id="sidebar"> (caso AdminLTE use uma classe para hover)
    const sidebarAsideObserver = new MutationObserver(() => {
        syncHiramSubmenuDisplay(); // Este observer já cobre o caso de AdminLTE adicionar classes
    });
    sidebarAsideObserver.observe(sidebarElement, { attributes: true, attributeFilter: ['class'] });


    // Sincronização inicial
    syncHiramSubmenuDisplay();

    
}

function utmToWgs84(easting, northing, zone, isSouthernHemisphere, datum = 'WGS84') {
    if (typeof proj4 === 'undefined') {
        console.error("Biblioteca proj4js não carregada. Não é possível transformar coordenadas UTM.");
        return null;
    }

    // --- VERIFICAÇÃO DE SEGURANÇA ADICIONADA ---
    // Number.isFinite() é a forma mais segura de garantir que é um número válido (não é NaN, null, undefined, etc.)
    if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
        console.error(`Coordenadas de entrada inválidas ou não finitas. Impossível converter. Easting: ${easting}, Northing: ${northing}`);
        return null; // Retorna nulo para que o `.filter(p => p !== null)` possa removê-lo
    }
    // --- FIM DA VERIFICAÇÃO ---

    try {
        let utmProjString = `+proj=utm +zone=${zone}`;
        if (isSouthernHemisphere) {
            utmProjString += " +south";
        }
        utmProjString += ` +datum=${datum} +units=m +no_defs`;
        
        const wgs84ProjString = "+proj=longlat +datum=WGS84 +no_defs";

        // A conversão acontece aqui, agora com a garantia de que os inputs são números válidos.
        return proj4(utmProjString, wgs84ProjString, [easting, northing]);

    } catch (e) {
        console.error(`Erro na conversão UTM para WGS84 (Zona: ${zone}, Datum: ${datum}):`, e);
        return null;
    }
}

function getAutoCADColor(colorIndex) {
    const colorMap = {
        1: 'red', 2: 'yellow', 3: 'green', 4: 'cyan',
        5: 'blue', 6: 'magenta', 7: '#FAFAFA', 
        8: 'darkgray', 9: 'lightgray', 10: 'red', 11: '#654321', 12: 'inherit', 13: '#00d1ff',
        14: '#cacaca', 15: '#3f5b71', 16: 'green', 17: '#276521', 18: '#16a808', 19: '#b4ffab', 20: 'pink',
        21: '#5d8758', 22: '#7a6412', 23: '#b08f14', 24: '#ffa200'
    };
    return colorMap[colorIndex] || 'inherit'; 
}

async function plotarMultiLineString(dados, transformarCoords = true, datasourceId, layerId) {
    try {
        const properties = JSON.parse(dados.properties);
        let geometry = JSON.parse(dados.geometry);
        let wgs84Coords;

        let sistema = identificarSistema(geometry);

        if (transformarCoords && sistema === "UTM") {
            const utmZone = properties.UTM_ZONE || 23; 
            const isSouthern = properties.HEMISPHERE !== undefined ? (properties.HEMISPHERE === 'S') : true; // Assume Sul se não especificado
            const sourceDatum = properties.DATUM || 'SIRGAS2000'; 

            wgs84Coords = geometry.map(linePath =>
                linePath.map(point => {
                    const lonLat = utmToWgs84(point[0], point[1], utmZone, isSouthern, sourceDatum);
                    return lonLat ? [lonLat[0], lonLat[1]] : null;
                }).filter(p => p !== null)
            );
            wgs84Coords = wgs84Coords.filter(path => path.length >= 2);
        } else {
            wgs84Coords = geometry.map(linePath =>
                linePath.map(point => [point[0], point[1]])
            ).filter(path => path.length >= 2);
        }

        if (wgs84Coords.length === 0 || wgs84Coords.every(path => path.length < 2)) {
            console.warn("Geometria inválida (pontos insuficientes) do geodado:", dados.id, "Coordenadas originais:", geometry, "Coordenadas transformadas:", wgs84Coords);
            return null;
        }

        if (dados.geometry_type === "MultiLineString") {
            const corDaLinha = getAutoCADColor(properties.Color);   
            const larguraOriginal = parseFloat(properties.LineWt);
            const larguraDaLinha = !isNaN(larguraOriginal) ? Math.max(0.5, (larguraOriginal / 100) * 1.5) : 1; 

            const multiLineString = new atlas.data.MultiLineString(wgs84Coords);
            const feature = new atlas.data.Feature(multiLineString, {
                ...properties,
                idOriginal: dados.id, 
                projeto: dados.projeto,
                arquivo: dados.arquivo,
                corDaLinha: corDaLinha,
                larguraDaLinha: larguraDaLinha
            });
            const shape = new atlas.Shape(feature, dados.id.toString()); 

            if (!dados.chavePrincipal || !dados.chaveRestante) {
                console.error("Objeto de estudo não possui chavePrincipal ou chaveRestante:", dados);
                return null; 
            }

            if (!dicionarioDeShapes[dados.chavePrincipal]) {
                dicionarioDeShapes[dados.chavePrincipal] = {};
            }
            if (!dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante]) {
                dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante] = {};
            }
            dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante][dados.id.toString()] = shape;

            let datasource = map.sources.getById(datasourceId);
            if (!datasource) { 
                datasource = new atlas.source.DataSource(datasourceId);
                map.sources.add(datasource);
            }

            let layer = map.layers.getLayers().find(l => l.getId() === layerId);
            if (!layer) {
                layer = new atlas.layer.LineLayer(datasourceId, layerId, {
                    strokeColor: ['get', 'corDaLinha'],
                    strokeWidth: ['get', 'larguraDaLinha']
                });
                map.layers.add(layer);
            }

            datasource.add(shape);

            return shape;
        } else {
            console.error("Geodado não é uma MultiLineString:", dados.id, e, dados);
            return null;
        }
    } catch (e) {
        console.error("Erro ao plotar estudo de implantação ID:", dados.id, e, dados);
        return null;
    }
}

async function removerMultiLineString(dados, datasourceId) { 
    try {
        const idDadoStr = dados.id.toString();
        const datasource = map.sources.getById(datasourceId); 

        if (!dados.chavePrincipal || !dados.chaveRestante) {
            console.error("Objeto de geodado individual não possui chavePrincipal ou chaveRestante para remoção:", dados);
            const shapeById = datasource.getShapeById(idDadoStr);
            if (shapeById) {
                datasource.remove(shapeById);
                console.warn(`Shape para o geodado ID ${idDadoStr} removido diretamente do datasource por fallback.`);
            }
            return;
        }

        const { chavePrincipal, chaveRestante } = dados;

        if (dicionarioDeShapes[chavePrincipal] &&
            dicionarioDeShapes[chavePrincipal][chaveRestante] &&
            dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr]) {
            
            const shapeToRemove = dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr];
            datasource.remove(shapeToRemove); 
            
            delete dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr];

            if (Object.keys(dicionarioDeShapes[chavePrincipal][chaveRestante]).length === 0) {
                delete dicionarioDeShapes[chavePrincipal][chaveRestante];
            }
            if (Object.keys(dicionarioDeShapes[chavePrincipal]).length === 0) {
                delete dicionarioDeShapes[chavePrincipal];
            }
        } else {
            const shapeById = datasource.getShapeById(idDadoStr);
            if (shapeById) {
                datasource.remove(shapeById);
                console.warn(`Shape para o geodado ID ${idDadoStr} removido diretamente do datasource (não estava no tracking object).`);
            } else {
                console.warn(`Shape para o geodado ID ${idDadoStr} não encontrado para remoção.`);
            }
        }
    } catch (e) {
        console.error("Erro ao remover o geodado de implantação ID:", dados.id, e, dados);
    }
}

function initEventListenerItemAreasEstudosImplantacaoDropDownView(elementoInput, dadosDoEstudoArray) {

    elementoInput.addEventListener("click", async (event) => {
        if (event.target.checked) {
            let allBoundsForGroup = null;
            for (const individualGeometriaEstudo of dadosDoEstudoArray) {
                const plottedShape = await plotarMultiLineString(individualGeometriaEstudo, true, "areas-estudos-implantacao-datasource", "areas-estudos-implantacao-layer");
                if (plottedShape && typeof plottedShape.getBounds === 'function') {
                    const bounds = plottedShape.getBounds();
                    if (bounds) {
                        if (!allBoundsForGroup) {
                            allBoundsForGroup = new atlas.data.BoundingBox(bounds);
                        } else {
                            allBoundsForGroup = atlas.data.BoundingBox.merge(allBoundsForGroup, bounds);
                        }
                    }
                }
            }
            
            if (allBoundsForGroup) {
                if(!isSmartphone) {
                    map.setCamera({ 
                        bounds: allBoundsForGroup, 
                        padding: 100,
                        type: 'fly',
                        duration: 1000
                    }); 
                } else {
                    const objetoComAsProps = { 
                        bounds: allBoundsForGroup, 
                        padding: 100,
                        type: 'fly',
                        duration: 1000
                    };
                    
                    handleZoomOnSmartphones(objetoComAsProps);
                }
            } else if (dadosDoEstudoArray.length > 0) {
                const firstGeoInGroup = dadosDoEstudoArray[0];
                try {
                    let geometryCoords = JSON.parse(firstGeoInGroup.geometry);
                    const properties = JSON.parse(firstGeoInGroup.properties);
                    const utmZone = properties.UTM_ZONE || 23;
                    const isSouthern = properties.HEMISPHERE === 'S' || true;
                    const sourceDatum = properties.DATUM || 'SIRGAS2000';
                    const firstPoint = geometryCoords[0][0]; 
                    const wgs84Center = utmToWgs84(firstPoint[0], firstPoint[1], utmZone, isSouthern, sourceDatum);
                    if (wgs84Center) {
                        if(!isSmartphone) {
                            map.setCamera({ 
                                center: [wgs84Center[0], wgs84Center[1]], 
                                zoom: 18,                            
                                type: 'fly',
                                duration: 1000
                            }); 
                        } else {
                            const objetoComAsProps = { 
                                center: [wgs84Center[0], wgs84Center[1]], 
                                zoom: 18,                            
                                type: 'fly',
                                duration: 1000
                            };
                            
                            handleZoomOnSmartphones(objetoComAsProps);
                        }
                    }
                } catch (e) { console.error("Erro ao centralizar no estudo (fallback):", e); }
            }
        } else { 
            for (const individualGeometriaEstudo of dadosDoEstudoArray) {
                await removerMultiLineString(individualGeometriaEstudo, "areas-estudos-implantacao-datasource");
            }
        }
    });
}

function addOptionAreasEstudosImplantacaoDropDownView(dropdownViewEstudo, dadosDoEstudo, keyPrinc, keyElement, nomeElement) {
    const areasEstudosImplantacaoItem = document.createElement("div");

    areasEstudosImplantacaoItem.classList.add("form-check");

    areasEstudosImplantacaoItem.innerHTML = `
        <input class="form-check-input exibirAreasEstudoImplantacao${keyPrinc}" type="checkbox" id="area-estudo-implantacao-${keyPrinc}-${keyElement}">
        <label class="form-check-label" for="area-estudo-implantacao-${keyPrinc}-${keyElement}" style="font-size: 15px; color: inherit;">${nomeElement}</label>
    `;

    dropdownViewEstudo.appendChild(areasEstudosImplantacaoItem);

    initEventListenerItemAreasEstudosImplantacaoDropDownView(areasEstudosImplantacaoItem, dadosDoEstudo);
}

function handleAreasEstudosImplantacao() {

    const projetosConfig = [
        { nomeQuery: ".areasEstudosImplantacaoPadaria", chaveProjeto: "Padaria", prefixoCheckbox: "padaria" },
        { nomeQuery: ".areasEstudosImplantacaoLoteamento", chaveProjeto: "Loteamento", prefixoCheckbox: "loteamento" },
        { nomeQuery: ".areasEstudosImplantacaoMall", chaveProjeto: "Mall", prefixoCheckbox: "mall" }
    ];

    projetosConfig.forEach(config => {
        const dropDownViews = document.querySelectorAll(config.nomeQuery);
        dropDownViews.forEach(elementoDropDown => {
            
            const projetoData = dadosAreasEstudosImplantacao[config.chaveProjeto];
            if (projetoData) {
                Object.entries(projetoData).forEach(([keyElement, estudoArray]) => {
                    let nomeAmigavel = keyElement.replace("estudo", "Estudo ").replace("_", " ");
                    nomeAmigavel = nomeAmigavel.charAt(0).toUpperCase() + nomeAmigavel.slice(1); 

                    addOptionAreasEstudosImplantacaoDropDownView(elementoDropDown, estudoArray, config.chaveProjeto, keyElement, nomeAmigavel);
                });
            } else {
                console.warn(`Nenhum dado encontrado para o projeto: ${config.chaveProjeto}`);
            }
        });
    });
}


function setupFloatingButtonAction() {
    const floatingButtons = document.querySelectorAll('#floating-remove-btn');
    const floatingButton = floatingButtons[1];

    if (floatingButton) {
        floatingButton.addEventListener('click', () => {
            const targetLiId = floatingButton.dataset.targetLiId;
            if (!targetLiId) return;

            const targetLi = document.getElementById(targetLiId);
            if (!targetLi) return;

            const checkboxesMarcados = targetLi.querySelectorAll('input[type="checkbox"]:checked');
            
            checkboxesMarcados.forEach(checkbox => checkbox.click());

            floatingButton.style.display = 'none';
        });
    }
}

function identificarSistema(geometry) {
    if (!geometry || !Array.isArray(geometry)) return 'Indefinido';

    function extrairCoordenadas(arr) {
        if (typeof arr[0] === 'number' && typeof arr[1] === 'number') {
            return arr;
        } else if (Array.isArray(arr[0])) {
            return extrairCoordenadas(arr[0]);
        }
        return null;
    }

    const coords = extrairCoordenadas(geometry);
    if (!coords) return 'Indefinido';

    const [x, y] = coords;

    if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
        return 'WGS84';
    }

    if (x >= 100000 && x <= 900000 && y >= 0 && y <= 10000000) {
        return 'UTM';
    }

    return 'Desconhecido';
}

function handleHideInfoIcons() {
    const btnEstilosMapa = document.querySelector('#btn-estilos-mapa');
    const btnMunicipioMaps = document.querySelector('#btn-municipio-maps');
    const btnLayersAtivas = document.querySelector('#btn-layers-ativas');
    const dadosLiveTools = document.querySelector('#dados-live-tools');

    setTimeout(() => {
        btnEstilosMapa.innerHTML = `<i class="fa-solid fa-gear hidden-mobile-icon"></i>`;
        btnMunicipioMaps.innerHTML = `<i class="fa-solid fa-magnifying-glass-location hidden-mobile-icon"></i>`;
        btnLayersAtivas.innerHTML = `<i class="fa-solid fa-layer-group hidden-mobile-icon"></i>`;
        dadosLiveTools.innerHTML = `
            <i id="icon-expand-dados-live-tools" class="fa-solid fa-pencil labels-dropdown" style="margin: 10px;"></i>
                  
            <div id="dados-live-infos">

            </div>`;
    }, 5000);
}

document.addEventListener("DOMContentLoaded", async (event) => {

    // Inicializa o MapsManager
    mapsManager = new MapsManager(subscriptionKey, document.getElementById('maps-canvas'));
    map = await mapsManager._init();
    mapsManager._handleMapStyle(map);

    window.addEventListener('mapaCarregado', () => {
        datasourcePlanejamento = new atlas.source.DataSource('planejamento-datasource');
        map.sources.add(datasourcePlanejamento);

        datasourcePesquisaMacroEconomica = new atlas.source.DataSource('pesquisa-macro-economica-datasource');
        map.sources.add(datasourcePesquisaMacroEconomica);

        datasourceConcorrentes = new atlas.source.DataSource('concorrentes-datasource');
        map.sources.add(datasourceConcorrentes);

        datasourcePotenciaisClientes = new atlas.source.DataSource('clientes-potenciais-datasource');
        map.sources.add(datasourcePotenciaisClientes);

        datasourceOportunidadesDeTerreno = new atlas.source.DataSource('terrenos-oportunidade-datasource');
        map.sources.add(datasourceOportunidadesDeTerreno);

        datasourceAreasEstudosImplantacao = new atlas.source.DataSource('areas-estudos-implantacao-datasource');
        map.sources.add(datasourceAreasEstudosImplantacao);

        datasourceFacesDosLogradouros = new atlas.source.DataSource('faces-dos-logradouros-datasource');
        map.sources.add(datasourceFacesDosLogradouros);

        datasourceMunicipio = new atlas.source.DataSource('municipio-datasource');
        map.sources.add(datasourceMunicipio);

        console.log('Mapa carregado');
    });
    
    document.querySelectorAll(".municipio-maps-ativador").forEach(elemento => {
        elemento.addEventListener("click", async () => {
            
            telaCarregamento.style.display = "flex";

            await inicializarMenuProjetos();

            telaCarregamento.style.display = "none";
        
        });
    });

    handleCheckableFilterIcons();
    
    document.querySelectorAll('.dropdown .accordion').forEach(accordion => {
        accordion.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    });

    document.querySelectorAll('.offcanvas').forEach(drawer => {
        const bsOffcanvas = new bootstrap.Offcanvas(drawer);
        const hammer = new Hammer(drawer);
        hammer.get('swipe').set({ direction: Hammer.DIRECTION_DOWN });
    
        hammer.on('swipe', function (ev) {
            if (ev.direction === Hammer.DIRECTION_DOWN) {
                bsOffcanvas.hide();
            }
        });
        drawer.addEventListener('shown.bs.offcanvas', updateDrawerPosition);
    });

    document.getElementById('icon-expand-dados-basicos-municipio').onclick = () => {
        const box = document.getElementById('dados-basico-municipio');
        box.classList.remove('dados-basico-municipio-not-expanded');
        box.classList.add('dados-basico-municipio-expanded');
    };

    document.getElementById('icon-collapse-dados-basicos-municipio').onclick = () => {
        const box = document.getElementById('dados-basico-municipio');
        box.classList.remove('dados-basico-municipio-expanded');
        box.classList.add('dados-basico-municipio-not-expanded');
    };
    
    updateDrawerPosition();
  
    window.addEventListener('resize', () => updateDrawerPosition());

    handleRemoveAllLayersEventListener();

    handleHideInfoIcons();
    
    setupFloatingButtonAction();
   
    // Configurar listeners globais para camadas ativas
    setupGlobalCheckboxListeners();
    
    setupMenuIconRotation(); 
});

window.handleLiCollapsable = () => {
    const lis = document.querySelectorAll(".nav-item");

    lis.forEach(li => {
        const navTreeView = li.querySelector('.nav-treeview');
        const anchor = li.querySelector('p');

        if (anchor && navTreeView) {
            if (anchor.dataset.listenerAdded === "true") return;
            anchor.dataset.listenerAdded = "true";

            anchor.addEventListener('click', () => {

                const arrowIcon = anchor.querySelector('.nav-arrow');

                const siblings = Array.from(li.parentElement.children).filter(
                    sibling => sibling !== li && sibling.classList.contains('nav-item')
                );

                siblings.forEach(sibling => {
                    sibling.classList.remove('menu-open');
                    const siblingAnchor = sibling.querySelector('p');
                    if(siblingAnchor.textContent.trim() !== "Limites administrativos") {
                        siblingAnchor.style.color = "inherit";
                    }
                    const siblingTreeView = sibling.querySelector('.nav-treeview');
                    const siblingArrowIcon = sibling.querySelector('.nav-arrow');
                
                    if (siblingTreeView) siblingTreeView.classList.add('collapsed');
                    if (siblingArrowIcon) siblingArrowIcon.classList.replace('bi-chevron-down', 'bi-chevron-right');
                });

                // Alterna o clicado
                if (navTreeView.classList.contains('collapsed')) {
                    li.classList.add('menu-open');
                    navTreeView.classList.remove('collapsed');
                    if (arrowIcon) arrowIcon.classList.replace('bi-chevron-right', 'bi-chevron-down');
                } else {
                    navTreeView.classList.add('collapsed');
                    li.classList.remove('menu-open');
                    if (arrowIcon) arrowIcon.classList.replace('bi-chevron-down', 'bi-chevron-right');
                }
            });
        }
    });
}

// Configura listeners globais para atualizar camadas ativas
function setupGlobalCheckboxListeners() {
    // Usar MutationObserver para detectar novos checkboxes adicionados dinamicamente
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const checkboxes = node.querySelectorAll ? node.querySelectorAll('.form-check-input[type="checkbox"]') : [];
                    checkboxes.forEach(addLayerUpdateListener);
                    
                    // Verificar se o próprio node é um checkbox
                    if (node.matches && node.matches('.form-check-input[type="checkbox"]')) {
                        addLayerUpdateListener(node);
                    }
                }
            });
        });
    });

    // Observar mudanças no DOM
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Configurar checkboxes existentes
    document.querySelectorAll('.form-check-input[type="checkbox"]').forEach(addLayerUpdateListener);
}

function addLayerUpdateListener(checkbox) {
    if (!checkbox.dataset.layerListenerAdded && checkbox.name !== 'radioEstiloMapa') {
        checkbox.addEventListener('click', () => {
            setTimeout(() => updateActiveProjectLayersPills(), 100);
        });
        checkbox.dataset.layerListenerAdded = 'true';
    }
}

function handleCheckableFilterIcons () {
    const expandButtons = document.querySelectorAll(".form-check-label");

    expandButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const icon = btn.querySelector(".indicator");

            if (icon) {
                if (icon.classList.contains("fa-caret-right")) {
                    icon.classList.remove("fa-caret-right");
                    icon.classList.add("fa-caret-down");
                } else {
                    icon.classList.remove("fa-caret-down");
                    icon.classList.add("fa-caret-right");
                }
            }
        });
    });
}

function updateDrawerPosition() {
    const drawer = document.querySelector('.offcanvas.show');
    if(!drawer) return;

    const removeAllBtn = document.querySelector('.remove-all-layers-btn');

    if (window.innerWidth < 1200) {
        removeAllBtn.setAttribute('data-bs-placement', 'top');
        drawer.querySelector('.drawer-header-line').style.display = 'block';
        drawer.style.borderTopLeftRadius = '20px';
        drawer.style.borderTopRightRadius = '20px';
        drawer.classList.remove('offcanvas-start');
        drawer.classList.add('offcanvas-bottom');
    } else {
        removeAllBtn.setAttribute('data-bs-placement', 'right');
        drawer.querySelector('.drawer-header-line').style.display = 'none';
        drawer.style.borderTopLeftRadius = '0px';
        drawer.style.borderTopRightRadius = '0px';
        drawer.classList.remove('offcanvas-bottom');
        drawer.classList.add('offcanvas-start');
    }
}

function removerLayersDoMunicipioAbertoExcetoLimiteMunicipal() {
    const municipioAberto = document.querySelector('li.pare.menu-open');
    if (!municipioAberto) {
        return;
    }

    const checkboxes = municipioAberto.querySelectorAll('.form-check-input[type="checkbox"]:checked:not(.limite-municipal-checkbox)');
    if(checkboxes.length === 0) {
        return;
    }

    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });    
}

function handleRemoveAllLayersEventListener() {
    const btns = document.querySelectorAll('.remove-all-layers-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', function handler(e) {
            removerTodasAsCamadas(); // Usar a nova função modular em vez da antiga
        });
    });
}

// Bloqueando função de deslizar e abrir menu lateral (aside)
window.blockHammerAside = true;