import ProjetoMunicipioMap from './ProjetoMunicipioMap.js';
import { setItemWithExpiry, getItemWithExpiry } from './municipio-maps-utils.js';

export default class ProjetoMunicipioCollection {
  constructor(dependencias) {
    this.projetos = {};
    this.limitesBrasilPlotado = false;
    this.projetosJaCarregados = false;
    this.estruturasDeMunicipiosJaMontadas = {};
    this.endpoint = dependencias?.endpoint;
    this.fetchComAutoRefresh = dependencias?.fetchComAutoRefresh;
    this.map = dependencias?.map;
    this.mapsManager = dependencias?.mapsManager;
    this.telaCarregamento = dependencias?.telaCarregamento;
    this.customAlert = dependencias?.customAlert;
    this.schema = dependencias?.schema;
  }

  // Busca todos os projetos de município no backend e instancia ProjetoMunicipioMap
  async fetchProjetos() {
    let projetosPayload;

    if (this.projetosJaCarregados) {
        return;
    }
    
      try {
        this.telaCarregamento.style.display = "flex";
        const response = await this.fetchComAutoRefresh(this.endpoint + `/api/hiram-maps/${this.schema === 'hub' ? 'getProjetosHubPetrolina' : 'getProjetosMunicipioMaps'}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
          if (this.customAlert) this.customAlert(`Erro ao buscar os projetos: ${response.statusText}`);
          return;
        }
        const dados = await response.json();
        if (!dados.payload || !Array.isArray(dados.payload)) {
          if (this.customAlert) this.customAlert("Payload inválido na resposta dos projetos.");
          return;
        }
        projetosPayload = dados.payload;
      } catch (err) {
        if (this.customAlert) this.customAlert("Erro ao buscar projetos.");
        console.error(err);
        return;
      }
    projetosPayload.forEach(proj => {

      this.projetos[proj.id] = new ProjetoMunicipioMap(proj, {
        endpoint: this.endpoint,
        fetchComAutoRefresh: this.fetchComAutoRefresh,
        map: this.map,
        mapsManager: this.mapsManager,
        telaCarregamento: this.telaCarregamento,
        customAlert: this.customAlert,
        schema: this.schema
      });
    });
  }

  // Cria o item de menu do projeto e adiciona event listener para expandir/colapsar e carregar estrutura
    async addProjetoOption(projetoData, elemento) {

        if(this.estruturasDeMunicipiosJaMontadas[projetoData.cidadeNormalizadoSemAcentos]) {
            return;
        } else {            
            let isProcessingClick = false;

            const cidade = projetoData.cidade;
            const cidadeLwCs = cidade.toLowerCase();
            const cidadeNormalizado = cidadeLwCs.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const cidadeNormalizadoSemAcentos = cidadeNormalizado.replace(/\s/g, '');
            // Cria o <li> do projeto
            const li = document.createElement('li');
            li.classList.add('nav-item', `nav-item-${cidadeNormalizadoSemAcentos}-maps`, 'pare');
            
            // Cria o <a> do projeto
            const a = document.createElement('a');
            a.classList.add(`a-${cidadeNormalizadoSemAcentos}-maps`);
            a.style.alignItems = 'center';
            a.style.marginLeft = '10px';
            a.style.display = 'flex';
            a.style.flexDirection = 'row';
            
            // Cria o <p> do projeto
            const p = document.createElement('p');
            p.classList.add('main-text');
            p.innerHTML = `
                <i class="fa-solid fa-folder-open" style="margin-right: 10px"></i>
                ${projetoData.cidade} Maps
                <i class="nav-arrow bi bi-chevron-right" style="margin-left: 10px"></i>
            `;
            a.appendChild(p);
    
            // Cria o <ul> para subcamadas (será preenchido ao expandir)
            const ul = document.createElement('ul');
            ul.classList.add('nav', 'nav-treeview', 'collapsed', `ul-${cidadeNormalizadoSemAcentos}-maps`);
            
            // Adiciona event listener para expandir/colapsar e carregar estrutura
            p.addEventListener('click', async (event) => {
                event.preventDefault();
                if (isProcessingClick) {
                    return; 
                }
    
                try {
                    isProcessingClick = true;
                    // Busca a instância do projeto
                    const projeto = this.projetos[projetoData.id];
                    if (!projeto) return;
    
                    // Se já está expandido, colapsa
                    if (li.classList.contains('menu-open')) {
                        li.classList.remove('menu-open');
                        p.style.color = 'inherit';
                        ul.innerHTML = '';
                        this.removerTodosOsPlots(elemento);
                        projeto.divisaoTerritorialAtual = null;
                        projeto.removerDadosMunicipio();
                    } else {
                        li.classList.add('menu-open');
                        p.style.color = '#F7A600';
                        
                        this.removerTodosOsPlots(elemento);
                        // Carrega a estrutura do projeto e renderiza
                        if (ul.childElementCount === 0) {
                            if (this.telaCarregamento) this.telaCarregamento.style.display = 'flex';
                            await projeto.fetchEstruturaProjeto();
                            await projeto.handleEstruturaProjeto(`ul-${cidadeNormalizadoSemAcentos}-maps`, projeto.cod_mun, cidadeNormalizadoSemAcentos);
                            if (this.telaCarregamento) this.telaCarregamento.style.display = 'none';
                        }
                        await projeto.plotarLimiteMunicipalAoExpandir(li);
                        projeto.exibirDadosMunicipio();
                        this.estruturasDeMunicipiosJaMontadas[projetoData.cidadeNormalizadoSemAcentos] = true;

                    }
                } catch (error) {
                    console.error("Ocorreu um erro ao manusear o mapa:", error);
                } finally {
                    isProcessingClick = false;
                }
            });
            li.appendChild(a);
            li.appendChild(ul);
            elemento.appendChild(li);
    
            window.handleLiCollapsable();
        }
    }

  // Inicializa e renderiza todos os projetos carregados no menu
    async handleProjetos(elementoPai) {
        if (this.projetosJaCarregados) {
            return;
        }

        if(!this.limitesBrasilPlotado) {
            await this.plotarMalhaBrasil();
            await this.handleMalhaBrasil(elementoPai);
        }
        
        // elementoPai deve ser o UL principal onde os projetos serão inseridos
        for (const id in this.projetos) {
            const projeto = this.projetos[id];

            await this.addProjetoOption({
                id: projeto.id,
                cidade: projeto.cidade,
                cod_mun: projeto.cod_mun
            }, elementoPai);
        }

        this.projetosJaCarregados = true;

    }

    async handleMalhaBrasil(targetLi) {

        const observer = new MutationObserver(async (mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (!targetLi.classList.contains('menu-open')) {
                        this.removerMalhaBrasil();
                        this.removerTodosOsPlots(targetLi);
                    } else {
                        await this.plotarMalhaBrasil();
                    }
                }
            }
        });

        observer.observe(targetLi, { attributes: true, attributeFilter: ['class'] });
    }

    // Remove todos os shapes e markers do mapa de todos os projetos
    removerTodosOsPlots(targetLi) {
        
        const checkboxesMarcados = targetLi.querySelectorAll('input[type="checkbox"]:checked');
                    
        checkboxesMarcados.forEach(checkbox => {
            if(checkbox.id.includes("limitemunicipal")) {
                checkbox.disabled = false;
            }
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));
        });     
            
        // Limpa todos os markers
        this.map.markers.clear();
        // Limpa todos os datasources e layers
        const allSources = this.map.sources.getSources();
        const allLayers = this.map.layers.getLayers();
        const layerIdsToRemove = [];
        allSources.forEach(source => {
            const sourceId = source.getId();
            allLayers.forEach(layer => {
                if (layer.options && layer.options.source === sourceId && sourceId !== 'brasil-limites-datasource') {
                    layerIdsToRemove.push(layer.getId());
                }
            });
        });
        if (layerIdsToRemove.length > 0) {
            this.map.layers.remove(layerIdsToRemove);
        }
        // Limpa dicionários de shapes de todos os projetos
        for (const id in this.projetos) {
            this.mapsManager.dicionarioDeShapes = {};
        }
        this.limitesBrasilPlotado = false;
        this.mapsManager._applyMapZoomWithBounds([-73.99, -33.75, -34.8, 5.27], document.getElementById('bottomDrawer').classList.contains('show'))
    }

    // Plota a malha do Brasil no mapa
    async plotarMalhaBrasil() {
        try {
            // Busca a malha do Brasil (pode ser um endpoint específico ou um projeto especial)
            const params = new URLSearchParams({
                Tipo: 'paises',
                SiglaPais: 'BR',
                Formato: 'application/vnd.geo+json',
                Salvar: 'true'
            });
            const response = await this.fetchComAutoRefresh(
                `${this.endpoint}/api/hiram-maps/getMalhas?${params.toString()}`,
                { method: 'GET', credentials: 'include' }
            );
            const data = await response.json();
            const geometry = data.features[0].geometry;
            geometry.coordinates.forEach(coords => {
                const shape = new atlas.Shape(new atlas.data.Feature(

                new atlas.data.Polygon(coords),
                    {
                        id: 1,
                        pais: 'brasil',
                        cor: '#fff'
                    }
                ), 1);

                let datasourceId = 'brasil-limites-datasource';
                let layerId = 'brasil-limites-layer';
                let datasource = this.map.sources.getById(datasourceId);
                if (!datasource) {
                    datasource = new atlas.source.DataSource(datasourceId);
                    this.map.sources.add(datasource);
                }
                const borderLayerId = `${layerId}-borda`;
                let polygonLayer = this.map.layers.getLayers().find(l => l.getId() === layerId);
                let borderLayer = this.map.layers.getLayers().find(l => l.getId() === borderLayerId);
                if (!polygonLayer) {
                    polygonLayer = new atlas.layer.PolygonLayer(datasourceId, layerId, {
                        fillColor: '#ffffff',
                        fillOpacity: 0.1
                    });
                    borderLayer = new atlas.layer.LineLayer(datasourceId, borderLayerId, {
                        strokeColor: '#000000',
                        strokeWidth: 1
                    });
                    this.map.layers.add([polygonLayer, borderLayer]);
                }

                datasource.add(shape);
                this.map.setCamera({
                    bounds: atlas.data.BoundingBox.fromEdges(-73.99, -33.75, -34.8, 5.27),
                    padding: 50,
                    type: 'fly',
                    duration: 1000
                });
            });
            this.limitesBrasilPlotado = true;
        } catch (e) {
            console.error('Erro ao plotar malha do Brasil:', e);
            if (this.customAlert) this.customAlert('Erro ao plotar malha do Brasil.');
        }
    }

    // Remove a malha do Brasil do mapa
    removerMalhaBrasil() {
        if (!this.limitesBrasilPlotado) return;
        const datasourceId = 'brasil-limites-datasource';
        const layerId = 'brasil-limites-layer';
        const borderLayerId = `${layerId}-borda`;
        const polygonLayer = this.map.layers.getLayerById(layerId);
        if (polygonLayer) {
            this.map.layers.remove(polygonLayer);
        }
        const borderLayer = this.map.layers.getLayerById(borderLayerId);
        if (borderLayer) {
            this.map.layers.remove(borderLayer);
        }
        const datasource = this.map.sources.getById(datasourceId);
        if (datasource) {
            datasource.clear();
            this.map.sources.remove(datasourceId);
        }
        this.limitesBrasilPlotado = false;
    }
} 