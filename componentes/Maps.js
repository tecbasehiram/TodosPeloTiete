class MapsManager {

    /**
     * @param {string} subscriptionKey - Chave de API do Azure Maps.
     */
    constructor(subscriptionKey, canvas) {
        this.subscriptionKey = subscriptionKey;
        this.estiloDoUsuario = localStorage.getItem("estiloDoMapa");
        this.map = null;
        this.dicionarioDeShapes = {};
        this.canvas = canvas;

        this.telaCarregamento = document.getElementById('div-carregando-fundo');
    }

    /**
     * Inicializa o mapa.
     */
    async _init() {
        this.telaCarregamento.style.display = 'flex';

        if(!this.estiloDoUsuario) {
            localStorage.setItem("estiloDoMapa", "satellite");
            this.estiloDoUsuario = "satellite";
        }

        this.map = new atlas.Map('myMap', {
            center: [(-73.99 + -34.8) / 2, (-33.75 + 5.27) / 2], 
            zoom: 3.9,
            style: `${this.estiloDoUsuario}`, 
            language: 'pt-br',
            view: 'Auto',
            authOptions: {
                authType: 'subscriptionKey',
                subscriptionKey: this.subscriptionKey
            }
        });

        this.map.events.add('ready', () => {
            const mapaCarregado = new Event('mapaCarregado');
            window.dispatchEvent(mapaCarregado);
            this.telaCarregamento.style.display = 'none';
        });

        return this.map;
    }

    _handleMapStyle(map) {
        const estiloSalvo = localStorage.getItem("estiloDoMapa");
    
        document.querySelectorAll('input[name="radioEstiloMapa"]').forEach((radio) => {
            if (radio.value === estiloSalvo) {
                radio.disabled = true;
                radio.checked = true;
            }
    
            radio.addEventListener('change', function () {
                if (this.checked) {
    
                    const estiloSelecionado = this.value;
    
                    console.log("Estilo selecionado: ", map)
                    map.setStyle({ style: estiloSelecionado }); 
    
                    localStorage.setItem("estiloDoMapa", estiloSelecionado);
    
                    document.querySelectorAll('input[name="radioEstiloMapa"]').forEach(radio => {
                        radio.disabled = (radio.value === estiloSelecionado);
                        radio.checked = (radio.value === estiloSelecionado);
                    });
                }
            });
        });
    } 

    _applyMapZoomWithBounds(bounds, isOffCanvasOpen) {
        const cameraOptions = {
            bounds: bounds,
            padding: {
                top: window.innerWidth > 1200 ? 200 : 110,
                bottom: isOffCanvasOpen && window.innerWidth < 1200 ? 450 : window.innerWidth > 1200 ? 200 : 110,
                left: isOffCanvasOpen && window.innerWidth >= 1200 ? 550 : window.innerWidth > 1200 ? 250 : 110,
                right: window.innerWidth > 1200 ? 200 : 110
            },
            maxZoom: 20,
            type: 'fly',
            duration: 1000
        };
    
        this.map.setCamera(cameraOptions);
    }
    
   _applyMapZoomWithCenter(center, isOffCanvasOpen) {
        const deslocamentoLng = isOffCanvasOpen ? 0.003 : 0; 

        const novoCenter = [
            ((window.innerWidth >= 1200 && isOffCanvasOpen) ? center[0] - deslocamentoLng : center[0]), 
            ((window.innerWidth < 1200 && isOffCanvasOpen) ? center[1] - deslocamentoLng : center[1] + 0.001)
        ];

        this.map.setCamera({
            center: novoCenter,
            zoom: 14,
            type: 'fly',
            duration: 1000
        });
    }
}

export default MapsManager;