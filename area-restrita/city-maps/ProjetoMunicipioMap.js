// Dependências externas como fetchComAutoRefresh, endpoint, map, etc. devem ser passadas como parâmetros ou propriedades da instância.

import {
  setItemWithExpiry,
  getItemWithExpiry,
  findFirstCoordinate,
  identificarSistema,
  getAutoCADColor,
  formatJsonForDisplay,
  getBoundsFromShape,
  utmToWgs84
} from './municipio-maps-utils.js';

export default class ProjetoMunicipioMap {
    constructor({ id, cidade, cod_mun, projeto, id_cliente }, dependencias) {
        this.id = id;
        this.cidade = cidade;
        this.cidadeNormalizadoSemAcentos = this.cidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g, '');
        this.cod_mun = cod_mun;
        this.projeto = projeto;
        this.id_cliente = id_cliente;
        this.exibindoId = null;
        this.dadosEstrutura = {};
        this.dadosDasCamadas = {};
        this.arvoreTemas = {}; // Árvore de temas/subtemas/itens/camadas
        // Dependências externas (ex: endpoint, fetchComAutoRefresh, map, etc)
        this.endpoint = dependencias?.endpoint;
        this.fetchComAutoRefresh = dependencias?.fetchComAutoRefresh;
        this.map = dependencias?.map;
        this.mapsManager = dependencias?.mapsManager;
        this.telaCarregamento = dependencias?.telaCarregamento;
        this.customAlert = dependencias?.customAlert;
        this.customToast = dependencias?.customToast;
        this.divisaoTerritorialAtual = null;
        this.schema = dependencias?.schema;
    }

  // Busca a estrutura do projeto e monta a árvore de temas
    async fetchEstruturaProjeto() {
        const localKey = `dadosEstruturaProjeto${this.id}`;
        const cache = getItemWithExpiry(localKey);
        let estrutura;
        if (cache && cache !== undefined) {
        estrutura = JSON.parse(cache);
        } else {
        try {
            if (this.telaCarregamento) this.telaCarregamento.style.display = "flex";
            const response = await this.fetchComAutoRefresh(
            this.endpoint + `/api/hiram-maps/getEstruturaProjeto?projetoId=${this.id}&schema=${this.schema}`,
            {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }
            );
            if (this.telaCarregamento) this.telaCarregamento.style.display = "none";
            if (!response.ok) {
            if (this.customAlert) this.customAlert(`Erro ao buscar a estrutura do projeto: ${response.statusText}`);
            return;
            }
            const dados = await response.json();
            if (!dados.payload || !Array.isArray(dados.payload)) {
            if (this.customAlert) this.customAlert("Payload inválido na resposta da estrutura do projeto.");
            return;
            }
            setItemWithExpiry(localKey, JSON.stringify(dados.payload));

            estrutura = dados.payload;
        } catch (err) {
            if (this.customAlert) this.customAlert("Erro ao buscar estrutura do projeto.");
            console.error(err);
            return;
        }
        }
        this.dadosEstrutura = estrutura;
        this.arvoreTemas = this._montarArvoreTemas(estrutura);
    }

  // Monta a árvore de temas/subtemas/itens/camadas a partir do array de estrutura
    _montarArvoreTemas(estrutura) {

        const arvore = {};
        estrutura.forEach(item => {
            if (!item.nome_tema) return;

            if (!arvore[item.nome_tema]) arvore[item.nome_tema] = {};

            if (item.nome_subtema) {
                if (!arvore[item.nome_tema][item.nome_subtema]) arvore[item.nome_tema][item.nome_subtema] = [];

                if (item.tipo_destino === "camada") {

                    arvore[item.nome_tema][item.nome_subtema].push({
                        id: item.id_camada,
                        nome: item.nome_camada,
                        possui_geodados: item.subtema_possui_camada,
                        tipo_destino: item.tipo_destino,
                        endpoint_camada: item.endpoint_camada
                    });
                } else if (item.tipo_destino === "item") {

                    if (!arvore[item.nome_tema][item.nome_subtema][item.nome_item]) arvore[item.nome_tema][item.nome_subtema][item.nome_item] = [];
                    
                    if (item.id_camada != null) {
                        arvore[item.nome_tema][item.nome_subtema][item.nome_item].push({
                            id: item.id_camada || null,
                            nome: item.nome_camada || null,
                            possui_geodados: item.item_possui_camada,
                            endpoint_camada: item.endpoint_camada
                        });
                    }
                }
            }
        });

        return arvore;
    }

    // Métodos utilitários para manipulação da árvore
    getTema(nomeTema) {
        return this.arvoreTemas[nomeTema] || null;
    }
    getSubtema(nomeTema, nomeSubtema) {
        return this.arvoreTemas[nomeTema]?.[nomeSubtema] || null;
    }
    getCamadasDeSubtema(nomeTema, nomeSubtema) {
        const subtema = this.getSubtema(nomeTema, nomeSubtema);
        if (Array.isArray(subtema)) return subtema;
        return null;
    }
    getItensDeSubtema(nomeTema, nomeSubtema) {
        const subtema = this.getSubtema(nomeTema, nomeSubtema);
        if (typeof subtema === 'object' && !Array.isArray(subtema)) return subtema;
        return null;
    }
    findById(id) {
        // Busca recursiva por id de camada na árvore
        for (const tema in this.arvoreTemas) {
        for (const subtema in this.arvoreTemas[tema]) {
            const node = this.arvoreTemas[tema][subtema];
            if (Array.isArray(node)) {
            for (const camada of node) {
                if (camada.id === id) return camada;
            }
            } else if (typeof node === 'object') {
            for (const item in node) {
                for (const camada of node[item]) {
                if (camada.id === id) return camada;
                }
            }
            }
        }
        }
        return null;
    }

  // Busca a malha do município
    async fetchMalhaMunicipio() {
        const localKey = `dadosMalhaMunicipio${this.cod_mun}`;
        const cache = sessionStorage.getItem(localKey);
        if (cache && cache !== undefined) {
        return JSON.parse(cache).features[0].geometry;
        }
        try {
        const params = new URLSearchParams({
            Tipo: 'municipios',
            IdMun: this.cod_mun,
            Formato: 'application/vnd.geo+json',
            Salvar: 'true'
        });
        const response = await this.fetchComAutoRefresh(
            `${this.endpoint}/api/hiram-maps/getMalhas?${params.toString()}`,
            { method: 'GET', credentials: 'include' }
        );
        const data = await response.json();
        sessionStorage.setItem(localKey, JSON.stringify(data));
        return data.features[0].geometry;
        } catch (err) {
        if (this.customAlert) this.customAlert("Erro ao buscar malha do município.");
        console.error(err);
        }
    }

    async plotarPolygon(dados, transformarCoords, datasourceId, layerId, plotarLabel) {
        try {
            let properties;
            if (typeof dados.properties === 'string') {
                properties = JSON.parse(dados.properties);
            } else {
                properties = dados.properties || {};
            }

            const idDadoStr = dados.id ? dados.id.toString() : dados.cd_setor ? dados.cd_setor : dados.cd_bairro;
            const geometry = typeof dados.geometry === 'string' ? JSON.parse(dados.geometry) : dados.geometry;
            let wgs84Coords;

            let sistema = identificarSistema(geometry);

            if (transformarCoords && sistema === "UTM") {
                const utmZone = properties.UTM_ZONE || 23;
                const isSouthern = properties.HEMISPHERE !== undefined ? (properties.HEMISPHERE === 'S') : true;
                const sourceDatum = properties.DATUM || 'SIRGAS2000';

                wgs84Coords = geometry.map(ring =>
                    ring.map(point => {
                        const lonLat = utmToWgs84(point[0], point[1], utmZone, isSouthern, sourceDatum);
                        return lonLat ? [lonLat[0], lonLat[1]] : null;
                    }).filter(p => p !== null)
                ).filter(ring => ring.length >= 4);
            } else {
                if (Array.isArray(geometry)) {
                    wgs84Coords = geometry;
                } else {
                    wgs84Coords = geometry.coordinates;
                }
            }

            if (wgs84Coords.length === 0) {
                return null;
            }

            // Estilo padrão
            const corDePreenchimento = getAutoCADColor(properties.Color);
            const opacidadeDePreenchimento = 0.3;
            const corDaBorda = '#000000';
            const larguraDaBorda = 1;

            // Cria Polygon
            const polygon = new atlas.data.Polygon(wgs84Coords); // [ [ [lon, lat], ...] ]
            const feature = new atlas.data.Feature(polygon, {
                properties: { properties },
                idOriginal: idDadoStr,
                projeto: dados.projeto,
                arquivo: dados.arquivo,
                corDePreenchimento,
                opacidadeDePreenchimento,
                corDaBorda,
                larguraDaBorda
            });

            const shape = new atlas.Shape(feature, idDadoStr);

            if (!this.mapsManager.dicionarioDeShapes[dados.chavePrincipal]) {
                this.mapsManager.dicionarioDeShapes[dados.chavePrincipal] = {};
            }
            if (!this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante]) {
                this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante] = {};
            }
            this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante][ idDadoStr ] = shape;

            // Adiciona ao datasource
            let datasource = this.map.sources.getById(datasourceId);
            if (!datasource) {
                datasource = new atlas.source.DataSource(datasourceId);
                this.map.sources.add(datasource);
            }
            datasource.add(shape);

            // Adiciona camada de preenchimento
            let polygonLayer = this.map.layers.getLayers().find(l => l.getId() === layerId);
            if (!polygonLayer) {
                polygonLayer = new atlas.layer.PolygonLayer(datasourceId, layerId, {
                    fillColor: ['get', 'corDePreenchimento'],
                    fillOpacity: ['get', 'opacidadeDePreenchimento']
                });
                this.map.layers.add(polygonLayer);
            }

            // Adiciona camada de borda
            const borderLayerId = `${layerId}-borda`;
            let borderLayer = this.map.layers.getLayers().find(l => l.getId() === borderLayerId);
            if (!borderLayer) {
                borderLayer = new atlas.layer.LineLayer(datasourceId, borderLayerId, {
                    strokeColor: ['get', 'corDaBorda'],
                    strokeWidth: ['get', 'larguraDaBorda']
                });
                this.map.layers.add(borderLayer);
            }

            // Se for para plotar label
            if (plotarLabel && (properties.NM_MUN || properties.municipio)) {
                const bounds = shape.getBounds();
                const centro = [
                    (bounds[0] + bounds[2]) / 2,
                    (bounds[1] + bounds[3]) / 2
                ];
                const marker = new atlas.HtmlMarker({
                    htmlContent: `
                        <div style="display: flex;justify-content: center;align-items: flex-end;">
                            <h1 style='color: white; font-size: 16px; font-weight: bold; margin: 0; padding-bottom: 2px; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px  1px 0 #000, 1px  1px 0 #000;'>
                                ${properties.NM_MUN || properties.municipio}
                            </h1>
                        </div>
                    `,
                    position: centro,
                    anchor: 'bottom',
                    pixelOffset: [0, 0]
                });
                this.map.markers.add(marker);
                if (!this.mapsManager.dicionarioDeShapes[`${dados.chavePrincipal}-marker`]) {
                    this.mapsManager.dicionarioDeShapes[`${dados.chavePrincipal}-marker`] = {};
                }
                this.mapsManager.dicionarioDeShapes[`${dados.chavePrincipal}-marker`] = marker;
            }

            return shape;
        } catch (e) {
            console.error('Erro ao plotar Polygon:', e, dados);
            if (this.customAlert) this.customAlert('Erro ao plotar Polygon.');
        }
    }

    // Plota um MultiPolygon no mapa
    async plotarMultiPolygon(dados, transformarCoords, datasourceId, layerId, plotarLabel) {
        try {

            let properties;
            if (typeof dados.properties === 'string') {
                properties = JSON.parse(dados.properties);
            } else {
                properties = dados.properties || {};
            }
            const idDadoStr = dados.id ? dados.id.toString() : dados.cd_setor ? dados.cd_setor : dados.cd_bairro ? dados.cd_bairro : dados.cd_mun
            const geometry = typeof dados.geometry === 'string' ? JSON.parse(dados.geometry) : dados.geometry;
            let wgs84Coords;

            let sistema = identificarSistema(geometry);

            if (transformarCoords && sistema === "UTM") {
                const utmZone = properties.UTM_ZONE || 23;
                const isSouthern = properties.HEMISPHERE !== undefined ? (properties.HEMISPHERE === 'S') : true;
                const sourceDatum = properties.DATUM || 'SIRGAS2000';

                wgs84Coords = geometry.map(polygon =>
                    polygon.map(ring =>
                        ring.map(point => {
                            const lonLat = utmToWgs84(point[0], point[1], utmZone, isSouthern, sourceDatum);
                            return lonLat ? [lonLat[0], lonLat[1]] : null;
                        }).filter(p => p !== null)
                    ).filter(ring => ring.length >= 4) 
                );
                wgs84Coords = wgs84Coords.filter(polygon => polygon.length > 0);
            } else {
                if (Array.isArray(geometry)) {
                    wgs84Coords = geometry; 
                } else {
                    wgs84Coords = geometry.coordinates
                }
            }

            if (wgs84Coords.length === 0) {
                return null;
            }

            // Supondo que dados.geometry seja um GeoJSON válido
            const corDePreenchimento = getAutoCADColor(properties.Color);
            const opacidadeDePreenchimento = 0.3;
            const corDaBorda = '#000000';
            const larguraDaBorda = 1;
            // Cria o shape
            const multiPolygon = new atlas.data.MultiPolygon(wgs84Coords);
            const feature = new atlas.data.Feature(multiPolygon, {
                properties: { properties },
                idOriginal: idDadoStr,
                projeto: dados.projeto,
                arquivo: dados.arquivo,
                corDePreenchimento,
                opacidadeDePreenchimento,
                corDaBorda,
                larguraDaBorda
            });
            const shape = new atlas.Shape(feature, idDadoStr);
            // Atualiza dicionário de shapes
            if (!this.mapsManager.dicionarioDeShapes[dados.chavePrincipal]) {
                this.mapsManager.dicionarioDeShapes[dados.chavePrincipal] = {};
            }
            if (!this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante]) {
                this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante] = {};
            }
            this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante][ idDadoStr ] = shape;

            // Adiciona ao datasource
            let datasource = this.map.sources.getById(datasourceId);
            if (!datasource) {
                datasource = new atlas.source.DataSource(datasourceId);
                this.map.sources.add(datasource);
            }
            datasource.add(shape);

            // Adiciona camada se não existir
            let polygonLayer = this.map.layers.getLayers().find(l => l.getId() === layerId);
            if (!polygonLayer) {
                polygonLayer = new atlas.layer.PolygonLayer(datasourceId, layerId, {
                    fillColor: ['get', 'corDePreenchimento'],
                    fillOpacity: ['get', 'opacidadeDePreenchimento']
                });
                this.map.layers.add(polygonLayer);
            }
            
            // Adiciona camada de borda se não existir
            const borderLayerId = `${layerId}-borda`;
            let borderLayer = this.map.layers.getLayers().find(l => l.getId() === borderLayerId);
            if (!borderLayer) {
                borderLayer = new atlas.layer.LineLayer(datasourceId, borderLayerId, {
                    strokeColor: ['get', 'corDaBorda'],
                    strokeWidth: ['get', 'larguraDaBorda']
                });
                this.map.layers.add(borderLayer);
            }

            const hoverLayer = new atlas.layer.PolygonLayer(datasourceId, `${layerId}-hover`, {
                fillColor: '#FFFF00',
                fillOpacity: 0.5,
                strokeColor: '#000000',
                strokeWidth: 2,
                filter: ['==', 'id', '']
            });

            this.map.layers.add(hoverLayer);

            // Evento de mousemove (hover sobre polígono)
            this.map.events.add('mousemove', polygonLayer, (e) => {
                if (e.shapes && e.shapes.length > 0) {
                    this.map.getCanvasContainer().style.cursor = 'pointer';

                    const shape = e.shapes[0];
                    const props = shape.getProperties();

                    // Atualiza painel de informações
                    const idAtual = `dados-live-tools-infos-unidade-layer-${props.id || props.idOriginal}`; //id para camadas normais, idOriginal para setores/bairros
                    if (this.exibindoId !== idAtual) {
                        document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                        document.getElementById("dados-live-infos").innerHTML = "";

                        const infos = document.createElement("div");
                        infos.id = idAtual;
                        infos.style = "margin: 10px; font-size: 10px;";
                        infos.innerHTML = this.formatarInformacoesComDadosAssociados(props);

                        document.getElementById("dados-live-infos").appendChild(infos);
                        this.exibindoId = idAtual;
                    }

                    // Aplica destaque no polígono atual
                    hoverLayer.setOptions({
                        filter: ['==', 'id', props.id || props.idOriginal]
                    });

                }
            });

            // Evento mouseout (quando sai da camada inteira)
            this.map.events.add('mouseout', polygonLayer, () => {
                // Remove painel
                if (this.exibindoId) {
                    const elemento = document.getElementById(this.exibindoId);
                    if (elemento) elemento.remove();
                    this.exibindoId = null;
                    document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                    this.map.getCanvasContainer().style.cursor = '';
                }

                // Remove destaque
                hoverLayer.setOptions({
                    filter: ['==', 'id', '']
                });
            });

            // Se for para plotar label
            if (plotarLabel && (properties.NM_MUN || properties.municipio)) {
                const bounds = shape.getBounds();
                const centro = [
                (bounds[0] + bounds[2]) / 2,
                (bounds[1] + bounds[3]) / 2
                ];
                const marker = new atlas.HtmlMarker({
                    htmlContent: `
                        <div style="display: flex;justify-content: center;align-items: flex-end;">
                        <h1 style='color: white; font-size: 16px; font-weight: bold; margin: 0; padding-bottom: 2px; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px  1px 0 #000, 1px  1px 0 #000;'>
                            ${properties.NM_MUN || properties.municipio}
                        </h1>
                        </div>
                    `,
                    position: centro,
                    anchor: 'bottom',
                    pixelOffset: [0, 0]
                });
                this.map.markers.add(marker);
                if (!this.mapsManager.dicionarioDeShapes[`${dados.chavePrincipal}-marker`]) {
                    this.mapsManager.dicionarioDeShapes[`${dados.chavePrincipal}-marker`] = {};
                }
                if (!this.mapsManager.dicionarioDeShapes[`${dados.chavePrincipal}-marker`][`${dados.chaveRestante}-marker`]) {
                    this.mapsManager.dicionarioDeShapes[`${dados.chavePrincipal}-marker`][`${dados.chaveRestante}-marker`] = {};
                }
                this.mapsManager.dicionarioDeShapes[`${dados.chavePrincipal}-marker`][`${dados.chaveRestante}-marker`][ idDadoStr ] = marker;
            }

            return shape;
        } catch (e) {
            console.error('Erro ao plotar MultiPolygon:', e, dados);
            if (this.customAlert) this.customAlert('Erro ao plotar MultiPolygon.');
        }
    }

    // Plota um MultiLineString no mapa
    async plotarMultiLineString(dados, transformarCoords, datasourceId, layerId) {
        try {
            const geometry = typeof dados.geometry === 'string' ? JSON.parse(dados.geometry) : dados.geometry;
            const properties = typeof dados.properties === 'string' ? JSON.parse(dados.properties) : (dados.properties || {});
            const corDaLinha = getAutoCADColor(properties.Color);
            const larguraOriginal = parseFloat(properties.LineWt);
            const larguraDaLinha = !isNaN(larguraOriginal) ? Math.max(0.5, (larguraOriginal / 100) * 1.5) : 1;
            
            let wgs84Coords;
            let sistema = identificarSistema(geometry);

            if (transformarCoords && sistema === "UTM") {
                const utmZone = properties.UTM_ZONE || 23; 
                const isSouthern = properties.HEMISPHERE !== undefined ? (properties.HEMISPHERE === 'S') : true; 
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
            
            // Cria o shape
            const multiLineString = new atlas.data.MultiLineString(wgs84Coords);
            const feature = new atlas.data.Feature(multiLineString, {
                ...properties,
                idOriginal: dados.id,
                projeto: dados.projeto,
                arquivo: dados.arquivo,
                corDaLinha,
                larguraDaLinha
            });
            const shape = new atlas.Shape(feature, dados.id ? dados.id.toString() : undefined);
            // Atualiza dicionário de shapes
            if (!dados.chavePrincipal || !dados.chaveRestante) {
                console.error("Objeto de estudo não possui chavePrincipal ou chaveRestante:", dados);
                return null; 
            }

            if (!this.mapsManager.dicionarioDeShapes[dados.chavePrincipal]) {
                this.mapsManager.dicionarioDeShapes[dados.chavePrincipal] = {};
            }
            if (!this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante]) {
                this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante] = {};
            }
            this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante][dados.id.toString()] = shape;

            // Adiciona ao datasource
            let datasource = this.map.sources.getById(datasourceId);
            if (!datasource) {
                datasource = new atlas.source.DataSource(datasourceId);
                this.map.sources.add(datasource);
            }
            datasource.add(shape);
            // Adiciona camada se não existir
            let lineLayer = this.map.layers.getLayers().find(l => l.getId() === layerId);
            if (!lineLayer) {
                lineLayer = new atlas.layer.LineLayer(datasourceId, layerId, {
                    strokeColor: ['get', 'corDaLinha'],
                    strokeWidth: ['get', 'larguraDaLinha']
                });
                this.map.layers.add(lineLayer);
            }
            
            return shape;
        } catch (e) {
            console.error('Erro ao plotar MultiLineString:', e);
            //if (this.customAlert) this.customAlert('Erro ao plotar MultiLineString.');
        }
    }

    // Plota um ponto no mapa
    async plotarPoint(dados, transformarCoords = true, datasourceId, layerId) {
        try {
            let properties;
            if (typeof dados.properties === 'string') {
                properties = JSON.parse(dados.properties);
            } else {
                properties = dados.properties || {};
            }

            let geometry = JSON.parse(dados.geometry);
            let wgs84Coords;

            const sistema = identificarSistema(geometry);
            
            if (transformarCoords && sistema === "UTM") {
                const utmZone = properties.UTM_ZONE || 23;
                const isSouthern = properties.HEMISPHERE !== undefined ? (properties.HEMISPHERE === 'S') : true;
                const sourceDatum = properties.DATUM || 'SIRGAS2000';
                wgs84Coords = utmToWgs84(geometry[0], geometry[1], utmZone, isSouthern, sourceDatum);
            } else {
                if(Array.isArray(geometry)) {
                    wgs84Coords = [geometry[0], geometry[1]]; 
                } else {
                    wgs84Coords = [geometry.coordinates[0], geometry.coordinates[1]];
                }
            }
            
            if (!wgs84Coords || !Array.isArray(wgs84Coords) || wgs84Coords.length !== 2) {
                console.warn("Coordenada de ponto inválida após transformação:", dados.id);
                return null;
            }

            const marker = new atlas.HtmlMarker({
                htmlContent: `
                <div style="display: flex; justify-content: center; align-items: flex-end; height: 30px; width: 30px;">
                    <i class='fa-solid ${properties.icon_class ? properties.icon_class : "fa-location-dot"}' style='color: ${getAutoCADColor(properties.Color) ? getAutoCADColor(properties.Color) : "red"}; font-size: ${properties.icon_size ? properties.icon_size : "18px"};'></i>
                </div>
                `,
                position: wgs84Coords,
                anchor: 'bottom',
                pixelOffset: [0, 0]
            });

            const markerElement = marker.getElement();

            markerElement.addEventListener('mouseenter', () => {
                this.map.getCanvasContainer().style.cursor = 'pointer';

                const props = properties;
                const idAtual = `dados-live-tools-infos-unidade-layer-${props.id}`;

                if (this.exibindoId !== idAtual) {
                    document.getElementById("icon-expand-dados-live-tools").style.display = "none";
                    document.getElementById("dados-live-infos").innerHTML = "";

                    const infos = document.createElement("div");
                    infos.id = idAtual;
                    infos.style = "margin: 10px; font-size: 10px;";
                                                infos.innerHTML = this.formatarInformacoesComDadosAssociados(props);

                    document.getElementById("dados-live-infos").appendChild(infos);
                    this.exibindoId = idAtual;
                }
            });

            markerElement.addEventListener('mouseleave', () => {
                if (this.exibindoId) {
                    const el = document.getElementById(this.exibindoId);
                    if (el) el.remove();

                    this.exibindoId = null;
                    document.getElementById("icon-expand-dados-live-tools").style.display = "flex";
                    this.map.getCanvasContainer().style.cursor = '';
                }
            });

            if (!dados.chavePrincipal || !dados.chaveRestante) {
                console.error("Objeto de ponto não possui chavePrincipal ou chaveRestante:", dados);
                return null;
            }
            if (!this.mapsManager.dicionarioDeShapes[dados.chavePrincipal]) {
                this.mapsManager.dicionarioDeShapes[dados.chavePrincipal] = {};
            }
            if (!this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante]) {
                this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante] = {};
            }
            this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante][dados.id.toString()] = marker;
            
            this.map.markers.add(marker);

            return marker;
        } catch (e) {
            console.error('Erro ao plotar Point:', e, dados);
            if (this.customAlert) this.customAlert('Erro ao plotar Point.');
            return null;
        }
    }

    async removerPolygon(dados, datasourceId) {
        try {
            const idDadoStr = dados.id ? dados.id.toString() : dados.cd_setor ? dados.cd_setor : dados.cd_bairro
            const datasource = this.map.sources.getById(datasourceId);

            if (!datasource) return null;

            datasource.clear();

            // Remove shape do datasource
            if (this.mapsManager.dicionarioDeShapes[dados.chavePrincipal]?.[dados.chaveRestante]) {
                const shapeToRemove = this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante];
                datasource.remove(shapeToRemove);
                if (Object.keys(this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[dados.chavePrincipal][dados.chaveRestante];
                }
                if (Object.keys(this.mapsManager.dicionarioDeShapes[dados.chavePrincipal]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[dados.chavePrincipal];
                }
            } else {
                const shapeById = datasource.getShapeById(idDadoStr);
                if (shapeById) {
                    datasource.remove(shapeById);
                }
            }
            
            const chaveMarker = `${dados.chavePrincipal}-marker`;
 
            if (this.mapsManager.dicionarioDeShapes[chaveMarker]) {
                
                const markerToRemove = this.mapsManager.dicionarioDeShapes[chaveMarker];

                if (markerToRemove instanceof atlas.HtmlMarker) {
                    this.map.markers.remove(markerToRemove);
                }

                if (Object.keys(this.mapsManager.dicionarioDeShapes[chaveMarker]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[chaveMarker];
                }
                if (Object.keys(this.mapsManager.dicionarioDeShapes[chaveMarker]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[chaveMarker];
                }
            }

        } catch (e) {
            console.error('Erro ao remover Polygon:', e, dados);
            if (this.customAlert) this.customAlert('Erro ao remover Polygon.');
        }
    }

    // Remove um MultiPolygon do mapa
    async removerMultiPolygon(dados, datasourceId) {
        try {
            const idDadoStr = dados.id ? dados.id.toString() : dados.cd_setor ? dados.cd_setor : dados.cd_bairro
            const datasource = this.map.sources.getById(datasourceId);
            if (!datasource) return;

            // Remove shape do datasource
            const { chavePrincipal, chaveRestante } = dados;

            if (this.mapsManager.dicionarioDeShapes[chavePrincipal]?.[chaveRestante]?.[idDadoStr]) {
                const shapeToRemove = this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr];
                datasource.remove(shapeToRemove);
                delete this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr];
                if (Object.keys(this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante];
                }
                if (Object.keys(this.mapsManager.dicionarioDeShapes[chavePrincipal]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[chavePrincipal];
                }
            } else {
                const shapeById = datasource.getShapeById(idDadoStr);
                if (shapeById) {
                    datasource.remove(shapeById);
                }
            }

            const chaveMarker = `${dados.chavePrincipal}-marker`;
            const subChaveMarker = `${dados.chaveRestante}-marker`;

            if (this.mapsManager.dicionarioDeShapes[chaveMarker]?.[subChaveMarker]?.[idDadoStr]) {
                
                const markerToRemove = this.mapsManager.dicionarioDeShapes[chaveMarker][subChaveMarker][idDadoStr];

                if (markerToRemove instanceof atlas.HtmlMarker) {
                    this.map.markers.remove(markerToRemove);
                }

                delete this.mapsManager.dicionarioDeShapes[chaveMarker][subChaveMarker][idDadoStr];

                if (Object.keys(this.mapsManager.dicionarioDeShapes[chaveMarker][subChaveMarker]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[chaveMarker][subChaveMarker];
                }
                if (Object.keys(this.mapsManager.dicionarioDeShapes[chaveMarker]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[chaveMarker];
                }
            } 

        } catch (e) {
            console.error('Erro ao remover MultiPolygon:', e, dados);
            if (this.customAlert) this.customAlert('Erro ao remover MultiPolygon.');
        }
    }

    // Remove um MultiLineString do mapa
    async removerMultiLineString(dados, datasourceId) {
        try {
            const idDadoStr = dados.id ? dados.id.toString() : undefined;
            const datasource = this.map.sources.getById(datasourceId);
            if (!datasource) return;
            // Remove shape do datasource
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

            if (this.mapsManager.dicionarioDeShapes[chavePrincipal] &&
                this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante] &&
                this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr]) {
                
                const shapeToRemove = this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr];
                datasource.remove(shapeToRemove); 
                
                delete this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr];

                if (Object.keys(this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante];
                }
                if (Object.keys(this.mapsManager.dicionarioDeShapes[chavePrincipal]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[chavePrincipal];
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
            console.error('Erro ao remover MultiLineString:', e, dados);
            if (this.customAlert) this.customAlert('Erro ao remover MultiLineString.');
        }
    }

    // Remove um ponto do mapa
    async removerPoint(dados, datasourceId) {
        try {
            const idDadoStr = dados.id ? dados.id.toString() : undefined;
            // Remove marker do mapa
            const datasource = this.map.sources.getById(datasourceId); 

            const { chavePrincipal, chaveRestante } = dados;

            if (this.mapsManager.dicionarioDeShapes[chavePrincipal] &&
                this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante] &&
                this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr]) {

                const shapeOrMarker = this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr];

                if (shapeOrMarker instanceof atlas.HtmlMarker) {
                    this.map.markers.remove(shapeOrMarker);
                } else if (datasource && shapeOrMarker) {
                    datasource.remove(shapeOrMarker);
                }

                delete this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante][idDadoStr];

                if (Object.keys(this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante];
                }
                if (Object.keys(this.mapsManager.dicionarioDeShapes[chavePrincipal]).length === 0) {
                    delete this.mapsManager.dicionarioDeShapes[chavePrincipal];
                }
            } else {
                console.warn(`Shape/Marker para o ponto ID ${idDadoStr} não encontrado para remoção.`);
            }
        } catch (e) {
            console.error('Erro ao remover Point:', e, dados);
            if (this.customAlert) this.customAlert('Erro ao remover Point.');
        }
    }

    async plotarSetor(geodado, transformarCoords, datasourceId, layerId, plotarLabel) {
        try {
            return await this.associarDadosAGeometriaExistente(geodado, 'setor', 'cd_setor');
        } catch (err) {
            console.error('Erro ao plotar setor:', err);
            if (this.customAlert) this.customAlert('Erro ao plotar dados do setor.');
        }
    }

    async plotarBairro(geodado, transformarCoords, datasourceId, layerId, plotarLabel) {
        try {
            return await this.associarDadosAGeometriaExistente(geodado, 'bairro', 'cd_bairro');
        } catch (err) {
            console.error('Erro ao plotar bairro:', err);
            if (this.customAlert) this.customAlert('Erro ao plotar dados do bairro.');
        }
    }

    async plotarMunicipio(geodado, transformarCoords, datasourceId, layerId, plotarLabel) {
        try {
            return await this.associarDadosAGeometriaExistente(geodado, 'municipio', 'cd_mun');
        } catch (err) {
            console.error('Erro ao plotar município:', err);
            if (this.customAlert) this.customAlert('Erro ao plotar dados do município.');
        }
    }

    // Método genérico para associar dados às geometrias já plotadas
    async associarDadosAGeometriaExistente(geodado, tipoGeometria, campoId) {
        try {
            // Identifica o código do geodado baseado no tipo de geometria
            let codigoGeodado = geodado[campoId];

            if (!codigoGeodado) {
                console.warn(`Código não encontrado para ${tipoGeometria}:`, geodado);
                return null;
            }

            // Busca a geometria já plotada no dicionário de shapes
            const geometriaExistente = this.encontrarGeometriaExistente(codigoGeodado, tipoGeometria);
            
            if (!geometriaExistente) {
                console.warn(`Geometria ${tipoGeometria} com código ${codigoGeodado} não encontrada no mapa`);
                return null;
            }

            // Atualiza as propriedades da geometria existente com os novos dados
            this.atualizarPropriedadesGeometria(geometriaExistente, geodado);

            // Atualiza a visualização da geometria (cores, estilos, etc.)
            this.atualizarVisualizacaoGeometria(geometriaExistente, geodado);

            return geometriaExistente;

        } catch (error) {
            console.error(`Erro ao associar dados à geometria ${tipoGeometria}:`, error);
            return null;
        }
    }

    // Encontra uma geometria já plotada baseada no código identificador
    encontrarGeometriaExistente(codigo, tipoGeometria) {
        try {
            // Define os padrões de busca baseados no tipo de geometria
            let padroesBusca = [];
            
            if (tipoGeometria === 'setor') {
                padroesBusca = [
                    `${this.cidadeNormalizadoSemAcentos}-setorescensitarios`,
                    `${this.cidadeNormalizadoSemAcentos}-setores`
                ];
            } else if (tipoGeometria === 'bairro') {
                padroesBusca = [
                    `${this.cidadeNormalizadoSemAcentos}-bairros`
                ];
            } else if (tipoGeometria === 'municipio') {
                padroesBusca = [
                    `${this.cidadeNormalizadoSemAcentos}-limites-municipio`,
                    `${this.cidadeNormalizadoSemAcentos}`
                ];
            }

            // Busca nos padrões definidos
            for (const chavePrincipal of Object.keys(this.mapsManager.dicionarioDeShapes)) {
                for (const chaveRestante of Object.keys(this.mapsManager.dicionarioDeShapes[chavePrincipal] || {})) {
                    const chaveCompleta = `${chavePrincipal}-${chaveRestante}`;
                    
                    if (padroesBusca.some(padrao => chaveCompleta.includes(padrao) || chaveRestante.includes(padrao.split('-').pop()))) {
                        const shapes = this.mapsManager.dicionarioDeShapes[chavePrincipal][chaveRestante];
                        
                        // Procura pelo shape com o código correspondente
                        for (const [id, shape] of Object.entries(shapes)) {
                            if (id === codigo.toString() || id.includes(codigo.toString())) {
                                return shape;
                            }
                            
                            // Verifica nas propriedades do shape
                            if (shape && shape.getProperties) {
                                const props = shape.getProperties();
                                if (props.idOriginal === codigo.toString() || 
                                    props.cd_setor === codigo || 
                                    props.cd_bairro === codigo || 
                                    props.cd_mun === codigo) {
                                    return shape;
                                }
                            }
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Erro ao encontrar geometria existente:', error);
            return null;
        }
    }

    // Atualiza as propriedades de uma geometria com novos dados
    atualizarPropriedadesGeometria(shape, novosDados) {
        try {
            if (!shape || !shape.setProperties) {
                console.warn('Shape inválido para atualização de propriedades');
                return;
            }

            const propriedadesAtuais = shape.getProperties() || {};
            
            // Mescla as propriedades existentes com os novos dados
            const propriedadesAtualizadas = {
                ...propriedadesAtuais,
                dadosAssociados: novosDados.properties || novosDados,
                ultimaAtualizacao: new Date().toISOString()
            };

            shape.setProperties(propriedadesAtualizadas);
            
        } catch (error) {
            console.error('Erro ao atualizar propriedades da geometria:', error);
        }
    }

    // Atualiza a visualização de uma geometria baseada nos novos dados
    atualizarVisualizacaoGeometria(shape, dados) {
        try {
            if (!shape || !shape.setProperties) {
                console.warn('Shape inválido para atualização de visualização');
                return;
            }

            // Parse das propriedades dos dados
            let properties = dados.properties;
            if (typeof properties === 'string') {
                try {
                    properties = JSON.parse(properties);
                } catch (e) {
                    console.warn('Erro ao fazer parse das propriedades:', e);
                    properties = {};
                }
            }

            // Calcula cor baseada nos dados (exemplo com renda média)
            let corAtualizada = this.calcularCorPorDados(properties);
            
            // Atualiza as propriedades de visualização
            const propriedadesVisuais = {
                corDePreenchimento: corAtualizada,
                opacidadeDePreenchimento: 0.7,
                corDaBorda: '#000000',
                larguraDaBorda: 1,
                temDadosAssociados: true
            };

            // Aplica as novas propriedades
            const propriedadesAtuais = shape.getProperties() || {};
            shape.setProperties({
                ...propriedadesAtuais,
                ...propriedadesVisuais
            });

        } catch (error) {
            console.error('Erro ao atualizar visualização da geometria:', error);
        }
    }

    // Calcula cor baseada nos valores dos dados
    calcularCorPorDados(properties) {
        try {
            // Exemplo: colorir baseado na renda média
            if (properties && properties['Valor da renda média']) {
                const renda = parseFloat(properties['Valor da renda média']);
                
                if (isNaN(renda)) return '#CCCCCC'; // Cinza para dados inválidos
                
                // Escala de cores baseada na renda (exemplo)
                if (renda < 1000) return '#FF6B6B';      // Vermelho (baixa)
                if (renda < 2000) return '#FFE66D';      // Amarelo (média-baixa)
                if (renda < 3000) return '#95E1D3';      // Verde claro (média)
                if (renda < 5000) return '#4ECDC4';      // Verde (média-alta)
                return '#45B7D1';                        // Azul (alta)
            }

            // Exemplo: colorir baseado na população
            if (properties && properties['Total de pessoas']) {
                const populacao = parseFloat(properties['Total de pessoas']);
                
                if (isNaN(populacao)) return '#CCCCCC';
                
                if (populacao < 500) return '#FFF2CC';    // Amarelo muito claro
                if (populacao < 1000) return '#FFE599';   // Amarelo claro
                if (populacao < 2000) return '#FFD966';   // Amarelo
                if (populacao < 5000) return '#FF9900';   // Laranja
                return '#CC6600';                         // Laranja escuro
            }

            // Cor padrão se não houver dados específicos
            return '#4CAF50'; // Verde padrão

        } catch (error) {
            console.error('Erro ao calcular cor por dados:', error);
            return '#CCCCCC'; // Cinza como fallback
        }
    }

    // Remove dados associados de uma geometria específica
    async removerDadosAssociadosSetor(geodado, datasourceId) {
        return await this.removerDadosAssociadosGeometria(geodado, 'setor', 'cd_setor');
    }

    async removerDadosAssociadosBairro(geodado, datasourceId) {
        return await this.removerDadosAssociadosGeometria(geodado, 'bairro', 'cd_bairro');
    }

    async removerDadosAssociadosMunicipio(geodado, datasourceId) {
        return await this.removerDadosAssociadosGeometria(geodado, 'municipio', 'cd_mun');
    }

    // Método genérico para remover dados associados às geometrias
    async removerDadosAssociadosGeometria(geodado, tipoGeometria, campoId) {
        try {
            // Identifica o código do geodado
            let codigoGeodado;
            if (tipoGeometria === 'setor') {
                codigoGeodado = geodado.cd_setor;
            } else if (tipoGeometria === 'bairro') {
                codigoGeodado = geodado.cd_bairro;
            } else if (tipoGeometria === 'municipio') {
                codigoGeodado = geodado.cd_mun || this.cod_mun;
            }

            if (!codigoGeodado) {
                console.warn(`Código não encontrado para ${tipoGeometria}:`, geodado);
                return null;
            }

            // Busca a geometria existente
            const geometriaExistente = this.encontrarGeometriaExistente(codigoGeodado, tipoGeometria);
            
            if (!geometriaExistente) {
                console.warn(`Geometria ${tipoGeometria} com código ${codigoGeodado} não encontrada para remoção de dados`);
                return null;
            }

            // Remove os dados associados e restaura propriedades originais
            this.restaurarPropriedadesOriginaisGeometria(geometriaExistente);

            return geometriaExistente;

        } catch (error) {
            console.error(`Erro ao remover dados associados da geometria ${tipoGeometria}:`, error);
            return null;
        }
    }

    // Restaura as propriedades originais de uma geometria
    restaurarPropriedadesOriginaisGeometria(shape) {
        try {
            if (!shape || !shape.setProperties) {
                console.warn('Shape inválido para restauração de propriedades');
                return;
            }

            const propriedadesAtuais = shape.getProperties() || {};
            
            // Remove dados associados e propriedades de visualização customizadas
            const {
                dadosAssociados,
                ultimaAtualizacao,
                temDadosAssociados,
                ...propriedadesOriginais
            } = propriedadesAtuais;

            // Restaura cores e estilos originais
            const propriedadesRestauradas = {
                ...propriedadesOriginais,
                corDePreenchimento: this.obterCorOriginal(propriedadesOriginais),
                opacidadeDePreenchimento: 0.3,
                corDaBorda: '#000000',
                larguraDaBorda: 1,
                temDadosAssociados: false
            };

            shape.setProperties(propriedadesRestauradas);
            
        } catch (error) {
            console.error('Erro ao restaurar propriedades originais da geometria:', error);
        }
    }

    // Obtém a cor original de uma geometria baseada em suas propriedades
    obterCorOriginal(propriedades) {
        try {
            // Tenta obter a cor original das propriedades internas
            if (propriedades && propriedades.properties && propriedades.properties.Color) {
                return getAutoCADColor(propriedades.properties.Color);
            }
            
            // Cor padrão se não houver cor original
            return getAutoCADColor(14); // Cor padrão do AutoCAD
            
        } catch (error) {
            console.error('Erro ao obter cor original:', error);
            return '#CCCCCC'; // Cor fallback
        }
    }

    // Cria uma legenda para mostrar a escala de cores dos dados
    criarLegendaDados(tipoDado, propriedades) {
        try {
            const legendaId = `legenda-dados-${tipoDado}`;
            let legenda = document.getElementById(legendaId);
            
            if (legenda) {
                legenda.style.display = 'block';
                return;
            }

            // Cria nova legenda
            legenda = document.createElement('div');
            legenda.id = legendaId;
            legenda.className = 'legenda-dados';
            legenda.style.cssText = `
                position: absolute;
                top: 100px;
                right: 20px;
                background: rgba(255, 255, 255, 0.95);
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                font-size: 12px;
                z-index: 1000;
                max-width: 250px;
                border: 1px solid #ddd;
            `;

            // Conteúdo da legenda baseado no tipo de dado
            let conteudoLegenda = '';
            if (tipoDado === 'renda') {
                conteudoLegenda = `
                    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333;">Renda Média</h4>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: #FF6B6B; margin-right: 8px; border-radius: 3px;"></div>
                        <span>Até R$ 1.000</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: #FFE66D; margin-right: 8px; border-radius: 3px;"></div>
                        <span>R$ 1.000 - R$ 2.000</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: #95E1D3; margin-right: 8px; border-radius: 3px;"></div>
                        <span>R$ 2.000 - R$ 3.000</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: #4ECDC4; margin-right: 8px; border-radius: 3px;"></div>
                        <span>R$ 3.000 - R$ 5.000</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: #45B7D1; margin-right: 8px; border-radius: 3px;"></div>
                        <span>Acima de R$ 5.000</span>
                    </div>
                `;
            } else if (tipoDado === 'populacao') {
                conteudoLegenda = `
                    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333;">População</h4>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: #FFF2CC; margin-right: 8px; border-radius: 3px; border: 1px solid #ccc;"></div>
                        <span>Até 500 pessoas</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: #FFE599; margin-right: 8px; border-radius: 3px;"></div>
                        <span>500 - 1.000</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: #FFD966; margin-right: 8px; border-radius: 3px;"></div>
                        <span>1.000 - 2.000</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: #FF9900; margin-right: 8px; border-radius: 3px;"></div>
                        <span>2.000 - 5.000</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: #CC6600; margin-right: 8px; border-radius: 3px;"></div>
                        <span>Acima de 5.000</span>
                    </div>
                `;
            }

            legenda.innerHTML = conteudoLegenda;

            // Adiciona botão de fechar
            const btnFechar = document.createElement('button');
            btnFechar.innerHTML = '×';
            btnFechar.style.cssText = `
                position: absolute;
                top: 5px;
                right: 8px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #666;
                line-height: 1;
            `;
            btnFechar.onclick = () => legenda.style.display = 'none';
            legenda.appendChild(btnFechar);

            document.body.appendChild(legenda);

        } catch (error) {
            console.error('Erro ao criar legenda de dados:', error);
        }
    }

    // Remove legenda de dados
    removerLegendaDados(tipoDado) {
        try {
            const legendaId = `legenda-dados-${tipoDado}`;
            const legenda = document.getElementById(legendaId);
            if (legenda) {
                legenda.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao remover legenda de dados:', error);
        }
    }

    // Formatar informações incluindo dados associados
    formatarInformacoesComDadosAssociados(propriedades) {
        try {
            let html = '';

            // Exibe dados originais da geometria
            if (propriedades.properties) {
                html += '<div style="border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 8px;">';
                html += '<strong style="color: #333; font-size: 11px;">Dados da Geometria:</strong><br>';
                html += formatJsonForDisplay(propriedades.properties);
                html += '</div>';
            }

            // Exibe dados associados se existirem
            if (propriedades.dadosAssociados) {
                html += '<div style="border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 8px;">';
                html += '<strong style="color: #007bff; font-size: 11px;">Dados Associados:</strong><br>';
                html += formatJsonForDisplay(propriedades.dadosAssociados);
                html += '</div>';
            }

            // Exibe outras propriedades importantes
            if (propriedades.temDadosAssociados) {
                html += '<div style="margin-top: 8px;">';
                html += '<span style="color: #28a745; font-size: 10px; background: #e8f5e8; padding: 2px 6px; border-radius: 3px;">Dados Atualizados</span>';
                if (propriedades.ultimaAtualizacao) {
                    const data = new Date(propriedades.ultimaAtualizacao).toLocaleString('pt-BR');
                    html += `<br><span style="color: #666; font-size: 9px;">Última atualização: ${data}</span>`;
                }
                html += '</div>';
            }

            // Se não há dados específicos, usa formatação padrão
            if (!html) {
                html = formatJsonForDisplay(propriedades);
            }

            return html;

        } catch (error) {
            console.error('Erro ao formatar informações com dados associados:', error);
            return formatJsonForDisplay(propriedades); // Fallback para formatação padrão
                }
    }

    /* 
    DOCUMENTAÇÃO DE USO PARA DADOS ASSOCIADOS À GEOMETRIAS:

    Este sistema permite associar dados (como estatísticas populacionais, renda, etc.) 
    às geometrias já plotadas no mapa (setores, bairros, municípios).

    EXEMPLO DE USO:

    1. Primeiro, plote a geometria base (ex: setores censitários):
       - O usuário marca checkbox para "Setores Censitários"
       - Isso plota as geometrias dos setores no mapa

    2. Depois, carregue dados associados (ex: dados de renda):
       - O usuário marca checkbox para "Renda Média por Setor"
       - O sistema chama o endpoint que retorna dados como:
       [
         {
           cd_setor: "355030801000001",
           properties: {
             "Valor da renda média": 2500.00,
             "Variância da renda média": 150.50
           }
         },
         ...
       ]

    3. O sistema automaticamente:
       - Encontra o setor com cd_setor correspondente
       - Atualiza suas propriedades com os novos dados
       - Muda a cor do setor baseada no valor da renda
       - Exibe legenda explicativa
       - Atualiza as informações do hover

    ESTRUTURA DE DADOS ESPERADA:
    - Para dados associados, o objeto deve ter:
      * cd_setor, cd_bairro ou cd_mun (dependendo do tipo)
      * properties: objeto com os dados estatísticos
      * NÃO deve ter geometry_type (diferente das geometrias)

    CORES AUTOMÁTICAS:
    - Renda média: gradiente de vermelho (baixa) a azul (alta)
    - População: gradiente de amarelo claro a laranja escuro
    - Personalizável através do método calcularCorPorDados()
    */

  
    // Função utilitária para plotar qualquer tipo de shape
    async plot(geodado, transformarCoords, datasourceId, layerId, plotarLabel) {
        if(geodado.geometry_type){
            switch (geodado.geometry_type) {
                case 'MultiPolygon':
                    return await this.plotarMultiPolygon(geodado, transformarCoords, datasourceId, layerId, plotarLabel);
                case 'Polygon':
                    return await this.plotarPolygon(geodado, transformarCoords, datasourceId, layerId, plotarLabel);
                case 'MultiLineString':
                    return await this.plotarMultiLineString(geodado, transformarCoords, datasourceId, layerId);
                case 'Point':
                    return await this.plotarPoint(geodado, transformarCoords, datasourceId, layerId);
                default:
                    return null;
            }
        } else {
            switch (this.divisaoTerritorialAtual) {
                case 'setores':
                    return await this.plotarSetor(geodado, transformarCoords, datasourceId, layerId, plotarLabel);
                case 'bairros':
                    return await this.plotarBairro(geodado, transformarCoords, datasourceId, layerId, plotarLabel);
                case 'municipios':
                    return await this.plotarMunicipio(geodado, transformarCoords, datasourceId, layerId, plotarLabel);
                default:
                    return null;
            }
        }
    }

    // Função utilitária para remover qualquer tipo de shape
    async unplot(geodado, datasourceId) {
        let result;

        if(geodado.geometry_type){
            result = await (() => {
                switch (geodado.geometry_type) {
                    case 'MultiPolygon':
                        return this.removerMultiPolygon(geodado, datasourceId);
                    case 'Polygon':
                        return this.removerPolygon(geodado, datasourceId);
                    case 'MultiLineString':
                        return this.removerMultiLineString(geodado, datasourceId);
                    case 'Point':
                        return this.removerPoint(geodado, datasourceId);
                    default:
                        return null;
                }
            })();
        } else {
            // Se não tem geometry_type, é dados associados a geometria existente
            result = await (() => {
                switch (this.divisaoTerritorialAtual) {
                    case 'setores':
                        return this.removerDadosAssociadosSetor(geodado, datasourceId);
                    case 'bairros':
                        return this.removerDadosAssociadosBairro(geodado, datasourceId);
                    case 'municipios':
                        return this.removerDadosAssociadosMunicipio(geodado, datasourceId);
                    default:
                        return null;
                }
            })();
        }

        this.removerLegendaEstabelecimentos();
        
        return result;
    }

    criarCheckbox(nomeSubtema, checkboxId, camada, subtemaNormalizadoSemAcentos, plotarNome, margin = 60) {
        
        const formCheck = document.createElement('div');
        formCheck.classList = 'form-check';
        formCheck.style = `margin-left: ${margin}px;`;
        formCheck.setAttribute('camada-id', camada.id);
        
        const checkBoxInput = document.createElement('input');
        checkBoxInput.classList = 'form-check-input';
        checkBoxInput.type = 'checkbox';
        checkBoxInput.id = checkboxId;
        
        const label = document.createElement('label');
        label.classList = 'form-check-label';
        label.setAttribute('for', checkBoxInput.id);
        label.style = 'font-size: 15px; color: inherit';
        label.textContent = nomeSubtema;
    
        formCheck.appendChild(checkBoxInput);
        formCheck.appendChild(label);

        if (!camada.possui_geodados && !camada.endpoint_camada) checkBoxInput.disabled = true;

        this.addCheckboxListener(checkBoxInput, camada, subtemaNormalizadoSemAcentos, plotarNome);

        return formCheck;
    }

    criarItemArvore(nomeTema, liClassName, ulClassName, margin = 40) {
        const li = document.createElement('li');
        li.className = liClassName;
        li.innerHTML = `
            <a style="align-items: center; margin-left: ${margin}px; display: flex; flex-direction: row;">
                <p class="main-text">
                    <i class="fa-solid fa-folder-open" style="margin-right: 10px"></i>
                    ${nomeTema.charAt(0).toUpperCase() + nomeTema.slice(1).toLowerCase()}
                    <i class="nav-arrow bi bi-chevron-right" style="margin-left: 10px"></i>
                </p>
            </a>`;
        
        const ul = document.createElement('ul');
        ul.className = ulClassName;
        li.appendChild(ul);
        
        const p = li.querySelector('p.main-text');
        p.addEventListener('click', (event) => {
            event.preventDefault();
            if (li.classList.contains('menu-open')) {
                li.classList.remove('menu-open');
                p.style.color = 'inherit';
            } else {
                li.classList.add('menu-open');
                p.style.color = '#F7A600';
            }
        });

        return { li, ul };
    }

    // Renderiza a UI a partir da árvore de temas
    async handleEstruturaProjeto(classeUL) {
        if (!this.arvoreTemas || Object.keys(this.arvoreTemas).length === 0) {
            if (this.customAlert) this.customAlert("Esse município ainda não possui dados...");
            return;
        }
        const elementosUL = document.querySelectorAll(`.${classeUL}`);
        elementosUL.forEach(elemento => {
            if (!elemento) {
                console.error(`Elemento com a classe "${classeUL}" não foi encontrado.`);
                return;
            }
        });
        // Para cada tema, monta a árvore de camadas na UI
        for (const nomeTema in this.arvoreTemas) {
            const subtemas = this.getTema(nomeTema);
            const temaLwCs = nomeTema.toLowerCase();
            const temaNormalizado = temaLwCs.normalize('NFD').replace(/[ 0-6f]/g, '');
            const temaNormalizadoSemAcentos = temaNormalizado.replace(/\s/g, '').replace(/[\s()/]/g, '');

            // Cria o <li> para o TEMA
            const { li: temaLI, ul: temaUL } = this.criarItemArvore(nomeTema, `nav-item nav-item-${this.cidadeNormalizadoSemAcentos}-${temaNormalizadoSemAcentos}`, `nav nav-treeview collapsed ul-${this.cidadeNormalizadoSemAcentos}-${temaNormalizadoSemAcentos}`);
            
            let plotarNome = false;

            // Percorre subtemas
            for (const nomeSubtema in subtemas) {
                const subtema = this.getSubtema(nomeTema, nomeSubtema);
                const subtemaLwCs = nomeSubtema.toLowerCase();
                const subtemaNormalizado = subtemaLwCs.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const subtemaNormalizadoSemAcentos = subtemaNormalizado.replace(/\s/g, '').replace(/[\s()/]/g, '');

                // --- Lógica especial para Limite Municipal ---
                if (nomeSubtema === 'Limite Municipal') {
                    plotarNome = true;
                    const formCheck = this.criarCheckbox(nomeSubtema, `exibir-camada-${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}`, subtema[0], subtemaNormalizadoSemAcentos, plotarNome);
                    temaUL.appendChild(formCheck);
                    continue;
                }

                if(nomeSubtema === 'Municípios Limítrofes') plotarNome = true;

                // Caso 1: subtema é folha (array de 1 camada) -> renderiza como checkbox direto
                if (Array.isArray(subtema) && subtema.length === 1) {
                    const camada = subtema[0];

                    const formCheck = this.criarCheckbox(nomeSubtema, `exibir-camada-${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}-${camada.id}`, camada, subtemaNormalizadoSemAcentos, plotarNome);
                    temaUL.appendChild(formCheck);
                    continue;
                }

                // Caso 2: subtema é array de várias camadas -> pasta com checkboxes
                if (Array.isArray(subtema)) {
                    const { li: subTemaLI, ul: subTemaUL } = this.criarItemArvore(nomeSubtema, `nav-item nav-item-${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}`, `nav nav-treeview collapsed ul-${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}`, 60);
                    
                    // Renderiza checkboxes para cada camada
                    subtema.forEach(camada => {
                        const formCheck = this.criarCheckbox(camada.nome, `exibir-camada-${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}-${camada.id}`, camada, subtemaNormalizadoSemAcentos, plotarNome, 80);
                        subTemaUL.appendChild(formCheck);
                    });
                    temaUL.appendChild(subTemaLI);
                    continue;
                }

                // Caso 3: subtema é objeto (itens) -> pasta com itens e checkboxes
                if (typeof subtema === 'object') {
                    const { li: subTemaLI, ul: subTemaUL } = this.criarItemArvore(nomeSubtema, `nav-item nav-item-${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}`, `nav nav-treeview collapsed ul-${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}`, 60);
                    
                    // Renderiza itens
                    const itens = this.getItensDeSubtema(nomeTema, nomeSubtema);
                    for (const nomeItem in itens) {
                        const camadasItem = itens[nomeItem];
                        const { li: itemLI, ul: itemUL}= this.criarItemArvore(nomeItem, `nav-item nav-item-${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}-${nomeItem}`, `nav nav-treeview collapsed ul-${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}-${nomeItem}`, 80);
                        
                        camadasItem.forEach(camada => {
                            const formCheck = this.criarCheckbox(camada.nome, `exibir-camada-${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}-${nomeItem}-${camada.id}`, camada, subtemaNormalizadoSemAcentos, plotarNome, 100);
                            itemUL.appendChild(formCheck);
                        });
                        subTemaUL.appendChild(itemLI);
                    }
                    temaUL.appendChild(subTemaLI);
                    continue;
                }
            }

            window.handleLiCollapsable();

            
            elementosUL.forEach(elemento => {
                elemento.appendChild(temaLI);
            });
        }
        
        // Força o recálculo do layout para garantir que todos os elementos sejam renderizados corretamente
        setTimeout(() => {
            const offcanvasBody = document.querySelector('#bottomDrawer .offcanvas-body');
            if (offcanvasBody) {
                offcanvasBody.style.display = 'none';
                offcanvasBody.offsetHeight; // Força reflow
                offcanvasBody.style.display = '';
                
                // Reaplica após o reflow
                window.handleLiCollapsable();
                this.setupProjectLayerCheckboxPills();
            }
        }, 100);
    }

    processarEndpointCamada(endpoint, camada, subtemaNormalizadoSemAcentos) {
        const contexto = {
            camada: {
                id: camada.id,
                nome: camada.nome,
                terr: subtemaNormalizadoSemAcentos === 'setorescensitarios' ? 'setores' : subtemaNormalizadoSemAcentos === 'bairros' ? 'bairros' : null
            },
            this: {
                id: this.id,
                cod_mun: this.cod_mun,
                cidade: this.cidade,
                cidadeNormalizadoSemAcentos: this.cidadeNormalizadoSemAcentos,
                divisaoTerritorialAtual: this.divisaoTerritorialAtual
            }
        };
        
        return endpoint.replace(/\$\{([^}]+)\}/g, (match, path) => {
            // Se o path contém pontos, trata como caminho aninhado
            if (path.includes('.')) {
                const keys = path.split('.');
                let value = contexto;
                
                for (const key of keys) {
                    if (value && typeof value === 'object' && key in value) {
                        value = value[key];
                    } else {
                        console.warn(`Placeholder não encontrado: ${match}`);
                        return match;
                    }
                }
                
                return value;
            } else {
                // Se não contém pontos, busca diretamente no contexto
                // Primeiro tenta no nível raiz do contexto
                if (path in contexto) {
                    return contexto[path];
                }
                
                // Depois tenta em cada objeto aninhado
                for (const key in contexto) {
                    if (contexto[key] && typeof contexto[key] === 'object' && path in contexto[key]) {
                        return contexto[key][path];
                    }
                }
                
                console.warn(`Placeholder não encontrado: ${match}`);
                return match;
            }
        });
    }

    addCheckboxListener(checkbox, camada, subtemaNormalizadoSemAcentos, plotarNome) {
        checkbox.addEventListener('change', async (event) => {
            if(subtemaNormalizadoSemAcentos !== 'limitemunicipal') {
                try {
                    if (!this.dadosDasCamadas[`${camada.id}`]) {
                        try {
                            this.telaCarregamento.style.display = "flex";

                            const endpointProcessado = this.processarEndpointCamada(camada.endpoint_camada, camada, subtemaNormalizadoSemAcentos);

                            const response = await this.fetchComAutoRefresh(
                                this.endpoint + endpointProcessado,
                                { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } }
                            );
                            
                            this.telaCarregamento.style.display = "none";

                            const geodadosResult = await response.json();
                            if (geodadosResult.payload.length == 0) {
                                this.customAlert("Ainda não temos dados para essa camada")
                                checkbox.checked = false;
                                checkbox.disabled = true;
                                if(subtemaNormalizadoSemAcentos === 'setorescensitarios' || subtemaNormalizadoSemAcentos === 'bairros') {
                                    this.divisaoTerritorialAtual = 'municipios';
                                }
                            }
                            this.dadosDasCamadas[`${camada.id}`] = geodadosResult.payload;
                        } catch (error) {
                            console.error("Falha ao buscar dados da camada:", error);
                            return;
                        }
                    }
                    const dadosParaProcessar = this.dadosDasCamadas[`${camada.id}`];
    
                    if (event.target.checked) {
                        /* this.customToast("Carregando Layer: " + camada.nome); */
    
                        await this.carregarCamada(dadosParaProcessar, subtemaNormalizadoSemAcentos, plotarNome)
                    } else {
                        for (const geodado of dadosParaProcessar) {
                            await this.unplot(geodado, `${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}-datasource`);
                            if(subtemaNormalizadoSemAcentos === 'setorescensitarios' || subtemaNormalizadoSemAcentos === 'bairros') {
                                this.divisaoTerritorialAtual = 'municipios';
                            }
                        }
                    }
                } catch (err) {
                    console.error('Erro ao plotar/remover camada:', err);
                    if (this.customAlert) this.customAlert('Erro ao plotar/remover camada.');
                }
            }
        });
    }
    
    async carregarCamada(dadosParaProcessar, subtemaNormalizadoSemAcentos, plotarNome) {
        
        // Verifica se é estabelecimento de ensino e cria legenda se necessário
        if (subtemaNormalizadoSemAcentos.includes('escolas') /* || subtemaNormalizadoSemAcentos.includes('estabelecimentos') */) {
            this.criarLegendaEstabelecimentos();
        }

        // Detecta se são dados de propriedades (sem geometry_type) e cria legendas apropriadas
        if (dadosParaProcessar.length > 0 && !dadosParaProcessar[0].geometry_type) {
            const primeiroItem = dadosParaProcessar[0];
            let properties = primeiroItem.properties;
            
            if (typeof properties === 'string') {
                try {
                    properties = JSON.parse(properties);
                } catch (e) {
                    properties = {};
                }
            }

            // Identifica o tipo de dados e cria legenda apropriada
            if (properties && properties['Valor da renda média']) {
                this.criarLegendaDados('renda', properties);
            } else if (properties && properties['Total de pessoas']) {
                this.criarLegendaDados('populacao', properties);
            }
        }

        // Fecha dados do municipio
        const box = document.getElementById('dados-basico-municipio');
        box.classList.remove('dados-basico-municipio-expanded');
        box.classList.add('dados-basico-municipio-not-expanded');
        
        let allBoundsForGroup = null;
        for (const geodado of dadosParaProcessar) {
            geodado.chavePrincipal = this.cidadeNormalizadoSemAcentos;
            geodado.chaveRestante = subtemaNormalizadoSemAcentos;
                        
            let plottedShape = await this.plot(geodado, true, `${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}-datasource`, `${this.cidadeNormalizadoSemAcentos}-${subtemaNormalizadoSemAcentos}-layer`, plotarNome);
            if (plottedShape) {
                const bounds = getBoundsFromShape(plottedShape);
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
            this.mapsManager._applyMapZoomWithBounds(allBoundsForGroup, document.getElementById('bottomDrawer').classList.contains('show'));                                   
        } else if (dadosParaProcessar.length > 0) {
            const firstGeoInGroup = dadosParaProcessar[0];
            try {
                let geometryCoords = JSON.parse(firstGeoInGroup.geometry);
                let properties;
                if (typeof firstGeoInGroup.properties === 'string') {
                    properties = JSON.parse(firstGeoInGroup.properties);
                } else {
                    properties = firstGeoInGroup.properties || {};
                }
                const utmZone = properties.UTM_ZONE || 23;
                const isSouthern = properties.HEMISPHERE === 'S' || true;
                const sourceDatum = properties.DATUM || 'SIRGAS2000';
                const firstPoint = findFirstCoordinate(geometryCoords);
                if (firstPoint) {
                    const wgs84Center = utmToWgs84(firstPoint[0], firstPoint[1], utmZone, isSouthern, sourceDatum);
                    if (wgs84Center) {
                        this.mapsManager._applyMapZoomWithCenter(wgs84Center, document.getElementById('bottomDrawer').classList.contains('show'));
                    }
                } else {
                    console.warn("Não foi possível encontrar uma coordenada válida no geodado de fallback:", firstGeoInGroup.id);
                }
            } catch (e) {
                console.error("Erro ao centralizar no estudo (fallback):", e);
            }
        }

        // Define a divisão territorial atual
        if(subtemaNormalizadoSemAcentos === 'setorescensitarios') {
            this.divisaoTerritorialAtual = 'setores';
        } else if(subtemaNormalizadoSemAcentos === 'bairros') {
            this.divisaoTerritorialAtual = 'bairros';
        }
        
    } 

    async plotarLimiteMunicipalAoExpandir() {
        try {
            this.telaCarregamento.style.display = "flex";

            if(window.limitesMunicipioPlotado !== null) {

                // Novo: use unplot para remover o limite municipal anterior
                const prevChavePrincipal = window.limitesMunicipioPlotado[0];
                const prevChaveRestante = window.limitesMunicipioPlotado[1];
                const prevId = `limite-municipal-${this.cod_mun}`; // Se o id do shape anterior for diferente, ajuste aqui
                const prevDatasourceId = `${prevChaveRestante}-limites-municipio-datasource`;

                await this.unplot({
                    chavePrincipal: prevChavePrincipal,
                    chaveRestante: prevChaveRestante,
                    id: prevId,
                    geometry_type: 'Polygon'
                }, prevDatasourceId);

                document.querySelector('.fa-layer-group.hidden-mobile-icon').style.color = 'inherit';
                document.querySelector('.layers-header-title').style.color = 'inherit';
                document.querySelector('.accordion-body').innerHTML = '<p style="margin-top: 10px; margin-bottom: 10px; margin-left: 12px;">Nenhuma layer ativa</p>';

                window.limitesMunicipioPlotado = null;

                this.map.setCamera({
                    bounds: atlas.data.BoundingBox.fromEdges(-73.99, -33.75, -34.8, 5.27),
                    padding: 50,
                    type: 'fly',
                    duration: 1000
                });

                this.removerDadosMunicipio();
            }

            if(document.getElementById(`exibir-camada-${this.cidadeNormalizadoSemAcentos}-limitemunicipal`)) {
                const limiteMunicipalCheckbox = document.getElementById(`exibir-camada-${this.cidadeNormalizadoSemAcentos}-limitemunicipal`)
                limiteMunicipalCheckbox.checked = true;
                limiteMunicipalCheckbox.disabled = true;
            }
            this.updateActiveProjectLayersPills();

            window.limitesMunicipioPlotado = [this.id, this.cidadeNormalizadoSemAcentos];

            const geometry = await this.fetchMalhaMunicipio();
            this.telaCarregamento.style.display = "none";

            // Plota a malha e o nome
            const shape = await this.plot({
                chavePrincipal: window.limitesMunicipioPlotado[0],
                chaveRestante: window.limitesMunicipioPlotado[1],
                id: `limite-municipal-${this.cod_mun}`,
                geometry: geometry.coordinates,
                properties: JSON.stringify({ Color: 14, NM_MUN: this.cidade }),
                geometry_type: 'Polygon'
            }, false, `${this.cidadeNormalizadoSemAcentos}-limites-municipio-datasource`, `${this.cidadeNormalizadoSemAcentos}-limites-municipio-layer`, true);

            if (shape) {
                this.divisaoTerritorialAtual = 'municipios';
                const bounds = shape.getBounds();
                
                this.mapsManager._applyMapZoomWithBounds(bounds, document.getElementById('bottomDrawer').classList.contains('show'));
            }
        } catch (e) {
            console.error('Erro ao plotar Limite Municipal ao expandir:', e);
        }
    }

  
    updateActiveProjectLayersPills() {
        const accordionBody = document.querySelector('.accordion-body-layers-ativas');
        if (!accordionBody) return;

        accordionBody.innerHTML = '';

        const activeCheckboxes = document.querySelectorAll('.form-check-input[type="checkbox"]:checked');
        if (activeCheckboxes.length === 0) {
            document.querySelector('.fa-layer-group.hidden-mobile-icon').style.color = 'inherit';
            document.querySelector('.layers-header-title').style.color = 'inherit';
            const noActiveMsg = document.createElement('p');
            noActiveMsg.style.marginTop = '10px';
            noActiveMsg.style.marginBottom = '10px'; 
            noActiveMsg.style.marginLeft = '12px';
            noActiveMsg.textContent = 'Nenhuma layer ativa';
            accordionBody.appendChild(noActiveMsg);
            return;
        } else {
            document.querySelector('.fa-layer-group.hidden-mobile-icon').style.color = 'var(--bs-primary)';
            document.querySelector('.layers-header-title').style.color = 'var(--bs-primary)';
        }

        const pillsContainer = document.createElement('div');
        pillsContainer.id = 'active-project-layers-pills';
        pillsContainer.className = 'd-flex flex-wrap gap-2';
        accordionBody.appendChild(pillsContainer);

        activeCheckboxes.forEach(checkbox => {
            if (checkbox.name === "radioEstiloMapa") return;

            const isLimiteMunicipal = checkbox.id.includes('limitemunicipal');

            let label = '';
            const labelEl = checkbox.parentElement.querySelector('label');
            if (labelEl) label = labelEl.textContent.trim();
            else label = checkbox.value;

            const pill = document.createElement('div');
            pill.className = 'pill-layer d-flex justify-content-between align-items-center';
            pill.style.marginBottom = '5px';
            pill.style.padding = '5px 10px';
            pill.style.width = '100%';

            const pillText = document.createElement('span');
            pillText.textContent = label;

            const btn = document.createElement('button');
            btn.className = 'remove-pill btn btn-sm';
            btn.type = 'button';
            btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';

            if (isLimiteMunicipal) {
                btn.style.borderWidth = '0px';
                btn.disabled = true;
            } else {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    checkbox.checked = false;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    pill.remove()
                };
            }

            pill.appendChild(pillText);
            pill.appendChild(btn);
            pillsContainer.appendChild(pill);
        });
    }

    setupProjectLayerCheckboxPills() {
        document.querySelectorAll('.form-check-input[type="checkbox"]').forEach(checkbox => {
            if (!checkbox.dataset.pillListenerAdded) {
                checkbox.addEventListener('click', this.updateActiveProjectLayersPills);
                checkbox.dataset.pillListenerAdded = 'true';
            }
            
            // Adiciona listener para controle de eventos do município
            if (!checkbox.dataset.municipioListenerAdded) {
                checkbox.dataset.municipioListenerAdded = 'true';
            }
        });
        this.updateActiveProjectLayersPills();
    }

    async getDadosBasicoMunicipio() {
        try{

            const dadosBasicoMunicipio = await this.fetchComAutoRefresh(
                this.endpoint + `/api/hiram-maps/getDadosBasicoMunicipio?CodMun=${this.cod_mun}`,
                { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } }
            );
            return dadosBasicoMunicipio.json();
        } catch (err) {
            console.error("Erro ao buscar dados do básico do município:", err);
        }
    }

    async exibirDadosMunicipio() {
        try {
            const dadosBasicoMunicipio = await this.getDadosBasicoMunicipio();
            const info = dadosBasicoMunicipio?.payload?.[0]?.properties || {};
            const container = document.getElementById('dados-basico-municipio-content');
            if (!container) return;
            let html = formatJsonForDisplay(info);
            container.innerHTML = html;
    
            // Remove a classe para expandir o card
            const box = document.getElementById('dados-basico-municipio');

            box.classList.add('animate-bounce-right');

            // remove a classe após a animação terminar para permitir reutilização
            box.addEventListener('animationend', () => {
                box.classList.remove('animate-bounce-right');
            }, { once: true });

            if (box) { 
                box.classList.remove('dados-basico-municipio-not-expanded'); 
                box.classList.add('dados-basico-municipio-expanded');
                box.classList.add('preenchido')
            }
        } catch (e) {
            console.error('Erro ao exibir dados do município:', e);
        }
    }
    
    removerDadosMunicipio() {
        const container = document.getElementById('dados-basico-municipio-content');
        if (!container) return;
        container.innerHTML = '<p>Nenhum município plotado</p>';

        // Remove a classe para expandir o card
        const box = document.getElementById('dados-basico-municipio');
        if (box) { 
            box.classList.add('dados-basico-municipio-not-expanded'); 
            box.classList.remove('dados-basico-municipio-expanded'); 
            box.classList.remove('preenchido')
        }
    }

    criarLegendaEstabelecimentos() {
        // Verifica se já existe legenda para esta camada
        const legenda = document.getElementById('legenda');
        if (!legenda) {
            return; // Já existe, não cria duplicata
        }
    
        legenda.style.display = 'block';
        
        // Previne que cliques na legenda afetem o mapa
        legenda.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        legenda.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        legenda.addEventListener('mouseup', (e) => {
            e.stopPropagation();
        });
        
        // Adiciona evento de toggle
        const toggleBtn = legenda.querySelectorAll('.toggle-legenda-btn');
        const toggleBtnOpen = legenda.querySelector('#toggle-legenda-btn-open');
        const toggleBtnClose = legenda.querySelector('#toggle-legenda-btn-close');
        const legendaContent = legenda.querySelector('#legenda-content');
        
        toggleBtn.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                const isMinimized = legenda.classList.contains('minimized');
                
                if (isMinimized) {
                    // Expandir
                    legenda.classList.remove('minimized');
                    legendaContent.style.display = 'block';
                    legenda.style.maxWidth = '250px';
                    legenda.style.padding = '15px';
                    toggleBtnClose.style.display = 'block';
                    toggleBtnOpen.style.display = 'none';
                } else {
                    // Minimizar
                    legenda.classList.add('minimized');
                    legendaContent.style.display = 'none';
                    legenda.style.maxWidth = '150px';
                    legenda.style.padding = '10px';
                    toggleBtnClose.style.display = 'none';
                    toggleBtnOpen.style.display = 'block';
                }
            });
        })
        
    }

    removerLegendaEstabelecimentos() {
        const legendaId = 'legenda';
        const legenda = document.getElementById(legendaId);
        if (legenda) {
            legenda.style.display = 'none';
        }
    }
} 